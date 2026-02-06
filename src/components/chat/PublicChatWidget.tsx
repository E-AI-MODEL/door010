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

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/doorai-chat`;

// Quick reply suggestions - focused doorvragen
const INITIAL_QUICK_REPLIES = [
  "Ik wil leraar worden",
  "Welke sector past bij mij?",
  "Ik werk al, kan ik overstappen?",
];

const FOLLOW_UP_REPLIES: Record<string, string[]> = {
  sector: [
    "Basisonderwijs (PO)",
    "Middelbare school (VO)",
    "Beroepsonderwijs (MBO)",
  ],
  background: [
    "Ik heb een hbo/wo diploma",
    "Ik heb werkervaring",
    "Ik wil studeren",
  ],
  routes: [
    "Zij-instroom, hoe werkt dat?",
    "Kan ik leren en werken combineren?",
  ],
  practical: [
    "Waar vind ik vacatures?",
    "Hoe zit het met salaris?",
  ],
  next: [
    "Wat is mijn volgende stap?",
    "Ik wil een account maken",
  ],
};

export function PublicChatWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Hoi! 👋 Ik ben DOORai, je gids op deze website. Wat wil je weten of waar kan ik je mee helpen?`,
      quickReplies: INITIAL_QUICK_REPLIES,
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

      const lowerContent = assistantContent.toLowerCase();
      let quickReplies = FOLLOW_UP_REPLIES.next;
      
      if (lowerContent.includes("sector") || lowerContent.includes("leeftijd") || lowerContent.includes("groep")) {
        quickReplies = FOLLOW_UP_REPLIES.sector;
      } else if (lowerContent.includes("diploma") || lowerContent.includes("achtergrond") || lowerContent.includes("opleiding")) {
        quickReplies = FOLLOW_UP_REPLIES.background;
      } else if (lowerContent.includes("zij-instroom") || lowerContent.includes("route") || lowerContent.includes("traject")) {
        quickReplies = FOLLOW_UP_REPLIES.routes;
      } else if (lowerContent.includes("vacature") || lowerContent.includes("salaris") || lowerContent.includes("verdien")) {
        quickReplies = FOLLOW_UP_REPLIES.practical;
      }

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
          quickReplies: INITIAL_QUICK_REPLIES,
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
