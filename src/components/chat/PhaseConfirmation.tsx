import { Button } from "@/components/ui/button";
import { ArrowRight, RotateCcw } from "lucide-react";

interface PhaseConfirmationProps {
  from: string;
  to: string;
  message: string;
  onAccept: () => void;
  onDecline: () => void;
  compact?: boolean;
}

const PHASE_LABELS: Record<string, string> = {
  interesseren: "Interesseren",
  orienteren: "Oriënteren",
  beslissen: "Beslissen",
  matchen: "Matchen",
  voorbereiden: "Voorbereiden",
};

export function PhaseConfirmation({ from, to, message, onAccept, onDecline, compact }: PhaseConfirmationProps) {
  return (
    <div className={`rounded-xl border border-primary/20 bg-primary/5 ${compact ? "p-3" : "p-4"}`}>
      <p className={`${compact ? "text-xs" : "text-sm"} text-foreground mb-3`}>{message}</p>
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={onAccept}
          className={`${compact ? "h-7 text-xs" : "h-8 text-sm"} gap-1`}
        >
          <ArrowRight className="h-3 w-3" />
          Ja, door naar {PHASE_LABELS[to] || to}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onDecline}
          className={`${compact ? "h-7 text-xs" : "h-8 text-sm"} gap-1 text-muted-foreground`}
        >
          <RotateCcw className="h-3 w-3" />
          Nog even {PHASE_LABELS[from]?.toLowerCase() || from}
        </Button>
      </div>
    </div>
  );
}
