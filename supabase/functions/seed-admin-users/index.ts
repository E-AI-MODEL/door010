import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Use service role to create users
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const adminUsers = [
      { email: "admin@doorai.nl", password: "admin010", role: "admin" as const, firstName: "Admin", lastName: "DOOR" },
      { email: "backoffice@doorai.nl", password: "admin010", role: "advisor" as const, firstName: "Backoffice", lastName: "DOOR" },
      { email: "test@doorai.nl", password: "admin010", role: "candidate" as const, firstName: "Test", lastName: "DOOR" },
      { email: "test1@doorai.nl", password: "admin010", role: "candidate" as const, firstName: "Test1", lastName: "DOOR" },
    ];

    const results = [];

    for (const user of adminUsers) {
      // Check if user exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const exists = existingUsers?.users?.find(u => u.email === user.email);

      if (exists) {
        results.push({ email: user.email, status: "already exists", userId: exists.id });
        
        // Ensure role exists
        const { data: existingRole } = await supabase
          .from("user_roles")
          .select("*")
          .eq("user_id", exists.id)
          .eq("role", user.role)
          .single();
          
        if (!existingRole) {
          await supabase.from("user_roles").insert({
            user_id: exists.id,
            role: user.role,
          });
        }
        continue;
      }

      // Create user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
      });

      if (authError) {
        results.push({ email: user.email, status: "error", error: authError.message });
        continue;
      }

      // Create profile
      await supabase.from("profiles").insert({
        user_id: authData.user.id,
        first_name: user.firstName,
        last_name: user.lastName,
        current_phase: user.role === "candidate" ? "interesseren" : "voorbereiden",
      });

      // Assign role
      await supabase.from("user_roles").insert({
        user_id: authData.user.id,
        role: user.role,
      });

      results.push({ email: user.email, status: "created", userId: authData.user.id, role: user.role });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error seeding admin users:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
