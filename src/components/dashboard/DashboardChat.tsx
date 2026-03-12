import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Send, ArrowRight, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useChatConversation } from "@/hooks/useChatConversation";
import { normalizeMarkdown } from "@/utils/normalizeMarkdown";
import { supabase } from "@/integrations/supabase/client";
import { runPhaseDetector, ConversationTurn, KnownSlots, UiPhaseCode } from "@/utils/phaseDetectorEngine";
import { CollapsibleAnswer } from "@/components/chat/CollapsibleAnswer";
import { ResponseActions } from "@/components/chat/ResponseActions";
import { IntakeSheet } from "@/components/chat/IntakeSheet";
import { parseStructuredMeta } from "@/utils/responsePipeline";
import type { StructuredResponse, IntakeQuestion, FollowUpAction } from "@/utils/responsePipeline";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/doorai-chat`;

function sectorToSchoolType(sector: string | null | undefined): string | undefined {
  if (!sector) return undefined;
  const s = sector.toLowerCase();
  if (s.includes("po")) return "PO";
  if (s.includes("vo")) return "VO";
  if (s.includes("mbo")) return "MBO";
  return undefined;
}

interface ProfileMeta {
  first_name?: string | null;
  bio?: string | null;
  test_completed?: boolean | null;
  test_results?: unknown;
}

interface DashboardChatProps {
  userId: string;
  currentPhase: UiPhaseCode;
  preferredSector: string | null;
  knownSlotsFromDb?: Record<string, string>;
  profileMeta?: ProfileMeta;
}

interface ChatMessageExt {
  role: "user" | "assistant" | "advisor";
  content: string;
  structured?: StructuredResponse | null;
}

export function DashboardChat({ userId, currentPhase, preferredSector, knownSlotsFromDb, profileMeta }: DashboardChatProps) {
  const [input, setInput] = useState("");
  const [latestLinks, setLatestLinks] = useState<Array<{ label: string; href: string }>>([]);
  const [knownSlots, setKnownSlots] = useState<KnownSlots>(() => {
    // Initialize from DB persisted slots, falling back to sector mapping
    const fromDb = knownSlotsFromDb || {};
    const st = sectorToSchoolType(preferredSector);
    return { ...(st ? { school_type: st } : {}), ...fromDb };
  });
  const [pendingIntake, setPendingIntake] = useState<IntakeQuestion[] | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const profile = { current_phase: currentPhase, preferred_sector: preferredSector };

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
  } = useChatConversation(userId, profile);

  const handleClearConversation = useCallback(async () => {
    await resetConversation();
    setKnownSlots({});
    setPendingIntake(null);
    const phase = currentPhase || "interesseren";
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
  }, [currentPhase, resetConversation, setMessages]);

  const [profileLoaded, setProfileLoaded] = useState(false);

  useEffect(() => {
    setProfileLoaded(true);
  }, []);

  useEffect(() => {
    if (profileLoaded) {
      loadConversation();
    }
  }, [profileLoaded, loadConversation]);

  useEffect(() => {
    const el = chatContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const maybePersistProfile = useCallback(
    async (detector: ReturnType<typeof runPhaseDetector>, slotsToSave?: KnownSlots) => {
      const updates: Record<string, unknown> = {};
      const oldPhase = currentPhase;

      if (detector.phase_current_ui !== oldPhase && detector.phase_confidence >= 0.60) {
        updates.current_phase = detector.phase_current_ui;
      }

      const st = detector.known_slots.school_type;
      if (st && typeof st === "string") {
        const sector = st === "PO" ? "po" : st === "VO" ? "vo" : st === "MBO" ? "mbo" : null;
        if (sector && sector !== preferredSector) {
          updates.preferred_sector = sector;
        }
      }

      // Persist full known_slots to DB
      const finalSlots = slotsToSave || detector.known_slots;
      if (Object.keys(finalSlots).length > 0) {
        updates.known_slots = finalSlots;
      }

      if (Object.keys(updates).length === 0) return;

      try {
        await supabase.from("profiles").update(updates).eq("user_id", userId);
      } catch (e) {
        console.warn("Profile update skipped:", e);
      }
    },
    [userId, currentPhase, preferredSector],
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
        current_phase_ui: currentPhase,
      });

      setKnownSlots(detector.known_slots);
      await maybePersistProfile(detector);

      // Check if intake is needed
      const missingSlots = detector.missing_slots || [];
      if (needsClarification(text, {
        missingSector: missingSlots.includes("school_type"),
        missingLevel: missingSlots.includes("admission_requirements"),
        backendMode: "direct",
      })) {
        const intakeQs = buildIntakeQuestions({
          missingSector: missingSlots.includes("school_type"),
          missingLevel: missingSlots.includes("admission_requirements"),
        });
        if (intakeQs.length > 0) {
          setPendingIntake(intakeQs);
          setMessages(prev => [
            ...prev,
            { role: "assistant", content: "Ik wil je graag goed helpen. Kun je even het volgende aangeven?" },
          ]);
          setIsLoading(false);
          return;
        }
      }

      const phaseTransition = detector.phase_confidence >= 0.60 && detector.phase_current_ui !== currentPhase
        ? { from: currentPhase, to: detector.phase_current_ui }
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
          userSector: preferredSector,
          detector,
          phase_transition: phaseTransition,
          profileMeta: profileMeta ? {
            first_name: profileMeta.first_name,
            bio: profileMeta.bio,
            test_completed: profileMeta.test_completed,
            test_results: profileMeta.test_results,
          } : undefined,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to get response");
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

          // Track SSE event type
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

            // Handle `event: ui` — structured UI payload
            if (currentEventType === "ui") {
              if (parsed.actions && Array.isArray(parsed.actions)) {
                setLatestActions(parsed.actions.slice(0, 2));
              }
              if (parsed.links && Array.isArray(parsed.links)) {
                setLatestLinks(parsed.links.slice(0, 6));
              }
              // Check for structured meta
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
              if (parsed.links && Array.isArray(parsed.links)) {
                setLatestLinks(parsed.links.slice(0, 6));
              }
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

  const handleIntakeSubmit = (answers: Record<string, string>) => {
    setPendingIntake(null);
    const summary = Object.entries(answers).map(([, v]) => v).join(", ");
    sendMessage(`Mijn situatie: ${summary}`);
  };

  const visibleMessages = messages.slice(-6);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="rounded-3xl border bg-card shadow-door flex flex-col h-full min-h-[480px]"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">DOORai</h2>
        </div>
        <Link to="/chat" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
          Volledig gesprek
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Messages */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3" aria-live="polite">
        {visibleMessages.map((message, index) => (
          <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
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
                  compact
                />
              )}
            </div>
          </div>
        ))}
        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl px-3.5 py-2.5">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
              </div>
            </div>
          </div>
        )}
        <div />
      </div>

      {/* Intake sheet */}
      {pendingIntake && (
        <div className="px-4 pb-2">
          <IntakeSheet
            questions={pendingIntake}
            onSubmit={handleIntakeSubmit}
            onDismiss={() => setPendingIntake(null)}
            compact
          />
        </div>
      )}

      {/* Actions */}
      {(latestActions.length > 0) && !pendingIntake && (
        <div className="px-4 pb-2">
          <ResponseActions
            primaryFollowup={latestActions[0] ? { label: latestActions[0].label, value: latestActions[0].value } : null}
            secondaryAction={latestActions[1] ? { label: latestActions[1].label, value: latestActions[1].value } : null}
            onAskClick={(value) => {
              setLatestActions([]);
              setLatestLinks([]);
              sendMessage(value);
            }}
            compact
            disabled={isLoading}
          />
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-border">
        <form onSubmit={handleSubmit} className="flex gap-2 items-center">
          {messages.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={handleClearConversation}
              aria-label="Gesprek wissen"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Stel je vraag..."
            disabled={isLoading || !!pendingIntake}
            className="flex-1 h-9 text-sm rounded-xl"
            aria-label="Stel je vraag"
          />
          <Button type="submit" size="sm" disabled={isLoading || !input.trim() || !!pendingIntake} className="h-9 w-9 p-0 rounded-xl" aria-label="Verstuur bericht">
            <Send className="h-3.5 w-3.5" />
          </Button>
        </form>
      </div>
    </motion.div>
  );
}
