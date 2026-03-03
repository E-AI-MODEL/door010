import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Send, ArrowLeft, Trash2, ArrowRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useChatConversation } from "@/hooks/useChatConversation";
import { ChatSuggestions } from "@/components/chat/ChatSuggestions";
import { runPhaseDetector, ConversationTurn, KnownSlots, UiPhaseCode } from "@/utils/phaseDetectorEngine";
import { normalizeMarkdown } from "@/utils/normalizeMarkdown";

interface Profile {
  current_phase: UiPhaseCode | null;
  preferred_sector: string | null;
  first_name?: string | null;
  bio?: string | null;
  test_completed?: boolean | null;
  test_results?: unknown;
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
            .select("current_phase, preferred_sector, first_name, bio, test_completed, test_results")
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
    const el = chatContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const maybePersistProfile = useCallback(
    async (detector: ReturnType<typeof runPhaseDetector>) => {
      if (!user) return;

      const updates: Record<string, unknown> = {};

      // Update current_phase only when confidence is reasonable
      if (profile?.current_phase && detector.phase_current_ui !== profile.current_phase && detector.phase_confidence >= 0.60) {
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
          .select("current_phase, preferred_sector, first_name, bio, test_completed, test_results")
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
    setLatestLinks([]);

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
      let currentEventType = ""; // Track SSE event type

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

          // Track event type from SSE "event:" lines
          if (line.startsWith("event: ")) {
            currentEventType = line.slice(7).trim();
            continue;
          }

          if (line.startsWith(":") || line.trim() === "") {
            // Empty line resets event type after processing
            if (line.trim() === "") currentEventType = "";
            continue;
          }
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") continue;

          try {
            const parsed = JSON.parse(jsonStr);

            // Handle `event: ui` — separate SSE event type for UI payload
            if (currentEventType === "ui") {
              if (parsed.actions && Array.isArray(parsed.actions)) {
                setLatestActions(parsed.actions);
              }
              if (parsed.links && Array.isArray(parsed.links)) {
                setLatestLinks(parsed.links);
              }
              currentEventType = "";
              continue;
            }

            // Legacy fallback: actions/links in default event
            if (parsed.actions && Array.isArray(parsed.actions)) {
              setLatestActions(parsed.actions);
              if (parsed.links && Array.isArray(parsed.links)) {
                setLatestLinks(parsed.links);
              }
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
    setLatestLinks([]);
    sendMessage(value);
  };

  const handleClearConversation = useCallback(async () => {
    await resetConversation();
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
          {/* Compact header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => navigate("/dashboard")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <h1 className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                  DOORai
                </h1>
              </div>
            </div>
            {messages.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={handleClearConversation}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Messages */}
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
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
                    <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-p:leading-relaxed prose-headings:mt-3 prose-headings:mb-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0">
                      <ReactMarkdown>{normalizeMarkdown(message.content)}</ReactMarkdown>
                    </div>
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

          {/* Suggestions */}
          {latestActions.length > 0 && (
            <div className="px-5 pb-2">
              <ChatSuggestions actions={latestActions} onActionClick={handleActionClick} disabled={isLoading} />
            </div>
          )}

          {/* Link chips (server-side, not in LLM output) */}
          {latestLinks.length > 0 && (
            <div className="px-5 pb-2">
              <div className="flex flex-wrap gap-2">
                {latestLinks.map((link, i) => (
                  <Link
                    key={i}
                    to={link.href.startsWith("http") ? link.href : link.href}
                    target={link.href.startsWith("http") ? "_blank" : undefined}
                    rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="px-3 py-1.5 text-xs rounded-full border border-muted-foreground/30 text-muted-foreground hover:text-foreground hover:border-foreground/50 transition-colors inline-flex items-center gap-1"
                  >
                    {link.label}
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="px-5 pb-4 pt-2 border-t border-border">
            <form onSubmit={handleSubmit} className="flex gap-2 items-center">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Stel je vraag..."
                disabled={isLoading}
                className="flex-1 h-9 text-sm rounded-xl"
              />
              <Button type="submit" size="sm" disabled={isLoading || !input.trim()} className="h-9 w-9 p-0 rounded-xl">
                <Send className="h-3.5 w-3.5" />
              </Button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
