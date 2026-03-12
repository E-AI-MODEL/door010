import { useState, useRef, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, X, Send, Bot, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { CollapsibleAnswer } from "@/components/chat/CollapsibleAnswer";
import { ResponseActions } from "@/components/chat/ResponseActions";
import { IntakeSheet } from "@/components/chat/IntakeSheet";
import {
  needsClarification,
  buildIntakeQuestions,
  classifyAnswerType,
  parseStructuredMeta,
} from "@/utils/responsePipeline";
import type { StructuredResponse, IntakeQuestion, FollowUpAction } from "@/utils/responsePipeline";

// ===== Types =====

interface Message {
  role: "user" | "assistant";
  content: string;
  structured?: StructuredResponse | null;
  primaryFollowup?: FollowUpAction | null;
  secondaryAction?: FollowUpAction | null;
}

interface ConversationSignals {
  sector: "PO" | "VO" | "MBO" | "UNK";
  studyLevel: "MBO" | "HBO" | "WO" | "UNK";
}

// ===== Constants =====

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/homepage-coach`;

// ===== Helpers =====

function inferSignals(prev: ConversationSignals, text: string): ConversationSignals {
  let sector = prev.sector;
  if (/\bpo\b|basisonderwijs|primair/i.test(text)) sector = "PO";
  else if (/\bvo\b|voortgezet|middelbare/i.test(text)) sector = "VO";
  else if (/\bmbo\b|beroepsonderwijs/i.test(text)) sector = "MBO";

  let studyLevel = prev.studyLevel;
  if (/\bmbo\b/i.test(text)) studyLevel = "MBO";
  else if (/\bhbo\b/i.test(text)) studyLevel = "HBO";
  else if (/\bwo\b|univers/i.test(text)) studyLevel = "WO";

  return { sector, studyLevel };
}

// ===== Component =====

export function PublicChatWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingIntake, setPendingIntake] = useState<IntakeQuestion[] | null>(null);

  const [signals, setSignals] = useState<ConversationSignals>({
    sector: "UNK",
    studyLevel: "UNK",
  });

  const initialFollowups: Pick<Message, "primaryFollowup" | "secondaryAction"> = {
    primaryFollowup: { label: "Welke route past bij mij?", value: "Welke route past bij mij om leraar te worden?" },
    secondaryAction: { label: "Ik werk al en wil overstappen", value: "Ik werk al. Kan ik overstappen naar het onderwijs?" },
  };

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Welkom bij het Onderwijsloket Rotterdam. Heb je een vraag over werken in het onderwijs? Ik help je graag verder.",
      ...initialFollowups,
    },
  ]);

  // Get latest followups from last assistant message
  const latestFollowups = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role === "assistant" && (m.primaryFollowup || m.secondaryAction)) {
        return { primaryFollowup: m.primaryFollowup, secondaryAction: m.secondaryAction };
      }
    }
    return { primaryFollowup: null, secondaryAction: null };
  }, [messages]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    const handleOpenChat = () => setIsOpen(true);
    window.addEventListener("openDOORaiChat", handleOpenChat);
    return () => window.removeEventListener("openDOORaiChat", handleOpenChat);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      openButtonRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  const sendMessageWithText = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const nextSignals = inferSignals(signals, text);
    setSignals(nextSignals);

    const userMessage: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setPendingIntake(null);

    // Check if intake is needed
    const missingSector = nextSignals.sector === "UNK";
    const missingLevel = nextSignals.studyLevel === "UNK";
    if (needsClarification(text, { missingSector, missingLevel, backendMode: "direct" })) {
      const intakeQs = buildIntakeQuestions({ missingSector, missingLevel });
      if (intakeQs.length > 0) {
        setPendingIntake(intakeQs);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Ik wil je graag goed helpen. Kun je even het volgende aangeven?" },
        ]);
        setIsLoading(false);
        return;
      }
    }

    let assistantContent = "";

    try {
      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({ role: m.role, content: m.content })),
          mode: "public",
          context: { signals: nextSignals, site: "door010" },
        }),
      });

      if (!response.ok || !response.body) throw new Error("Failed to get response");

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let currentEventType = "";
      let parsedMeta: StructuredResponse | null = null;

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
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);

            // Handle event: ui
            if (currentEventType === "ui") {
              parsedMeta = parseStructuredMeta(parsed);

              // Extract actions from payload
              let pf: FollowUpAction | null = null;
              let sa: FollowUpAction | null = null;

              if (parsedMeta?.primary_followup) pf = parsedMeta.primary_followup;
              if (parsedMeta?.secondary_action) sa = parsedMeta.secondary_action;

              // Fallback: parse actions array from payload
              if (!pf && parsed.actions && Array.isArray(parsed.actions) && parsed.actions.length > 0) {
                pf = { label: parsed.actions[0].label, value: parsed.actions[0].value };
                if (parsed.actions.length > 1) {
                  sa = { label: parsed.actions[1].label, value: parsed.actions[1].value };
                }
              }

              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.role === "assistant") {
                  last.structured = parsedMeta;
                  last.primaryFollowup = pf;
                  last.secondaryAction = sa;
                }
                return [...updated];
              });

              currentEventType = "";
              continue;
            }

            // Legacy actions fallback
            if (parsed.actions && Array.isArray(parsed.actions)) {
              const pf = parsed.actions[0] ? { label: parsed.actions[0].label, value: parsed.actions[0].value } : null;
              const sa = parsed.actions[1] ? { label: parsed.actions[1].label, value: parsed.actions[1].value } : null;
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.role === "assistant") {
                  last.primaryFollowup = pf;
                  last.secondaryAction = sa;
                }
                return [...updated];
              });
              continue;
            }

            const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (delta) {
              assistantContent += delta;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { ...updated[updated.length - 1], role: "assistant", content: assistantContent };
                return updated;
              });
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // If no actions came from backend, generate defaults based on answer type
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === "assistant" && !last.primaryFollowup) {
          last.primaryFollowup = { label: "Vertel me meer", value: "Kun je daar meer over vertellen?" };
          last.secondaryAction = { label: "Bekijk opleidingen", value: "Welke opleidingsroutes zijn er?" };
        }
        return [...updated];
      });
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, er ging iets mis. Probeer het zo nog eens.",
          primaryFollowup: { label: "Probeer opnieuw", value: "Kun je dat nog eens uitleggen?" },
          secondaryAction: null,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleIntakeSubmit = (answers: Record<string, string>) => {
    setPendingIntake(null);
    const summary = Object.entries(answers).map(([, v]) => v).join(", ");
    sendMessageWithText(`Mijn situatie: ${summary}`);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessageWithText(input);
  };

  if (user) return null;

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            ref={openButtonRef}
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

      {/* Chat window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)] bg-card rounded-3xl shadow-2xl border border-border overflow-hidden flex flex-col"
            style={{ height: "520px", maxHeight: "calc(100vh-6rem)" }}
          >
            {/* Header */}
            <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between shrink-0 rounded-t-3xl">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-primary-foreground/60 animate-pulse" />
                <div>
                  <h3 className="text-sm font-semibold">DOORai</h3>
                  <p className="text-[10px] text-primary-foreground/70">Je gids naar het onderwijs</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <a
                  href="https://doortje-embedded-bot.replit.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Chat met Doortje"
                  className="p-1 hover:bg-primary-foreground/20 rounded-full transition-colors"
                >
                  <Bot className="h-4 w-4" />
                </a>
                <a
                  href="mailto:info@onderwijsloketrotterdam.nl"
                  title="E-mail ons"
                  className="p-1 hover:bg-primary-foreground/20 rounded-full transition-colors"
                >
                  <Mail className="h-4 w-4" />
                </a>
                <a
                  href="tel:+31107940000"
                  title="Bel ons"
                  className="p-1 hover:bg-primary-foreground/20 rounded-full transition-colors"
                >
                  <Phone className="h-4 w-4" />
                </a>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-primary-foreground/20 rounded-full transition-colors"
                  aria-label="Sluit chat"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5" aria-live="polite">
              {messages.map((message, index) => (
                <div key={index}>
                  <div className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      {message.role === "assistant" ? (
                        <CollapsibleAnswer
                          content={message.content}
                          structured={message.structured}
                          compact
                        />
                      ) : (
                        <p className="text-[13px]">{message.content}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl px-4 py-2.5">
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

            {/* Bottom area: intake + actions + input */}
            <div className="shrink-0 border-t border-border bg-card">
              {/* Intake sheet */}
              {pendingIntake && (
                <div className="px-4 pt-2.5 pb-1">
                  <IntakeSheet
                    questions={pendingIntake}
                    onSubmit={handleIntakeSubmit}
                    onDismiss={() => setPendingIntake(null)}
                    compact
                  />
                </div>
              )}

              {/* Action buttons */}
              {!pendingIntake && !isLoading && (latestFollowups.primaryFollowup || latestFollowups.secondaryAction) && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="px-4 pt-2.5 pb-1"
                >
                  <ResponseActions
                    primaryFollowup={latestFollowups.primaryFollowup}
                    secondaryAction={latestFollowups.secondaryAction}
                    onAskClick={(value) => sendMessageWithText(value)}
                    compact
                  />
                </motion.div>
              )}

              {/* Input */}
              <form onSubmit={sendMessage} className="px-4 pb-3 pt-2">
                <div className="flex gap-2 items-center">
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Stel je vraag…"
                    disabled={isLoading || !!pendingIntake}
                    className="flex-1 h-9 text-sm rounded-xl"
                    aria-label="Stel je vraag"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isLoading || !input.trim() || !!pendingIntake}
                    className="h-9 w-9 p-0 rounded-xl bg-primary hover:bg-primary/90"
                    aria-label="Verstuur bericht"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
