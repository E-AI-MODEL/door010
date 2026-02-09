import { useState, useRef, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, X, Send, ArrowRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/contexts/AuthContext";

// ===== Types =====

type Role = "user" | "assistant";
type ActionKind = "ask" | "nav" | "cta";
type Intent = "route" | "toelating" | "vacatures" | "events" | "account" | "general";
type Sector = "PO" | "VO" | "MBO" | "UNK";
type StudyLevel = "MBO" | "HBO" | "WO" | "UNK";
type Region = "ROTTERDAM" | "OVERIG" | "UNK";

interface QuickAction {
  kind: ActionKind;
  label: string;
  text?: string;
  href?: string;
  closeOnClick?: boolean;
}

interface Message {
  role: Role;
  content: string;
  actions?: QuickAction[];
}

interface ConversationSignals {
  intent: Intent;
  sector: Sector;
  studyLevel: StudyLevel;
  region: Region;
  hasEnoughContext: boolean;
}

interface AssistantMeta {
  intent?: Intent;
  followUps?: Array<{ kind?: ActionKind; label: string; text?: string; href?: string }>;
  cta?: { label: string; href: string };
  signals?: Partial<ConversationSignals>;
}

// ===== Constants =====

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/homepage-coach`;

const ROUTES = {
  auth: "/auth",
  opleidingen: "/opleidingen",
  vacatures: "/vacatures",
  events: "/events",
  kennisbank: "/kennisbank",
} as const;

const MAX_LABEL_LEN = 48;

// ===== Helpers =====

function shortLabel(label: string): string {
  const trimmed = label.trim().replace(/\s+/g, " ");
  return trimmed.length <= MAX_LABEL_LEN ? trimmed : trimmed.slice(0, MAX_LABEL_LEN - 1) + "…";
}

function isInternalHref(href?: string): boolean {
  return !!href && href.startsWith("/");
}

function isValidHref(href?: string): boolean {
  if (!href) return false;
  const h = href.trim();
  return h.startsWith("/") || h.startsWith("http://") || h.startsWith("https://");
}

function uniqByLabel(actions: QuickAction[]): QuickAction[] {
  const seen = new Set<string>();
  return actions.filter((a) => {
    const key = a.label.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function capActions(actions: QuickAction[], max = 3): QuickAction[] {
  return actions.slice(0, max);
}

function isActionValid(a: QuickAction): boolean {
  return a.kind === "ask" ? !!a.text?.trim() : isValidHref(a.href);
}

// ===== Funnel / State Machine =====

function inferSignalsFromUserText(prev: ConversationSignals, text: string): ConversationSignals {
  let intent: Intent = prev.intent;
  if (/(route|zij-?instroom|traject|leraar.in.opleiding|lio)/i.test(text)) intent = "route";
  else if (/(diploma|bevoegd|bevoegdheid|toelating|vereist|eisen)/i.test(text)) intent = "toelating";
  else if (/(vacatur|banen|werk|sollicit|wijken|school zoeken)/i.test(text)) intent = "vacatures";
  else if (/(open dag|webinar|event|bijeenkomst|infoavond)/i.test(text)) intent = "events";
  else if (/(account|profiel|inlog|login)/i.test(text)) intent = "account";

  let sector: Sector = prev.sector;
  if (/\bpo\b|basisonderwijs|primair/i.test(text)) sector = "PO";
  else if (/\bvo\b|voortgezet|middelbare/i.test(text)) sector = "VO";
  else if (/\bmbo\b|beroepsonderwijs/i.test(text)) sector = "MBO";

  let studyLevel: StudyLevel = prev.studyLevel;
  if (/\bmbo\b/i.test(text)) studyLevel = "MBO";
  else if (/\bhbo\b/i.test(text)) studyLevel = "HBO";
  else if (/\bwo\b|univers/i.test(text)) studyLevel = "WO";

  let region: Region = prev.region;
  if (/rotterdam|rdam|010/i.test(text)) region = "ROTTERDAM";
  else if (/anders|andere regio|buiten rotterdam|niet rotterdam/i.test(text)) region = "OVERIG";

  const hasEnoughContext = sector !== "UNK" && studyLevel !== "UNK";
  return { intent, sector, studyLevel, region, hasEnoughContext };
}

function computeNextActions(signals: ConversationSignals): QuickAction[] {
  const actions: QuickAction[] = [];

  // 1) Best next question based on missing info
  if (signals.sector === "UNK") {
    actions.push({ kind: "ask", label: shortLabel("Help me kiezen tussen PO, VO en MBO"), text: "Ik twijfel tussen PO/VO/MBO — kun je me helpen kiezen?" });
  } else if (signals.studyLevel === "UNK") {
    actions.push({ kind: "ask", label: shortLabel("Wat betekent mijn opleidingsniveau?"), text: "Mijn hoogste opleiding is: (MBO/HBO/WO). Wat betekent dat voor mijn route?" });
  } else {
    const intentQuestions: Record<string, QuickAction> = {
      route: { kind: "ask", label: shortLabel("Hoe werkt zij-instroom precies?"), text: "Hoe werkt zij-instroom voor mij, stap voor stap?" },
      toelating: { kind: "ask", label: shortLabel("Welke diploma's heb ik nodig?"), text: "Welke diploma's of bevoegdheid heb ik nodig in mijn situatie?" },
      vacatures: { kind: "ask", label: shortLabel("Vacatures bij mij in de buurt"), text: "Welke vacatures passen bij mij (en waar)?" },
      events: { kind: "ask", label: shortLabel("Wanneer zijn er open dagen?"), text: "Wanneer zijn er open dagen of webinars?" },
    };
    actions.push(intentQuestions[signals.intent] ?? { kind: "ask", label: shortLabel("Welke route past het best bij mij?"), text: "Welke route past het beste bij mij?" });
  }

  // 2) Relevant internal nav
  const navMap: Record<string, QuickAction> = {
    vacatures: { kind: "nav", label: shortLabel("Bekijk alle vacatures"), href: ROUTES.vacatures },
    events: { kind: "nav", label: shortLabel("Bekijk aankomende events"), href: ROUTES.events },
    toelating: { kind: "nav", label: shortLabel("Bekijk opleidingsroutes"), href: ROUTES.opleidingen },
    route: { kind: "nav", label: shortLabel("Bekijk opleidingsroutes"), href: ROUTES.opleidingen },
  };
  actions.push(navMap[signals.intent] ?? { kind: "nav", label: shortLabel("Bekijk de kennisbank"), href: ROUTES.kennisbank });

  // 3) CTA or fallback question
  if (signals.hasEnoughContext) {
    actions.push({ kind: "cta", label: shortLabel("Maak een gratis profiel aan"), href: ROUTES.auth });
  } else if (signals.sector === "UNK") {
    actions.push({ kind: "ask", label: shortLabel("Ik wil naar het basisonderwijs (PO)"), text: "Ik wil richting basisonderwijs (PO)." });
  } else if (signals.studyLevel === "UNK") {
    actions.push({ kind: "ask", label: shortLabel("Ik heb een HBO-diploma"), text: "Ik heb een HBO-diploma. Wat zijn mijn opties?" });
  } else {
    actions.push({ kind: "ask", label: shortLabel("Vat mijn opties samen"), text: "Kun je mijn opties samenvatten?" });
  }

  return capActions(uniqByLabel(actions.filter(isActionValid)), 3);
}

// ===== Backend Meta (optional) =====

function parseBackendMeta(json: any): AssistantMeta | null {
  try {
    const meta = json?.meta ?? json?.assistant_meta ?? null;
    if (!meta || typeof meta !== "object") return null;
    return {
      intent: meta.intent,
      followUps: Array.isArray(meta.followUps) ? meta.followUps : Array.isArray(meta.follow_ups) ? meta.follow_ups : undefined,
      cta: meta.cta && typeof meta.cta === "object" ? meta.cta : undefined,
      signals: meta.signals && typeof meta.signals === "object" ? meta.signals : undefined,
    };
  } catch {
    return null;
  }
}

function actionsFromMeta(meta: AssistantMeta | null): QuickAction[] | null {
  if (!meta) return null;
  const actions: QuickAction[] = [];

  if (meta.followUps?.length) {
    for (const f of meta.followUps) {
      const kind = (f.kind ?? (f.href ? "nav" : "ask")) as ActionKind;
      const label = shortLabel(f.label);
      if (kind === "ask" && f.text?.trim()) actions.push({ kind, label, text: f.text });
      if ((kind === "nav" || kind === "cta") && isValidHref(f.href)) actions.push({ kind, label, href: f.href });
    }
  }

  if (meta.cta?.label && isValidHref(meta.cta.href)) {
    actions.push({ kind: "cta", label: shortLabel(meta.cta.label), href: meta.cta.href });
  }

  const cleaned = capActions(uniqByLabel(actions.filter(isActionValid)), 3);
  return cleaned.length ? cleaned : null;
}

// ===== Component =====

export function PublicChatWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showActions, setShowActions] = useState(true);

  const [signals, setSignals] = useState<ConversationSignals>({
    intent: "general",
    sector: "UNK",
    studyLevel: "UNK",
    region: "UNK",
    hasEnoughContext: false,
  });

  const initialActions = useMemo<QuickAction[]>(
    () => [
      { kind: "ask", label: shortLabel("Welke route past bij mij?"), text: "Welke route past bij mij om leraar te worden?" },
      { kind: "ask", label: shortLabel("Help me kiezen: PO, VO of MBO"), text: "Welke sector past bij mij (PO/VO/MBO)?" },
      { kind: "ask", label: shortLabel("Ik werk al en wil overstappen"), text: "Ik werk al. Kan ik overstappen naar het onderwijs?" },
    ],
    []
  );

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hoi! 👋 Ik ben DOORai. Waar wil je vandaag mee beginnen?",
      actions: initialActions,
    },
  ]);

  const latestActions = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant" && messages[i].actions?.length) {
        return messages[i].actions!;
      }
    }
    return [];
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

  const handleActionClick = (action: QuickAction) => {
    if (action.kind === "ask" && action.text) {
      setInput("");
      sendMessageWithText(action.text);
      return;
    }
    // nav/cta close handled by Link onClick
  };

  const sendMessageWithText = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const nextSignals = inferSignalsFromUserText(signals, text);
    setSignals(nextSignals);

    const userMessage: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setShowActions(false);

    let assistantContent = "";
    let backendMeta: AssistantMeta | null = null;

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
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            if (!backendMeta) {
              const m = parseBackendMeta(parsed);
              if (m) backendMeta = m;
            }
            const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (delta) {
              assistantContent += delta;
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

      // Merge backend meta into signals if available
      setSignals((prev) => {
        const merged = { ...prev };
        if (backendMeta?.intent) merged.intent = backendMeta.intent;
        if (backendMeta?.signals) {
          if (backendMeta.signals.intent) merged.intent = backendMeta.signals.intent;
          if (backendMeta.signals.sector) merged.sector = backendMeta.signals.sector;
          if (backendMeta.signals.studyLevel) merged.studyLevel = backendMeta.signals.studyLevel;
          if (backendMeta.signals.region) merged.region = backendMeta.signals.region;
        }
        merged.hasEnoughContext = merged.sector !== "UNK" && merged.studyLevel !== "UNK";
        return merged;
      });

      const metaActions = actionsFromMeta(backendMeta);
      const computedActions = computeNextActions(nextSignals);
      const finalActions = metaActions ?? computedActions;

      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { ...updated[updated.length - 1], actions: finalActions };
        return updated;
      });
      setShowActions(true);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, er ging iets mis. Probeer het zo nog eens 🙏",
          actions: [
            { kind: "ask", label: shortLabel("Kun je dat nog eens proberen?"), text: "Kun je dat nog eens uitleggen?" },
            { kind: "nav", label: shortLabel("Bekijk de kennisbank"), href: ROUTES.kennisbank },
            { kind: "cta", label: shortLabel("Maak een gratis profiel aan"), href: ROUTES.auth },
          ],
        },
      ]);
      setShowActions(true);
    } finally {
      setIsLoading(false);
    }
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
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 bg-[hsl(152,100%,33%)] text-white rounded-full p-4 shadow-lg hover:bg-[hsl(152,100%,28%)] transition-colors"
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
            className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)] bg-white rounded-3xl shadow-2xl border border-border overflow-hidden flex flex-col"
            style={{ height: "520px", maxHeight: "calc(100vh-6rem)" }}
          >
            {/* Header */}
            <div className="bg-[hsl(152,100%,33%)] text-white p-4 flex items-center justify-between shrink-0 rounded-t-3xl">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 rounded-full p-2">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">DOORai</h3>
                  <p className="text-xs text-white/80">Je gids naar het onderwijs</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
                aria-label="Sluit chat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message, index) => (
                <div key={index}>
                  <div className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                        message.role === "user"
                          ? "bg-[hsl(152,100%,33%)] text-white"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      {message.role === "assistant" ? (
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                          <ReactMarkdown
                            components={{
                              a: ({ href, children }) => {
                                if (!isValidHref(href)) return <span>{children}</span>;
                                if (isInternalHref(href)) {
                                  return (
                                    <Link
                                      to={href!}
                                      className="text-[hsl(152,100%,33%)] hover:underline inline-flex items-center gap-1"
                                      onClick={() => setIsOpen(false)}
                                    >
                                      {children}
                                      <ExternalLink className="h-3 w-3" />
                                    </Link>
                                  );
                                }
                                return (
                                  <a
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[hsl(152,100%,33%)] hover:underline inline-flex items-center gap-1"
                                    onClick={() => setIsOpen(false)}
                                  >
                                    {children}
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                );
                              },
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm">{message.content}</p>
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

            {/* Bottom area: actions + tip + input — anchored */}
            <div className="shrink-0 border-t border-border bg-white">
              {/* Action buttons */}
              {latestActions.length > 0 && showActions && !isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="px-4 pt-3 pb-1"
                >
                  <p className="text-xs text-muted-foreground mb-2">Suggesties</p>
                  <div className="flex flex-wrap gap-2">
                  {latestActions.filter(isActionValid).map((action, i) => {
                    const baseClass = "px-3 py-1 text-xs rounded-full transition-colors border h-7 inline-flex items-center justify-center";
                    const ctaClass = "bg-[hsl(152,100%,33%)] text-white border-[hsl(152,100%,33%)] hover:bg-[hsl(152,100%,28%)]";
                    const outlineClass = "bg-white border-[hsl(152,100%,33%)]/30 text-[hsl(152,100%,33%)] hover:bg-[hsl(152,100%,33%)]/10";

                    if (action.kind === "ask") {
                      return (
                        <button
                          key={i}
                          onClick={() => handleActionClick(action)}
                          className={`${baseClass} ${outlineClass}`}
                        >
                          <span className="max-w-[260px] truncate">{action.label}</span>
                        </button>
                      );
                    }

                    const className = `${baseClass} ${action.kind === "cta" ? ctaClass : outlineClass}`;

                    if (isInternalHref(action.href)) {
                      return (
                        <Link
                          key={i}
                          to={action.href!}
                          className={className}
                          onClick={() => setIsOpen(false)}
                        >
                          <span className="max-w-[260px] truncate">{action.label}</span>
                        </Link>
                      );
                    }

                    return (
                      <a
                        key={i}
                        href={action.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={className}
                        onClick={() => setIsOpen(false)}
                      >
                        <span className="max-w-[260px] truncate">{action.label}</span>
                      </a>
                    );
                  })}
                  </div>
                </motion.div>
              )}

              {/* Contextual tip */}
              <div className="flex items-center justify-between gap-2 px-4 py-2">
                <p className="text-xs text-muted-foreground">
                  {signals.hasEnoughContext
                    ? "Tip: met een gratis profiel krijg je een persoonlijk stappenplan."
                    : "Tip: met een profiel kun je stappen opslaan en advies op maat krijgen."}
                </p>
                <Link
                  to="/auth"
                  className="flex items-center gap-1 text-xs text-[hsl(152,100%,33%)] hover:underline font-medium whitespace-nowrap shrink-0"
                  onClick={() => setIsOpen(false)}
                >
                  <ArrowRight className="h-3 w-3" />
                  Maak profiel
                </Link>
              </div>

              {/* Input */}
              <form onSubmit={sendMessage} className="px-4 pb-4 pt-1">
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Stel je vraag…"
                    disabled={isLoading}
                    className="flex-1 rounded-full px-4"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={isLoading || !input.trim()}
                    className="rounded-full bg-[hsl(152,100%,33%)] hover:bg-[hsl(152,100%,28%)]"
                  >
                    <Send className="h-4 w-4" />
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
