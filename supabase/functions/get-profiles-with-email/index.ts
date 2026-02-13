import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify user has advisor/admin role
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid user token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: roleData, error: roleError } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (roleError || !roleData || roleData.length === 0) {
      return new Response(
        JSON.stringify({ error: "User role not found" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const roles = roleData.map(r => r.role);
    if (!roles.includes("advisor") && !roles.includes("admin")) {
      return new Response(
        JSON.stringify({ error: "Insufficient permissions" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role to fetch all data
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch profiles, conversations, and auth users in parallel
    const [profilesResult, conversationsResult, usersResult] = await Promise.all([
      adminClient.from("profiles").select("*").order("created_at", { ascending: false }),
      adminClient.from("conversations").select("id, user_id, updated_at"),
      adminClient.auth.admin.listUsers({ perPage: 1000 }),
    ]);

    if (profilesResult.error) throw profilesResult.error;
    if (conversationsResult.error) throw conversationsResult.error;
    if (usersResult.error) throw usersResult.error;

    const profiles = profilesResult.data || [];
    const conversations = conversationsResult.data || [];
    const users = usersResult.data?.users || [];

    // Get the latest message date per conversation
    const conversationIds = conversations.map(c => c.id);
    let lastMessageMap: Record<string, string> = {};
    
    if (conversationIds.length > 0) {
      // Get the most recent message per user by joining through conversations
      const { data: messagesData } = await adminClient
        .from("messages")
        .select("conversation_id, created_at")
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: false });

      if (messagesData) {
        // Build a map: user_id -> latest message date
        const convToUser: Record<string, string> = {};
        conversations.forEach(c => { convToUser[c.id] = c.user_id; });

        for (const msg of messagesData) {
          const userId = convToUser[msg.conversation_id];
          if (userId && !lastMessageMap[userId]) {
            lastMessageMap[userId] = msg.created_at;
          }
        }
      }
    }

    // Build conversation count per user
    const convCountMap: Record<string, number> = {};
    conversations.forEach(c => {
      convCountMap[c.user_id] = (convCountMap[c.user_id] || 0) + 1;
    });

    // Email map
    const emailMap: Record<string, string> = {};
    users.forEach(u => {
      emailMap[u.id] = u.email || "";
    });

    // Combine everything
    const profilesWithEmail = profiles.map(profile => ({
      ...profile,
      email: emailMap[profile.user_id] || null,
      conversation_count: convCountMap[profile.user_id] || 0,
      last_message_at: lastMessageMap[profile.user_id] || null,
    }));

    return new Response(
      JSON.stringify({ profiles: profilesWithEmail }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error fetching profiles with emails:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
