import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Send, ArrowLeft, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useChatConversation } from "@/hooks/useChatConversation";
import { ChatActions } from "@/components/chat/ChatActions";
import { runPhaseDetector, ConversationTurn, KnownSlots, UiPhaseCode } from "@/utils/phaseDetectorEngine";

interface Profile {
  current_phase: UiPhaseCode | null;
  preferred_sector: string | null;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/doorai-chat`;

function sectorToSchoolType(sector: string | null | undefined): string | undefined {
  if (!sector) return undefined;
  const s = sector.toLowerCase();
  if (s.includes("po")) return "PO";
  if (s.includes("vo")) return "VO";
  if (s.includes("mbo")) return "MBO";
  return undefined;
}

export default function Chat() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [knownSlots, setKnownSlots] = useState<KnownSlots>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    setMessages,
    latestActions,
    setLatestActions,
    isLoading,
    setIsLoading,
    loadConversation,
    ensureConversation,
    saveMessage,
    resetConversation,
  } = useChatConversation(user?.id, profile);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      const fetchProfile = async () => {
        try {
          const { data } = await supabase
            .from("profiles")
            .select("current_phase, preferred_sector")
            .eq("user_id", user.id)
            .single();
          if (data) {
            setProfile(data);
            // Seed known slots from profile
            const schoolType = sectorToSchoolType(data.preferred_sector);
            if (schoolType) setKnownSlots((prev) => ({ ...prev, school_type: schoolType }));
          }
        } catch (error) {
          console.error("Error fetching profile:", error);
        } finally {
          setProfileLoaded(true);
        }
      };
      fetchProfile();
    }
  }, [user]);

  useEffect(() => {
    if (profileLoaded && user) {
      loadConversation();
    }
  }, [profileLoaded, user, loadConversation]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const maybePersistProfile = useCallback(
    async (detector: ReturnType<typeof runPhaseDetector>) => {
      if (!user) return;

      const updates: Record<string, unknown> = {};

      // Update current_phase only when confidence is reasonable
      if (profile?.current_phase && detector.phase_current_ui !== profile.current_phase && detector.phase_confidence >= 0.75) {
        updates.current_phase = detector.phase_current_ui;
      }

      // Update preferred sector when we have a concrete school_type
      const st = detector.known_slots.school_type;
      if (st && typeof st === "string") {
        const sector = st === "PO" ? "po" : st === "VO" ? "vo" : st === "MBO" ? "mbo" : null;
        if (sector && sector !== profile?.preferred_sector) {
          updates.preferred_sector = sector;
        }
      }

      if (Object.keys(updates).length === 0) return;

      try {
        const { data, error } = await supabase
          .from("profiles")
          .update(updates)
          .eq("user_id", user.id)
          .select("current_phase, preferred_sector")
          .single();

        if (!error && data) {
          setProfile(data);
        }
      } catch (e) {
        console.warn("Profile update skipped:", e);
      }
    },
    [user, profile],
  );

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage = { role: "user" as const, content: text };
    const outgoingMessages = [...messages, userMessage];

    setMessages(outgoingMessages);
    setInput("");
    setIsLoading(true);
    setLatestActions([]);

    let assistantContent = "";

    try {
      const convId = await ensureConversation();
      if (convId) {
        await saveMessage(convId, "user", text);
      }

      // Phase Detector: alleen voor ingelogde chat
      const conversationTurns: ConversationTurn[] = outgoingMessages
        .slice(-30)
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role, text: m.content }));

      const detector = runPhaseDetector({
        conversation: conversationTurns,
        known_slots: knownSlots,
        current_phase_ui: profile?.current_phase || "interesseren",
      });

      setKnownSlots(detector.known_slots);

      // Optioneel profiel bijwerken (alleen bij voldoende confidence)
      await maybePersistProfile(detector);

      // Phase transition detection
      const phaseTransition = detector.phase_confidence >= 0.75 && detector.phase_current_ui !== (profile?.current_phase || "interesseren")
        ? { from: profile?.current_phase || "interesseren", to: detector.phase_current_ui }
        : undefined;

      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: outgoingMessages.map((m) => ({ role: m.role, content: m.content })),
          mode: "authenticated",
          userPhase: detector.phase_current_ui,
          userSector: profile?.preferred_sector,
          detector,
          phase_transition: phaseTransition,
        }),
      });

      if (!response.ok || !response.body) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to get response");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") continue;

          try {
            const parsed = JSON.parse(jsonStr);

            // Server-side actions event
            if (parsed.actions && Array.isArray(parsed.actions)) {
              setLatestActions(parsed.actions);
              continue;
            }

            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: assistantContent,
                };
                return updated;
              });
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      if (convId) {
        await saveMessage(convId, "assistant", assistantContent);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, er ging iets mis. Probeer het later opnieuw." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleActionClick = (value: string) => {
    setLatestActions([]);
    sendMessage(value);
  };

  const handleClearConversation = useCallback(() => {
    resetConversation();
    setKnownSlots({});
    const phase = profile?.current_phase || "interesseren";
    const info: Record<string, string> = {
      interesseren: "Je verkent of het onderwijs iets voor je is.",
      orienteren: "Je bekijkt welke richting het beste bij je past.",
      beslissen: "Je staat voor een keuze en wilt het helder krijgen.",
      matchen: "Je zoekt een concrete school of opleiding.",
      voorbereiden: "Je maakt je klaar voor de start.",
    };
    setMessages([{
      role: "assistant",
      content: `Welkom terug! Fijn dat je er bent 👋\n\nJe zit nu in de **${phase}**-fase. ${info[phase] || info.interesseren}\n\nWaar kan ik je vandaag mee helpen?`,
    }]);
  }, [profile, resetConversation, setMessages]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Laden...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col">
        <div className="bg-primary py-4 border-b border-primary/20">
          <div className="container flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground hover:bg-white/20"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-lg font-semibold text-primary-foreground">DOORai</h1>
              <p className="text-sm text-primary-foreground/80">Je oriëntatie-assistent</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="container py-6 space-y-4 max-w-3xl mx-auto">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-3 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-2 prose-p:leading-relaxed prose-headings:mt-3 prose-headings:mb-1 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p>{message.content}</p>
                  )}
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="border-t border-border bg-background">
          <ChatActions actions={latestActions} onActionClick={handleActionClick} disabled={isLoading} />
          <div className="container max-w-3xl mx-auto py-4">
            <form onSubmit={handleSubmit} className="flex gap-3 items-center">
              {messages.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={handleClearConversation}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Stel je vraag..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button type="submit" disabled={isLoading || !input.trim()}>
                <Send className="h-4 w-4 mr-2" />
                Verstuur
              </Button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
