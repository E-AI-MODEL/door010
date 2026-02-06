import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { 
  ArrowRight, 
  MessageCircle, 
  User, 
  BookOpen, 
  Briefcase, 
  Calendar,
  GraduationCap,
  Target,
  Lightbulb,
  CheckCircle2,
  Clock,
  MapPin,
  ExternalLink
} from "lucide-react";

type OrientationPhase = 'interesseren' | 'orienteren' | 'beslissen' | 'matchen' | 'voorbereiden';

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  current_phase: OrientationPhase;
  preferred_sector: string | null;
}

const phaseData: Record<OrientationPhase, {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  color: string;
  actions: Array<{ label: string; href: string; icon: React.ElementType; description: string }>;
  tips: string[];
}> = {
  interesseren: {
    title: "Interesseren",
    subtitle: "Ontdek of het onderwijs bij je past",
    icon: Lightbulb,
    color: "bg-amber-500",
    actions: [
      { label: "Praat met DOORai", href: "/chat", icon: MessageCircle, description: "Stel je eerste vragen" },
      { label: "Bekijk sectoren", href: "/kennisbank", icon: BookOpen, description: "PO, VO of MBO?" },
      { label: "Open dagen", href: "/events", icon: Calendar, description: "Bezoek een school" },
    ],
    tips: [
      "Loop een dag mee op een school",
      "Praat met leraren over hun werk",
      "Bedenk welke leeftijdsgroep je aanspreekt",
    ],
  },
  orienteren: {
    title: "Oriënteren",
    subtitle: "Onderzoek de routes naar het leraarschap",
    icon: Target,
    color: "bg-blue-500",
    actions: [
      { label: "Routes bekijken", href: "/opleidingen", icon: GraduationCap, description: "Pabo, zij-instroom, PDG..." },
      { label: "Bespreek met DOORai", href: "/chat", icon: MessageCircle, description: "Welke route past bij mij?" },
      { label: "Kennisbank", href: "/kennisbank", icon: BookOpen, description: "Bevoegdheden uitgelegd" },
    ],
    tips: [
      "Vergelijk voltijd, deeltijd en zij-instroom",
      "Check of je vooropleiding voldoet",
      "Bekijk de duur en kosten per route",
    ],
  },
  beslissen: {
    title: "Beslissen",
    subtitle: "Maak je keuze voor een route",
    icon: CheckCircle2,
    color: "bg-primary",
    actions: [
      { label: "Opleidingen vergelijken", href: "/opleidingen", icon: GraduationCap, description: "Maak je keuze" },
      { label: "Subsidies bekijken", href: "/kennisbank", icon: BookOpen, description: "Financiering opties" },
      { label: "DOORai advies", href: "/chat", icon: MessageCircle, description: "Laatste twijfels bespreken" },
    ],
    tips: [
      "Vraag naar startmomenten bij opleidingen",
      "Bekijk subsidiemogelijkheden",
      "Vraag ervaringen aan huidige studenten",
    ],
  },
  matchen: {
    title: "Matchen",
    subtitle: "Vind de juiste school of opleiding",
    icon: Briefcase,
    color: "bg-purple-500",
    actions: [
      { label: "Vacatures bekijken", href: "/vacatures", icon: Briefcase, description: "Scholen in Rotterdam" },
      { label: "Events & banenmarkten", href: "/events", icon: Calendar, description: "Ontmoet werkgevers" },
      { label: "Sollicitatietips", href: "/kennisbank", icon: BookOpen, description: "Bereid je voor" },
    ],
    tips: [
      "Schrijf je in bij meerdere scholen",
      "Bezoek banenmarkten en open dagen",
      "Bereid een sterke motivatie voor",
    ],
  },
  voorbereiden: {
    title: "Voorbereiden",
    subtitle: "Klaar voor de start!",
    icon: GraduationCap,
    color: "bg-emerald-500",
    actions: [
      { label: "Praktische zaken", href: "/kennisbank", icon: BookOpen, description: "Wat moet je regelen?" },
      { label: "Contact onderhouden", href: "/chat", icon: MessageCircle, description: "Laatste vragen?" },
      { label: "Agenda", href: "/events", icon: Calendar, description: "Belangrijke data" },
    ],
    tips: [
      "Regel je inschrijving op tijd",
      "Vraag naar een inwerkprogramma",
      "Neem contact op met je toekomstige collega's",
    ],
  },
};

