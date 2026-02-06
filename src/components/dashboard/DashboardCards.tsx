import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  User, 
  MessageCircle, 
  ArrowRight, 
  MapPin, 
  ExternalLink 
} from "lucide-react";
import type { OrientationPhase, PhaseInfo } from "@/data/dashboard-phases";
import { quickLinks } from "@/data/dashboard-phases";

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

export function DOORaiCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-gradient-to-r from-primary to-primary/80 rounded-lg p-5 text-primary-foreground"
    >
      <div className="flex items-start gap-4">
        <div className="bg-white/20 rounded-full p-3 shrink-0">
          <MessageCircle className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-lg mb-1">Praat met DOORai</h3>
          <p className="text-primary-foreground/90 text-sm mb-3">
            Je persoonlijke assistent helpt je met vragen over routes, bevoegdheden en vacatures.
          </p>
          <Button variant="secondary" size="sm" asChild>
            <Link to="/chat">
              Start gesprek
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

export function QuickLinksCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="bg-card rounded-lg border border-border p-4"
    >
      <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">
        Snelle links
      </h3>
      <div className="space-y-2">
        {quickLinks.map((link, index) => (
          <Link
            key={index}
            to={link.href}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors group"
          >
            <link.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
            <span className="text-sm text-foreground group-hover:text-primary">
              {link.label}
            </span>
            <ArrowRight className="h-3 w-3 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        ))}
      </div>
    </motion.div>
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
    </motion.div>
  );
}

export function RotterdamInfoCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="bg-muted/50 rounded-lg border border-border p-4"
    >
      <div className="flex items-center gap-2 mb-2">
        <MapPin className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">
          Regio Rotterdam
        </h3>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Ontdek vacatures en events in jouw regio.
      </p>
      <a
        href="https://www.onderwijsloketrotterdam.nl"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center text-xs text-primary hover:underline"
      >
        Onderwijsloket Rotterdam
        <ExternalLink className="ml-1 h-3 w-3" />
      </a>
    </motion.div>
  );
}
