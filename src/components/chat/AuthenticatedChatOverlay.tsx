import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Trash2, ExternalLink, MessageCircle, X, Minimize2, Maximize2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useChatConversation } from "@/hooks/useChatConversation";
import { supabase } from "@/integrations/supabase/client";
import { runPhaseDetector, ConversationTurn, KnownSlots, UiPhaseCode } from "@/utils/phaseDetectorEngine";
import { CollapsibleAnswer } from "@/components/chat/CollapsibleAnswer";
import { ResponseActions } from "@/components/chat/ResponseActions";
import { IntakeSheet } from "@/components/chat/IntakeSheet";
import { PhaseConfirmation } from "@/components/chat/PhaseConfirmation";
import { parseStructuredMeta } from "@/utils/responsePipeline";
import type { StructuredResponse, IntakeQuestion } from "@/utils/responsePipeline";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/doorai-chat`;

function sectorToSchoolType(sector: string | null | undefined): string | undefined {
  if (!sector) return undefined;
  const s = sector.toLowerCase();
  if (s.includes("po")) return "PO";
  if (s.includes("vo")) return "VO";
  if (s.includes("mbo")) return "MBO";
  return undefined;
}

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

export function AuthenticatedChatOverlay() {
  const { user } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [knownSlots, setKnownSlots] = useState<KnownSlots>({});
  const [latestLinks, setLatestLinks] = useState<Array<{ label: string; href: string }>>([]);
  const [pendingIntake, setPendingIntake] = useState<IntakeQuestion[] | null>(null);
  const [pendingPhaseSuggestion, setPendingPhaseSuggestion] = useState<{ from: string; to: string; message: string } | null>(null);
  const [reflectionWarning, setReflectionWarning] = useState<string[] | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const profileRef = { current_phase: profile?.current_phase || "interesseren" as UiPhaseCode, preferred_sector: profile?.preferred_sector || null };

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
  } = useChatConversation(user?.id, profileRef);

  // Hide on backoffice
  const isBackoffice = location.pathname.startsWith("/backoffice");
  if (!user || isBackoffice) return null;

  // Fetch profile
  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("current_phase, preferred_sector, first_name, bio, test_completed, test_results, known_slots")
          .eq("user_id", user.id)
          .single();
        if (data) {
          setProfile(data);
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
  }, [user]);

  // Load conversation once profile loaded
  useEffect(() => {
    if (profileLoaded && user) loadConversation();
  }, [profileLoaded, user, loadConversation]);

  // Scroll to bottom
  useEffect(() => {
    const el = chatContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, pendingIntake, pendingPhaseSuggestion]);

  // Listen for external messages (from TopicMenu)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.message) {
        setIsOpen(true);
        // Small delay so overlay opens first
        setTimeout(() => sendMessage(detail.message), 100);
      }
    };
    window.addEventListener("doorai-send-message", handler);
    return () => window.removeEventListener("doorai-send-message", handler);
  }, []);

  // Focus input on open
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 150);
  }, [isOpen]);

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setIsOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen]);

  // Phase update ONLY via handlePhaseAccept — never auto
  const maybePersistProfile = useCallback(
    async (detector: ReturnType<typeof runPhaseDetector>, slotsToSave?: KnownSlots) => {
      if (!user) return;
      const updates: Record<string, unknown> = {};
      // NO current_phase update here — only via handlePhaseAccept

      const st = detector.known_slots.school_type;
      if (st && typeof st === "string") {
        const sector = st === "PO" ? "po" : st === "VO" ? "vo" : st === "MBO" ? "mbo" : null;
        if (sector && sector !== profile?.preferred_sector) updates.preferred_sector = sector;
      }
      const finalSlots = slotsToSave || detector.known_slots;
      if (Object.keys(finalSlots).length > 0) updates.known_slots = finalSlots;
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
    setReflectionWarning(null);

    let assistantContent = "";

    try {
      const convId = await ensureConversation();
      if (convId) await saveMessage(convId, "user", text);

      const currentPhase = profile?.current_phase || "interesseren";
      const conversationTurns: ConversationTurn[] = outgoingMessages
        .slice(-30)
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role as "user" | "assistant", text: m.content }));

      const detector = runPhaseDetector({
        conversation: conversationTurns,
        known_slots: knownSlots,
        current_phase_ui: currentPhase,
      });

      setKnownSlots(detector.known_slots);
      await maybePersistProfile(detector);

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
          userSector: profile?.preferred_sector,
          detector,
          phase_transition: phaseTransition,
          profileMeta: {
            first_name: profile?.first_name,
            bio: profile?.bio,
            test_completed: profile?.test_completed,
            test_results: profile?.test_results,
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

            // Handle event: ui
            if (currentEventType === "ui") {
              if (parsed.actions && Array.isArray(parsed.actions)) {
                setLatestActions(parsed.actions.slice(0, 2));
              }
              if (parsed.links && Array.isArray(parsed.links)) {
                setLatestLinks(parsed.links.slice(0, 6));
              }

              // Handle intake_needed — use dynamic question from backend
              if (parsed.intake_needed && parsed.slot_chips && Array.isArray(parsed.slot_chips)) {
                const intakeQuestion = parsed.intake_question || "Kun je even het volgende aangeven?";
                setPendingIntake([{
                  id: "slot_0",
                  question: intakeQuestion,
                  type: "choice",
                  options: parsed.slot_chips.map((c: { label: string }) => c.label),
                }]);
                setMessages(prev => [
                  ...prev.slice(0, -1),
                  { role: "assistant" as const, content: "Ik wil je graag goed helpen. Kun je even het volgende aangeven?" },
                ]);
              }

              // Handle corrected_slots
              if (parsed.corrected_slots && typeof parsed.corrected_slots === "object") {
                setKnownSlots(prev => {
                  const merged = { ...prev, ...parsed.corrected_slots };
                  supabase.from("profiles").update({ known_slots: merged }).eq("user_id", user!.id).then(() => {});
                  return merged;
                });
              }

              // Handle phase_suggestion
              if (parsed.phase_suggestion && parsed.phase_suggestion.from && parsed.phase_suggestion.to) {
                setPendingPhaseSuggestion(parsed.phase_suggestion);
              }

              // Structured meta
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

            // Handle event: reflection
            if (currentEventType === "reflection") {
              if (parsed.pass === false && Array.isArray(parsed.issues)) {
                setReflectionWarning(parsed.issues);
                console.warn("Reflection issues:", parsed.issues);
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

  const handlePhaseAccept = useCallback(async () => {
    if (!pendingPhaseSuggestion || !user) return;
    const newPhase = pendingPhaseSuggestion.to as UiPhaseCode;
    setPendingPhaseSuggestion(null);
    try {
      const { data, error } = await supabase.from("profiles").update({ current_phase: newPhase }).eq("user_id", user.id)
        .select("current_phase, preferred_sector, first_name, bio, test_completed, test_results, known_slots").single();
      if (!error && data) setProfile(data);
    } catch (e) {
      console.warn("Phase update skipped:", e);
    }
    sendMessage(`Ja, ik wil door naar ${newPhase}.`);
  }, [pendingPhaseSuggestion, user]);

  const handlePhaseDecline = useCallback(() => {
    setPendingPhaseSuggestion(null);
  }, []);

  const handleClearConversation = useCallback(async () => {
    await resetConversation();
    setKnownSlots({});
    setPendingIntake(null);
    setPendingPhaseSuggestion(null);
    setLatestLinks([]);
    setReflectionWarning(null);
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

  const visibleMessages = messages.slice(-8);

  // Sizes
  const width = isExpanded ? 480 : 380;
  const height = isExpanded ? 680 : 500;

  return (
    <>
      {/* FAB */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 bg-primary text-primary-foreground rounded-full p-4 shadow-lg hover:bg-primary/90 transition-colors"
            aria-label="Open DOORai chat"
          >
            <MessageCircle className="h-6 w-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 bg-card rounded-3xl shadow-2xl border border-border overflow-hidden flex flex-col"
            style={{
              width: `min(${width}px, calc(100vw - 3rem))`,
              height: `min(${height}px, calc(100vh - 6rem))`,
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <h3 className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">DOORai</h3>
              </div>
              <div className="flex items-center gap-0.5">
                {messages.length > 1 && (
                  <button
                    onClick={handleClearConversation}
                    className="p-1.5 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-destructive"
                    aria-label="Gesprek wissen"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-1.5 hover:bg-muted rounded-full transition-colors text-muted-foreground"
                  aria-label={isExpanded ? "Verklein" : "Vergroot"}
                >
                  {isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-muted rounded-full transition-colors text-muted-foreground"
                  aria-label="Sluit chat"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5" aria-live="polite">
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
                      <p className="text-[13px]">{message.content}</p>
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

            {/* Intake */}
            {pendingIntake && (
              <div className="px-4 pb-2 shrink-0">
                <IntakeSheet
                  questions={pendingIntake}
                  onSubmit={handleIntakeSubmit}
                  onDismiss={() => setPendingIntake(null)}
                  compact
                />
              </div>
            )}

            {/* Phase confirmation */}
            {pendingPhaseSuggestion && !pendingIntake && (
              <div className="px-4 pb-2 shrink-0">
                <PhaseConfirmation
                  from={pendingPhaseSuggestion.from}
                  to={pendingPhaseSuggestion.to}
                  message={pendingPhaseSuggestion.message}
                  onAccept={handlePhaseAccept}
                  onDecline={handlePhaseDecline}
                  compact
                />
              </div>
            )}

            {/* Actions */}
            {!pendingIntake && latestActions.length > 0 && (
              <div className="px-4 pb-2 shrink-0">
                <ResponseActions
                  primaryFollowup={latestActions[0] ? { label: latestActions[0].label, value: latestActions[0].value } : null}
                  secondaryAction={latestActions[1] ? { label: latestActions[1].label, value: latestActions[1].value } : null}
                  onAskClick={handleActionClick}
                  compact
                  disabled={isLoading}
                />
              </div>
            )}

            {/* Link chips */}
            {latestLinks.length > 0 && !pendingIntake && !isLoading && (
              <div className="px-4 pb-2 flex flex-wrap gap-1.5 shrink-0">
                {latestLinks.map((link, i) =>
                  link.href.startsWith("/") ? (
                    <Link
                      key={i}
                      to={link.href}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                    >
                      {link.label}
                    </Link>
                  ) : (
                    <a
                      key={i}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                    >
                      {link.label}
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )
                )}
              </div>
            )}

            {/* Reflection warning */}
            {reflectionWarning && !isLoading && (
              <div className="px-4 pb-2 shrink-0">
                <div className="text-[10px] text-muted-foreground bg-muted/50 rounded-lg px-3 py-1.5">
                  ⚠️ Dit antwoord is mogelijk onvolledig of bevat aandachtspunten.
                </div>
              </div>
            )}

            {/* Input */}
            <div className="px-4 pb-3 pt-2 border-t border-border shrink-0">
              <form onSubmit={handleSubmit} className="flex gap-2 items-center">
                <Input
                  ref={inputRef}
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
        )}
      </AnimatePresence>
    </>
  );
}
