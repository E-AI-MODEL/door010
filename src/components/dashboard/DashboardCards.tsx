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
      className="bg-card rounded-lg border border-border p-4"
    >
      <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">
        Mijn profiel
      </h3>
      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Naam</span>
          <span className="font-medium text-foreground">
            {profile?.first_name || "Niet ingevuld"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Sector</span>
          <span className="font-medium text-foreground">
            {profile?.preferred_sector || "Nog niet gekozen"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Fase</span>
          <span className="font-medium text-primary">{phaseTitle}</span>
        </div>
      </div>
      <Button variant="outline" size="sm" className="w-full mt-4" asChild>
        <Link to="/profile">
          Profiel bewerken
        </Link>
      </Button>

      {/* Rotterdam info compact */}
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