const phases: OrientationPhase[] = ['interesseren', 'orienteren', 'beslissen', 'matchen', 'voorbereiden'];

const quickLinks = [
  { label: "Vacatures Rotterdam", href: "/vacatures", icon: Briefcase },
  { label: "Agenda & Events", href: "/events", icon: Calendar },
  { label: "Opleidingen", href: "/opleidingen", icon: GraduationCap },
  { label: "Kennisbank", href: "/kennisbank", icon: BookOpen },
];

export default function Dashboard() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Laden...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const currentPhase = profile?.current_phase || 'interesseren';
  const currentPhaseIndex = phases.indexOf(currentPhase);
  const phaseInfo = phaseData[currentPhase];
  const PhaseIcon = phaseInfo.icon;

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Header />
      <main className="flex-1">
        {/* Compact welcome header */}
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
              <Button variant="secondary" size="sm" onClick={handleSignOut}>
                Uitloggen
              </Button>
            </div>
          </div>
        </section>

        {/* Phase progress - compact */}
        <section className="bg-white border-b border-border py-4">
          <div className="container">
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              {phases.map((phase, index) => {
                const isActive = index === currentPhaseIndex;
                const isCompleted = index < currentPhaseIndex;
                const data = phaseData[phase];
                
                return (
                  <div key={phase} className="flex items-center">
                    <div
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : isCompleted
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isActive ? "bg-white/30" : isCompleted ? "bg-primary/30" : "bg-muted-foreground/20"
                      }`}>
                        {isCompleted ? "✓" : index + 1}
                      </span>
                      <span className="hidden sm:inline">{data.title}</span>
                    </div>
                    {index < phases.length - 1 && (
                      <div className={`w-4 h-0.5 mx-1 ${isCompleted ? "bg-primary/40" : "bg-border"}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <div className="container py-6 md:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main content - left 2 columns */}
            <div className="lg:col-span-2 space-y-6">
              {/* Current phase card */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg border border-border overflow-hidden"
              >
                <div className={`${phaseInfo.color} p-4 flex items-center gap-4`}>
                  <div className="bg-white/20 rounded-full p-3">
                    <PhaseIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      Fase: {phaseInfo.title}
                    </h2>
                    <p className="text-white/90 text-sm">{phaseInfo.subtitle}</p>
                  </div>
                </div>
                
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">
                    Aanbevolen acties
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {phaseInfo.actions.map((action, index) => (
                      <Link
                        key={index}
                        to={action.href}
                        className="group flex flex-col p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all"
                      >
                        <action.icon className="h-5 w-5 text-primary mb-2" />
                        <span className="font-medium text-foreground text-sm group-hover:text-primary">
                          {action.label}
                        </span>
                        <span className="text-xs text-muted-foreground mt-0.5">
                          {action.description}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* DOORai prominent card */}
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

              {/* Tips for current phase */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-lg border border-border p-4"
              >
                <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">
                  Tips voor deze fase
                </h3>
                <div className="space-y-2">
                  {phaseInfo.tips.map((tip, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="bg-primary/10 rounded-full p-1 mt-0.5">
                        <CheckCircle2 className="h-3 w-3 text-primary" />
                      </div>
                      <span className="text-sm text-muted-foreground">{tip}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Sidebar - right column */}
            <div className="space-y-6">
              {/* Quick links */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-white rounded-lg border border-border p-4"
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

              {/* Profile card */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-lg border border-border p-4"
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
                    <span className="font-medium text-primary">{phaseInfo.title}</span>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full mt-4" asChild>
                  <Link to="/profile">
                    Profiel bewerken
                  </Link>
                </Button>
              </motion.div>

              {/* Rotterdam info */}
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
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
