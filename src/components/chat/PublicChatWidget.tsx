import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, X, Send, ArrowRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/contexts/AuthContext";

interface Message {
  role: "user" | "assistant";
  content: string;
  quickReplies?: string[];
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/homepage-coach`;

// Context-aware quick reply pools
const QUICK_REPLY_POOLS = {
  initial: [
    "Ik wil leraar worden",
    "Welke sector past bij mij?",
    "Ik werk al, kan ik overstappen?",
  ],
  opleidingen: [
    "Hoe lang duurt een opleiding?",
    "Wat kost het?",
    "Kan ik parttime studeren?",
  ],
  vacatures: [
    "In welke wijken zijn vacatures?",
    "Hoeveel verdient een leraar?",
    "Kan ik stage lopen?",
  ],
  events: [
    "Wanneer is de volgende open dag?",
    "Zijn er webinars?",
    "Kan ik vrijblijvend langskomen?",
  ],
  sector: [
    "Basisonderwijs (PO)",
    "Middelbare school (VO)",
    "Beroepsonderwijs (MBO)",
  ],
  routes: [
    "Hoe werkt zij-instroom?",
    "Wat is een leraar-in-opleiding?",
    "Welke diploma's heb ik nodig?",
  ],
  account: [
    "Wat kan Doortje voor mij doen?",
    "Is een account gratis?",
    "Bekijk de kennisbank",
  ],
  general: [
    "Vertel meer over jullie",
    "Ik heb nog een vraag",
    "Bedankt!",
  ],
};

// Smart reply detection based on response content AND links mentioned
function detectQuickReplies(content: string): string[] {
  const lowerContent = content.toLowerCase();
  const replies: string[] = [];
  
  // Check which links/topics are mentioned
  const mentionsOpleidingen = lowerContent.includes("/opleidingen") || lowerContent.includes("opleiding");
  const mentionsVacatures = lowerContent.includes("/vacatures") || lowerContent.includes("vacatur");
  const mentionsEvents = lowerContent.includes("/events") || lowerContent.includes("evenement") || lowerContent.includes("open dag");
  const mentionsAccount = lowerContent.includes("/auth") || lowerContent.includes("account") || lowerContent.includes("doortje");
  const mentionsSector = lowerContent.includes("sector") || lowerContent.includes("basisonderwijs") || lowerContent.includes("voortgezet");
  const mentionsRoutes = lowerContent.includes("zij-instroom") || lowerContent.includes("route") || lowerContent.includes("traject");
  
  // Add contextual follow-ups (pick 1 from each relevant category, max 3 total)
  if (mentionsOpleidingen && replies.length < 3) {
    replies.push(QUICK_REPLY_POOLS.opleidingen[Math.floor(Math.random() * QUICK_REPLY_POOLS.opleidingen.length)]);
  }
  if (mentionsVacatures && replies.length < 3) {
    replies.push(QUICK_REPLY_POOLS.vacatures[Math.floor(Math.random() * QUICK_REPLY_POOLS.vacatures.length)]);
  }
  if (mentionsEvents && replies.length < 3) {
    replies.push(QUICK_REPLY_POOLS.events[Math.floor(Math.random() * QUICK_REPLY_POOLS.events.length)]);
  }
  if (mentionsSector && replies.length < 3) {
    replies.push(QUICK_REPLY_POOLS.sector[Math.floor(Math.random() * QUICK_REPLY_POOLS.sector.length)]);
  }
  if (mentionsRoutes && replies.length < 3) {
    replies.push(QUICK_REPLY_POOLS.routes[Math.floor(Math.random() * QUICK_REPLY_POOLS.routes.length)]);
  }
  if (mentionsAccount && replies.length < 3) {
    replies.push(QUICK_REPLY_POOLS.account[Math.floor(Math.random() * QUICK_REPLY_POOLS.account.length)]);
  }
  
  // If we still need more, add general options
  while (replies.length < 3) {
    const generalOption = QUICK_REPLY_POOLS.general[Math.floor(Math.random() * QUICK_REPLY_POOLS.general.length)];
    if (!replies.includes(generalOption)) {
      replies.push(generalOption);
    }
  }
  
  return replies.slice(0, 3);
}

export function PublicChatWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Hoi! 👋 Ik ben DOORai, je gids op deze website. Wat wil je weten of waar kan ik je mee helpen?`,
      quickReplies: QUICK_REPLY_POOLS.initial,
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Listen for custom event to open chat from header DOORai hint
  useEffect(() => {
    const handleOpenChat = () => {
      setIsOpen(true);
    };

    window.addEventListener('openDOORaiChat', handleOpenChat);
    return () => {
      window.removeEventListener('openDOORaiChat', handleOpenChat);
    };
  }, []);

