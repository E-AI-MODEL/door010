import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  role: "user" | "assistant";
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

const PHASE_WELCOME_ACTIONS: Record<string, Array<{ label: string; value: string }>> = {
  interesseren: [
    { label: "Lesgeven", value: "Ik ben geïnteresseerd in lesgeven" },
    { label: "Begeleiding", value: "Ik ben geïnteresseerd in begeleiding" },
    { label: "Vakexpertise", value: "Ik ben geïnteresseerd in vakexpertise" },
  ],
  orienteren: [
    { label: "PO (basisonderwijs)", value: "Ik wil me oriënteren op PO" },
    { label: "VO (voortgezet)", value: "Ik wil me oriënteren op VO" },
    { label: "MBO (beroepsonderwijs)", value: "Ik wil me oriënteren op MBO" },
  ],
  beslissen: [
    { label: "Kosten bekijken", value: "Ik wil meer weten over de kosten" },
    { label: "Vacatures", value: "Ik wil vacatures bekijken" },
    { label: "Gesprek plannen", value: "Ik wil een gesprek plannen" },
  ],
  matchen: [
    { label: "Scholen zoeken", value: "Ik wil scholen zoeken in mijn regio" },
    { label: "Vacatures", value: "Ik wil vacatures bekijken" },
  ],
  voorbereiden: [
    { label: "Checklist bekijken", value: "Wat moet ik nog regelen?" },
    { label: "Gesprek plannen", value: "Ik wil een gesprek plannen" },
  ],
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

  const getWelcomeMessage = useCallback((phase: string): { content: string; actions: Array<{ label: string; value: string }> } => {
    const info = PHASE_INFO[phase] || PHASE_INFO.interesseren;
    const actions = PHASE_WELCOME_ACTIONS[phase] || PHASE_WELCOME_ACTIONS.interesseren;
    return {
      content: `Welkom terug! Fijn dat je er bent 👋\n\nJe zit nu in de **${info.title}**-fase. ${info.context}\n\nWaar kan ik je vandaag mee helpen?`,
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
            role: m.role as "user" | "assistant",
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
  };
}
