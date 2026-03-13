import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  role: "user" | "assistant" | "advisor";
  content: string;
}

interface Profile {
  current_phase: string;
  preferred_sector: string | null;
}

const PHASE_INFO: Record<string, { title: string; context: string }> = {
  interesseren: { title: "interesseren", context: "Je verkent of het onderwijs iets voor je is." },
  orienteren: { title: "oriënteren", context: "Je bekijkt welke richting het beste bij je past." },
  beslissen: { title: "beslissen", context: "Je staat voor een keuze en wilt het helder krijgen." },
  matchen: { title: "matchen", context: "Je zoekt een concrete school of opleiding." },
  voorbereiden: { title: "voorbereiden", context: "Je maakt je klaar voor de start." },
};

// Welcome actions removed — TopicMenu now handles topic suggestions.
// Only keep minimal phase-contextual hints if needed.
const PHASE_WELCOME_ACTIONS: Record<string, Array<{ label: string; value: string }>> = {
  interesseren: [],
  orienteren: [],
  beslissen: [],
  matchen: [],
  voorbereiden: [],
};

export function parseActions(content: string): {
  cleanContent: string;
  actions: Array<{ label: string; value: string }>;
} {
  const match = content.match(/<!--ACTIONS:(\[.*?\])-->/s);
  if (!match) return { cleanContent: content, actions: [] };

  try {
    const actions = JSON.parse(match[1]);
    const cleanContent = content.replace(/<!--ACTIONS:\[.*?\]-->/s, "").trimEnd();
    return { cleanContent, actions };
  } catch {
    return { cleanContent: content, actions: [] };
  }
}

export function useChatConversation(userId: string | undefined, profile: Profile | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [latestActions, setLatestActions] = useState<Array<{ label: string; value: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Realtime subscription for incoming messages (punt 3)
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as { id: string; role: string; content: string; created_at: string };
          // Only add advisor messages (user/assistant are added locally)
          if (newMsg.role === 'advisor') {
            setMessages(prev => [...prev, { role: 'advisor', content: newMsg.content }]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const getWelcomeMessage = useCallback((phase: string): { content: string; actions: Array<{ label: string; value: string }> } => {
    const info = PHASE_INFO[phase] || PHASE_INFO.interesseren;
    const actions = PHASE_WELCOME_ACTIONS[phase] || PHASE_WELCOME_ACTIONS.interesseren;
    return {
      content: `Welkom terug, goed dat je er bent.\n\nJe zit in de **${info.title}**-fase. ${info.context}\n\nKies een suggestie hieronder of typ je vraag.`,
      actions,
    };
  }, []);

  const loadConversation = useCallback(async () => {
    if (!userId || initialized) return;
    setInitialized(true);

    try {
      // Try to load latest conversation
      const { data: convs } = await supabase
        .from("conversations")
        .select("id")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (convs && convs.length > 0) {
        const convId = convs[0].id;
        setConversationId(convId);

        const { data: msgs } = await supabase
          .from("messages")
          .select("role, content")
          .eq("conversation_id", convId)
          .order("created_at", { ascending: true });

        if (msgs && msgs.length > 0) {
          const loaded = msgs.map((m) => ({
            role: m.role as "user" | "assistant" | "advisor",
            // Strip any legacy <!--ACTIONS:...--> from stored messages
            content: m.content
              .replace(/<!--ACTIONS:\[.*?\]-->/s, "")
              .replace(/<!--ACTIONS:[\s\S]*$/, "")
              .trimEnd(),
          }));
          setMessages(loaded);
          return;
        }
      }
    } catch (error) {
      console.error("Error loading conversation:", error);
    }

    // No existing conversation — show welcome
    const phase = profile?.current_phase || "interesseren";
    const welcome = getWelcomeMessage(phase);
    setMessages([{ role: "assistant", content: welcome.content }]);
    setLatestActions(welcome.actions);
  }, [userId, profile, initialized, getWelcomeMessage]);

  const ensureConversation = useCallback(async (): Promise<string | null> => {
    if (conversationId) return conversationId;
    if (!userId) return null;

    const { data, error } = await supabase
      .from("conversations")
      .insert({ user_id: userId, title: "DOORai gesprek" })
      .select("id")
      .single();

    if (error || !data) {
      console.error("Error creating conversation:", error);
      return null;
    }

    setConversationId(data.id);
    return data.id;
  }, [conversationId, userId]);

  const saveMessage = useCallback(async (convId: string, role: string, content: string) => {
    await supabase.from("messages").insert({
      conversation_id: convId,
      role,
      content,
    });
    // Touch conversation updated_at
    await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", convId);
  }, []);

  const resetConversation = useCallback(async () => {
    if (conversationId) {
      try {
        await supabase.from("messages").delete().eq("conversation_id", conversationId);
        await supabase.from("conversations").delete().eq("id", conversationId);
      } catch (e) {
        console.error("Error deleting conversation:", e);
      }
    }
    setConversationId(null);
    setMessages([]);
    setLatestActions([]);
    setInitialized(true);
  }, [conversationId]);

  return {
    messages,
    setMessages,
    latestActions,
    setLatestActions,
    isLoading,
    setIsLoading,
    loadConversation,
    ensureConversation,
    saveMessage,
    parseActions,
    resetConversation,
  };
}