  const handleQuickReply = (text: string) => {
    setInput(text);
    sendMessageWithText(text);
  };

  const sendMessageWithText = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setShowQuickReplies(false);

    let assistantContent = "";

    try {
      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          mode: "public",
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to get response");
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
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
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

      // Use smart detection for contextual quick replies
      const quickReplies = detectQuickReplies(assistantContent);

      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          quickReplies,
        };
        return updated;
      });
      setShowQuickReplies(true);

    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, er ging iets mis. Probeer het later opnieuw.",
          quickReplies: QUICK_REPLY_POOLS.initial,
        },
      ]);
      setShowQuickReplies(true);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    sendMessageWithText(input);
  };

  const latestQuickReplies = messages[messages.length - 1]?.quickReplies;

  if (user) {
    return null;
  }

  return (
    <>
      {/* Floating button - more rounded */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 bg-[hsl(152,100%,33%)] text-white rounded-full p-4 shadow-lg hover:bg-[hsl(152,100%,28%)] transition-colors"
          >
            <MessageCircle className="h-6 w-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat window - more rounded corners */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)] bg-white rounded-3xl shadow-2xl border border-border overflow-hidden flex flex-col"
            style={{ height: "520px", maxHeight: "calc(100vh - 6rem)" }}
          >
            {/* Header - matching green, rounded top */}
            <div className="bg-[hsl(152,100%,33%)] text-white p-4 flex items-center justify-between shrink-0 rounded-t-3xl">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 rounded-full p-2">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">DOORai</h3>
                  <p className="text-xs text-white/80">
                    Je gids naar het onderwijs
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message, index) => (
                <div key={index}>
                  <div
                    className={`flex ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
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
                              a: ({ href, children }) => (
                                <Link
                                  to={href || "#"}
                                  className="text-[hsl(152,100%,33%)] hover:underline inline-flex items-center gap-1"
                                  onClick={() => setIsOpen(false)}
                                >
                                  {children}
                                  <ExternalLink className="h-3 w-3" />
                                </Link>
                              ),
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
                      <span
                        className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      />
                      <span
                        className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Quick reply buttons - more rounded, matching green */}
              {showQuickReplies && latestQuickReplies && !isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-wrap gap-2 pt-2"
                >
                  {latestQuickReplies.map((reply, index) => (
                    <button
                      key={index}
                      onClick={() => handleQuickReply(reply)}
                      className="px-3 py-1.5 text-sm bg-white border border-[hsl(152,100%,33%)]/30 text-[hsl(152,100%,33%)] rounded-full hover:bg-[hsl(152,100%,33%)]/10 transition-colors"
                    >
                      {reply}
                    </button>
                  ))}
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Login prompt */}
            <div className="px-4 py-2.5 bg-muted/50 border-t border-border shrink-0">
              <Link
                to="/auth"
                className="flex items-center justify-center gap-2 text-sm text-[hsl(152,100%,33%)] hover:underline font-medium"
                onClick={() => setIsOpen(false)}
              >
                <ArrowRight className="h-4 w-4" />
                Log in voor persoonlijke begeleiding
              </Link>
            </div>

            {/* Input - more rounded */}
            <form
              onSubmit={sendMessage}
              className="p-4 border-t border-border shrink-0"
            >
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Stel je vraag..."
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
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
