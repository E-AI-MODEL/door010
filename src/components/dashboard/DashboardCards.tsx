import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  User, 
  MapPin, 
  ExternalLink 
} from "lucide-react";
import type { OrientationPhase } from "@/data/dashboard-phases";

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  current_phase: OrientationPhase;
  preferred_sector: string | null;
}

interface WelcomeHeaderProps {
  profile: Profile | null;
  onSignOut: () => void;
}

export function WelcomeHeader({ profile, onSignOut }: WelcomeHeaderProps) {
  return (
    <section className="bg-primary py-6">
      <div className="container">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 rounded-full p-3">
              <User className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-primary-foreground">
                Welkom{profile?.first_name ? `, ${profile.first_name}` : ""}!
              </h1>
              <p className="text-primary-foreground/80 text-sm">
                {profile?.preferred_sector ? `Interesse: ${profile.preferred_sector}` : "Je oriëntatie naar het onderwijs"}
              </p>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={onSignOut}>
            Uitloggen
          </Button>
        </div>
      </div>
    </section>
  );
}

interface ProfileCardProps {
  profile: Profile | null;
  phaseTitle: string;
}

export function ProfileCard({ profile, phaseTitle }: ProfileCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-3xl border bg-card shadow-door p-6"
    >
      <h2 className="text-xs font-semibold tracking-wide uppercase text-muted-foreground mb-5">
        Mijn profiel
      </h2>

      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 rounded-full p-2.5">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {profile?.first_name
                ? `${profile.first_name}${profile.last_name ? ` ${profile.last_name}` : ""}`
                : "Niet ingevuld"}
            </p>
            <p className="text-xs text-muted-foreground">Naam</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-muted/50 p-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1">Sector</p>
            <p className="text-sm font-medium text-foreground">
              {profile?.preferred_sector ? profile.preferred_sector.toUpperCase() : "Onbekend"}
            </p>
          </div>
          <div className="rounded-xl bg-muted/50 p-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1">Fase</p>
            <p className="text-sm font-medium text-primary">{phaseTitle}</p>
          </div>
        </div>
      </div>

      <Button variant="outline" size="sm" className="w-full mt-5 rounded-xl" asChild>
        <Link to="/profile">
          Profiel bewerken
        </Link>
      </Button>

      <div className="mt-4 pt-3 border-t border-border">
        <div className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 text-primary" />
          <a
            href="https://www.onderwijsloketrotterdam.nl"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-xs text-primary hover:underline"
          >
            Onderwijsloket Rotterdam
            <ExternalLink className="ml-1 h-3 w-3" />
          </a>
        </div>
      </div>
    </motion.div>
  );
}
