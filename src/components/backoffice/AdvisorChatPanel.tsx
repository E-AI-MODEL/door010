import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Send, 
  User, 
  X,
  MessageCircle,
  Clock,
  GraduationCap
} from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import type { ProfileWithEmail } from "./UserOverviewTable";

interface Message {
  id: string;
  role: 'advisor' | 'user' | 'ai';
  content: string;
  created_at: string;
}

// Mock conversation data - in production this would come from the database
const mockConversations: Record<string, Message[]> = {};

const generateMockMessages = (userId: string): Message[] => {
  const now = new Date();
  return [
    {
      id: '1',
      role: 'user',
      content: 'Hallo, ik heb een vraag over de opleiding tot leraar basisonderwijs.',
      created_at: new Date(now.getTime() - 3600000 * 24).toISOString(),
    },
    {
      id: '2',
      role: 'ai',
      content: 'Hallo! Leuk dat je interesse hebt in het basisonderwijs. Ik kan je daar meer over vertellen. Welk aspect van de opleiding zou je willen bespreken?',
      created_at: new Date(now.getTime() - 3600000 * 23).toISOString(),
    },
    {
      id: '3',
      role: 'user',
      content: 'Ik wil weten hoe lang de opleiding duurt en of er ook deeltijd mogelijkheden zijn.',
      created_at: new Date(now.getTime() - 3600000 * 2).toISOString(),
    },
  ];
};

interface AdvisorChatPanelProps {
  selectedUser: ProfileWithEmail | null;
  onClose: () => void;
}

export function AdvisorChatPanel({ selectedUser, onClose }: AdvisorChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedUser) {
      // Load mock messages for this user
      if (!mockConversations[selectedUser.user_id]) {
        mockConversations[selectedUser.user_id] = generateMockMessages(selectedUser.user_id);
      }
      setMessages(mockConversations[selectedUser.user_id]);
    }
  }, [selectedUser]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedUser) return;

    setSending(true);
    
    const advisorMessage: Message = {
      id: Date.now().toString(),
      role: 'advisor',
      content: newMessage,
      created_at: new Date().toISOString(),
    };

    const updatedMessages = [...messages, advisorMessage];
    setMessages(updatedMessages);
    mockConversations[selectedUser.user_id] = updatedMessages;
    setNewMessage("");
    setSending(false);
  };

  if (!selectedUser) {
    return (
      <Card className="h-full flex items-center justify-center bg-muted/20">
        <div className="text-center p-8">
          <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-medium text-foreground mb-2">Selecteer een kandidaat</h3>
          <p className="text-sm text-muted-foreground">
            Klik op een kandidaat in de lijst om het gesprek te bekijken en berichten te sturen.
          </p>
        </div>
      </Card>
    );
  }

  const phaseLabels: Record<string, string> = {
    interesseren: 'Interesseren',
    orienteren: 'Oriënteren',
    beslissen: 'Beslissen',
    matchen: 'Matchen',
    voorbereiden: 'Voorbereiden',
  };

  return (
    <Card className="h-full flex flex-col">
      {/* Header */}
      <CardHeader className="border-b border-border pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 rounded-full p-2">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">
                {selectedUser.first_name && selectedUser.last_name 
                  ? `${selectedUser.first_name} ${selectedUser.last_name}`
                  : selectedUser.email || 'Onbekende gebruiker'}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                {selectedUser.current_phase && (
                  <Badge variant="outline" className="text-xs">
                    <GraduationCap className="h-3 w-3 mr-1" />
                    {phaseLabels[selectedUser.current_phase] || selectedUser.current_phase}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Lid sinds {format(new Date(selectedUser.created_at), 'd MMM yyyy', { locale: nl })}
                </span>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      {/* Messages */}
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-[400px] p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nog geen berichten met deze kandidaat.</p>
                <p className="text-sm mt-1">Start het gesprek door een bericht te sturen.</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'advisor' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      message.role === 'advisor'
                        ? 'bg-primary text-primary-foreground'
                        : message.role === 'ai'
                        ? 'bg-accent/10 text-foreground border border-accent/20'
                        : 'bg-muted text-foreground'
                    }`}
                  >
                    {message.role === 'ai' && (
                      <p className="text-xs text-accent font-medium mb-1">DOORai</p>
                    )}
                    <p className="text-sm">{message.content}</p>
                    <p className={`text-xs mt-1 ${
                      message.role === 'advisor' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    }`}>
                      {format(new Date(message.created_at), 'HH:mm', { locale: nl })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>

      {/* Input */}
      <div className="border-t border-border p-4">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex gap-2"
        >
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Typ een bericht naar de kandidaat..."
            disabled={sending}
            className="flex-1"
          />
          <Button type="submit" disabled={sending || !newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
        <p className="text-xs text-muted-foreground mt-2">
          💡 Dit bericht wordt direct zichtbaar voor de kandidaat in hun DOORai chat.
        </p>
      </div>
    </Card>
  );
}
