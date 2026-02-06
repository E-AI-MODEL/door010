import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  ArrowRight, 
  MessageCircle, 
  User, 
  BookOpen, 
  Briefcase, 
  Calendar,
  ChevronRight
} from "lucide-react";

type OrientationPhase = 'interesseren' | 'orienteren' | 'beslissen' | 'matchen' | 'voorbereiden';

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  current_phase: OrientationPhase;
  preferred_sector: string | null;
}

const phaseInfo: Record<OrientationPhase, { title: string; description: string; icon: React.ReactNode }> = {
  interesseren: {
    title: "Interesseren",
    description: "Je verkent of het onderwijs iets voor jou is",
    icon: <BookOpen className="h-5 w-5" />,
  },
  orienteren: {
    title: "Oriënteren",
    description: "Je onderzoekt de verschillende routes en mogelijkheden",
    icon: <BookOpen className="h-5 w-5" />,
  },
  beslissen: {
    title: "Beslissen",
    description: "Je maakt keuzes over je route naar het leraarschap",
    icon: <BookOpen className="h-5 w-5" />,
  },
  matchen: {
    title: "Matchen",
    description: "Je zoekt een school of opleiding die bij je past",
    icon: <Briefcase className="h-5 w-5" />,
  },
  voorbereiden: {
    title: "Voorbereiden",
    description: "Je bereidt je voor op de start van je opleiding of baan",
    icon: <Calendar className="h-5 w-5" />,
  },
};

const phases: OrientationPhase[] = ['interesseren', 'orienteren', 'beslissen', 'matchen', 'voorbereiden'];

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
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Laden...</p>
      </div>
    );
  }

  if (!user) return null;

  const currentPhase = profile?.current_phase || 'interesseren';
  const currentPhaseIndex = phases.indexOf(currentPhase);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Welcome section */}
        <section className="bg-primary py-8 md:py-12">
          <div className="container">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-primary-foreground">
                  Welkom{profile?.first_name ? `, ${profile.first_name}` : ""}!
                </h1>
                <p className="text-primary-foreground/90 mt-1">
                  Je bent in de fase: <strong>{phaseInfo[currentPhase].title}</strong>
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={handleSignOut}>
                Uitloggen
              </Button>
            </div>
          </div>
        </section>

        {/* Phase progress */}
        <section className="py-6 bg-muted border-b border-border">
          <div className="container">
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {phases.map((phase, index) => (
                <div
                  key={phase}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                    index <= currentPhaseIndex
                      ? "bg-primary text-primary-foreground"
                      : "bg-white text-muted-foreground border border-border"
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">
                    {index + 1}
                  </span>
                  {phaseInfo[phase].title}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Main content */}
        <section className="py-8 md:py-12">
          <div className="container">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* DOORai Chat */}
              <div className="bg-white border border-border rounded-lg p-6 hover:border-primary/30 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 rounded-full p-3">
                    <MessageCircle className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-foreground mb-2">
                      Praat met DOORai
                    </h2>
                    <p className="text-muted-foreground text-sm mb-4">
                      Jouw persoonlijke assistent helpt je door elke fase van je oriëntatie.
                    </p>
                    <Button asChild>
                      <a href="/chat">
                        Start gesprek
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Profile */}
              <div className="bg-white border border-border rounded-lg p-6 hover:border-primary/30 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 rounded-full p-3">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-foreground mb-2">
                      Mijn profiel
                    </h2>
                    <p className="text-muted-foreground text-sm mb-4">
                      Bekijk en bewerk je gegevens en voorkeuren.
                    </p>
                    <Button variant="outline" asChild>
                      <a href="/profile">
                        Bekijk profiel
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Current phase info */}
            <div className="mt-8 bg-muted rounded-lg p-6">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {phaseInfo[currentPhase].title}
              </h3>
              <p className="text-muted-foreground mb-4">
                {phaseInfo[currentPhase].description}
              </p>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" size="sm" asChild>
                  <a href="/kennisbank">Kennisbank bekijken</a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href="/opleidingen">Opleidingen bekijken</a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href="/events">Agenda bekijken</a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
