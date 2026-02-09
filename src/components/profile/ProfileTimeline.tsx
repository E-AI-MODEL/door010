import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, Lock, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { phases, phaseData, type OrientationPhase } from "@/data/dashboard-phases";
import { Badge } from "@/components/ui/badge";

interface ProfileTimelineProps {
  userId: string;
  currentPhase: OrientationPhase | null;
  preferredSector: string | null;
  testCompleted: boolean;
}

const sectorLabels: Record<string, string> = {
  po: "PO - Primair Onderwijs",
  vo: "VO - Voortgezet Onderwijs",
  mbo: "MBO",
  so: "SO - Speciaal Onderwijs",
  onbekend: "Nog onbekend",
};

export function ProfileTimeline({ userId, currentPhase, preferredSector, testCompleted }: ProfileTimelineProps) {
  const [conversationCount, setConversationCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      const { count } = await supabase
        .from("conversations")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);
      setConversationCount(count || 0);
    };
    fetchCount();
  }, [userId]);

  const currentIndex = currentPhase ? phases.indexOf(currentPhase) : 0;

  const getStatus = (index: number) => {
    if (index < currentIndex) return "completed";
    if (index === currentIndex) return "active";
    return "locked";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-3xl border bg-card shadow-door p-6"
    >
      <h2 className="text-xs font-semibold tracking-wide uppercase text-muted-foreground mb-6">
        Jouw oriëntatietraject
      </h2>

      <div className="relative">
        {phases.map((phase, index) => {
          const status = getStatus(index);
          const data = phaseData[phase];
          const isLast = index === phases.length - 1;

          return (
            <motion.div
              key={phase}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * index }}
              className="relative flex gap-4"
            >
              {/* Vertical line + node */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    status === "completed"
                      ? "bg-primary text-primary-foreground"
                      : status === "active"
                      ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {status === "completed" ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : status === "active" ? (
                    <Circle className="h-4 w-4 fill-current" />
                  ) : (
                    <Lock className="h-3.5 w-3.5" />
                  )}
                </div>
                {!isLast && (
                  <div
                    className={`w-0.5 flex-1 min-h-[24px] ${
                      status === "completed" ? "bg-primary" : "bg-border"
                    }`}
                  />
                )}
              </div>

              {/* Content */}
              <div className={`pb-6 ${status === "locked" ? "opacity-50" : ""}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`font-semibold text-sm ${status === "active" ? "text-primary" : "text-foreground"}`}>
                    {data.title}
                  </span>
                  {status === "active" && (
                    <Badge className="bg-primary/15 text-primary border-0 text-[10px] py-0">
                      Huidige fase
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-2">{data.subtitle}</p>

                {/* Dynamic info for active phase */}
                {status === "active" && (
                  <div className="space-y-1.5 mt-2 pl-3 border-l-2 border-primary/20">
                    <div className="flex items-center gap-1.5 text-xs text-foreground">
                      <MessageCircle className="h-3 w-3 text-primary" />
                      <span>{conversationCount} gesprek{conversationCount !== 1 ? "ken" : ""} gevoerd</span>
                    </div>
                    {preferredSector && (
                      <p className="text-xs text-foreground">
                        Sector: <span className="font-medium">{sectorLabels[preferredSector] || preferredSector}</span>
                      </p>
                    )}
                    {testCompleted && (
                      <p className="text-xs text-primary font-medium">✓ Interessetest voltooid</p>
                    )}
                    {data.tips[0] && (
                      <p className="text-xs text-muted-foreground italic">
                        💡 {data.tips[0]}
                      </p>
                    )}
                  </div>
                )}

                {/* Brief summary for completed */}
                {status === "completed" && (
                  <p className="text-xs text-primary font-medium">✓ Afgerond</p>
                )}

                {/* Preview for locked */}
                {status === "locked" && data.tips[0] && (
                  <p className="text-[11px] text-muted-foreground italic">
                    {data.subtitle}
                  </p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
