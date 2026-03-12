import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Send, ArrowLeft, Trash2 } from "lucide-react";
import { useChatConversation } from "@/hooks/useChatConversation";
import { ChatSuggestions } from "@/components/chat/ChatSuggestions";
import { runPhaseDetector, ConversationTurn, KnownSlots, UiPhaseCode } from "@/utils/phaseDetectorEngine";
import { CollapsibleAnswer } from "@/components/chat/CollapsibleAnswer";
import { ResponseActions } from "@/components/chat/ResponseActions";
import { IntakeSheet } from "@/components/chat/IntakeSheet";
import { parseStructuredMeta } from "@/utils/responsePipeline";
import type { StructuredResponse, IntakeQuestion, FollowUpAction } from "@/utils/responsePipeline";

interface Profile {
  current_phase: UiPhaseCode | null;
  preferred_sector: string | null;
  first_name?: string | null;
  bio?: string | null;
  test_completed?: boolean | null;
  test_results?: unknown;
  known_slots?: unknown;
}

interface ChatMessageExt {
  role: string;
  content: string;
  structured?: StructuredResponse | null;
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
  const [latestLinks, setLatestLinks] = useState<Array<{ label: string; href: string }>>([]);
  const [pendingIntake, setPendingIntake] = useState<IntakeQuestion[] | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

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
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      const fetchProfile = async () => {
        try {
          const { data } = await supabase
            .from("profiles")
            .select("current_phase, preferred_sector, first_name, bio, test_completed, test_results, known_slots")
            .eq("user_id", user.id)
            .single();
          if (data) {
            setProfile(data);
            // Initialize knownSlots from persisted DB data + sector fallback
            const dbSlots: Record<string, string> = {};
            if (data.known_slots && typeof data.known_slots === "object" && !Array.isArray(data.known_slots)) {
              for (const [k, v] of Object.entries(data.known_slots as Record<string, unknown>)) {
                if (typeof v === "string") dbSlots[k] = v;
              }
            }
            const schoolType = sectorToSchoolType(data.preferred_sector);
            setKnownSlots(prev => ({ ...(schoolType ? { school_type: schoolType } : {}), ...dbSlots, ...prev }));
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
    if (profileLoaded && user) loadConversation();
  }, [profileLoaded, user, loadConversation]);

  const scrollToBottom = useCallback(() => {
    const el = chatContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const maybePersistProfile = useCallback(
    async (detector: ReturnType<typeof runPhaseDetector>, slotsToSave?: KnownSlots) => {
      if (!user) return;
      const updates: Record<string, unknown> = {};
      if (profile?.current_phase && detector.phase_current_ui !== profile.current_phase && detector.phase_confidence >= 0.60) {
        updates.current_phase = detector.phase_current_ui;
      }
      const st = detector.known_slots.school_type;
      if (st && typeof st === "string") {
        const sector = st === "PO" ? "po" : st === "VO" ? "vo" : st === "MBO" ? "mbo" : null;
        if (sector && sector !== profile?.preferred_sector) updates.preferred_sector = sector;
      }
      // Persist full known_slots
      const finalSlots = slotsToSave || detector.known_slots;
      if (Object.keys(finalSlots).length > 0) {
        updates.known_slots = finalSlots;
      }
      if (Object.keys(updates).length === 0) return;
      try {
        const { data, error } = await supabase
          .from("profiles").update(updates).eq("user_id", user.id)
          .select("current_phase, preferred_sector, first_name, bio, test_completed, test_results, known_slots").single();
        if (!error && data) setProfile(data);
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
    setLatestLinks([]);
    setPendingIntake(null);

    let assistantContent = "";

    try {
      const convId = await ensureConversation();
      if (convId) await saveMessage(convId, "user", text);

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
      await maybePersistProfile(detector);

      // No more client-side needsClarification pre-flight — backend decides via intake_needed

      const phaseTransition = detector.phase_confidence >= 0.60 && detector.phase_current_ui !== (profile?.current_phase || "interesseren")
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
          profileMeta: {
            first_name: profile?.first_name,
            bio: profile?.bio,
            test_results: profile?.test_completed ? profile?.test_results : null,
          },
        }),
      });

      if (!response.ok || !response.body) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to get response");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let currentEventType = "";

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

          if (line.startsWith("event: ")) {
            currentEventType = line.slice(7).trim();
            continue;
          }

          if (line.startsWith(":") || line.trim() === "") {
            if (line.trim() === "") currentEventType = "";
            continue;
          }
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") continue;

          try {
            const parsed = JSON.parse(jsonStr);

            if (currentEventType === "ui") {
              if (parsed.actions && Array.isArray(parsed.actions)) {
                setLatestActions(parsed.actions.slice(0, 2));
              }
              if (parsed.links && Array.isArray(parsed.links)) {
                setLatestLinks(parsed.links.slice(0, 6));
              }
              const structured = parseStructuredMeta(parsed);
              if (structured) {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last?.role === "assistant") {
                    (last as ChatMessageExt).structured = structured;
                  }
                  return [...updated];
                });
              }
              currentEventType = "";
              continue;
            }

            // Legacy fallback
            if (parsed.actions && Array.isArray(parsed.actions)) {
              setLatestActions(parsed.actions.slice(0, 2));
              if (parsed.links) setLatestLinks((parsed.links as Array<{ label: string; href: string }>).slice(0, 6));
              continue;
            }

            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: assistantContent };
                return updated;
              });
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      if (convId) await saveMessage(convId, "assistant", assistantContent);
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
    setLatestLinks([]);
    sendMessage(value);
  };

  const handleIntakeSubmit = (answers: Record<string, string>) => {
    setPendingIntake(null);
    const summary = Object.entries(answers).map(([, v]) => v).join(", ");
    sendMessage(`Mijn situatie: ${summary}`);
  };

  const handleClearConversation = useCallback(async () => {
    await resetConversation();
    setKnownSlots({});
    setPendingIntake(null);
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
      content: `Welkom terug, goed dat je er bent.\n\nJe zit in de **${phase}**-fase. ${info[phase] || info.interesseren}\n\nKies een suggestie hieronder of typ je vraag.`,
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
      <main className="flex-1 flex flex-col items-center py-6 px-4">
        <div className="w-full max-w-3xl flex flex-col rounded-3xl border bg-card shadow-door overflow-hidden" style={{ height: "calc(100vh - 120px)" }}>
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <h1 className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">DOORai</h1>
              </div>
            </div>
            {messages.length > 1 && (
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={handleClearConversation}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Messages */}
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : message.role === "advisor"
                      ? "bg-accent/15 border border-accent/30 text-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {message.role === "advisor" && (
                    <span className="text-[10px] font-semibold text-accent-foreground uppercase tracking-wide mb-1 block">Adviseur</span>
                  )}
                  {message.role === "user" ? (
                    <p>{message.content}</p>
                  ) : (
                    <CollapsibleAnswer
                      content={message.content}
                      structured={(message as ChatMessageExt).structured}
                    />
                  )}
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                  </div>
                </div>
              </div>
            )}
            <div />
          </div>

          {/* Intake */}
          {pendingIntake && (
            <div className="px-5 pb-2">
              <IntakeSheet
                questions={pendingIntake}
                onSubmit={handleIntakeSubmit}
                onDismiss={() => setPendingIntake(null)}
              />
            </div>
          )}

          {/* Actions */}
          {!pendingIntake && latestActions.length > 0 && (
            <div className="px-5 pb-2">
              <ResponseActions
                primaryFollowup={latestActions[0] ? { label: latestActions[0].label, value: latestActions[0].value } : null}
                secondaryAction={latestActions[1] ? { label: latestActions[1].label, value: latestActions[1].value } : null}
                onAskClick={handleActionClick}
                disabled={isLoading}
              />
            </div>
          )}

          {/* Input */}
          <div className="px-5 pb-4 pt-2 border-t border-border">
            <form onSubmit={handleSubmit} className="flex gap-2 items-center">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Stel je vraag..."
                disabled={isLoading || !!pendingIntake}
                className="flex-1 h-9 text-sm rounded-xl"
              />
              <Button type="submit" size="sm" disabled={isLoading || !input.trim() || !!pendingIntake} className="h-9 w-9 p-0 rounded-xl">
                <Send className="h-3.5 w-3.5" />
              </Button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
