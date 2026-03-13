import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PhaseProgress } from "@/components/dashboard/PhaseProgress";
import { ProfileCard } from "@/components/dashboard/DashboardCards";
import { TopicMenu } from "@/components/dashboard/TopicMenu";
import { phaseData, type OrientationPhase } from "@/data/dashboard-phases";
import type { KnownSlots } from "@/utils/phaseDetectorEngine";

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  current_phase: OrientationPhase;
  preferred_sector: string | null;
  test_completed: boolean | null;
  test_results: unknown;
  bio: string | null;
  phone: string | null;
  known_slots: Record<string, string> | null;
}

function parseKnownSlots(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "string") result[k] = v;
  }
  return result;
}

export default function Dashboard() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth?redirect=dashboard");
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
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile:", error);
      }
      setProfile(data ? { ...data, known_slots: parseKnownSlots(data.known_slots) } : null);
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
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

  const currentPhase = profile?.current_phase || "interesseren";
  const phaseInfo = phaseData[currentPhase];
  const knownSlots: KnownSlots = profile?.known_slots || {};

  // Send message to the global overlay via custom event
  const handleTopicMessage = (message: string) => {
    window.dispatchEvent(new CustomEvent("doorai-send-message", { detail: { message } }));
  };

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Header />
      <main className="flex-1">
        <PhaseProgress currentPhase={currentPhase} />

        <div className="container py-4 md:py-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
            {/* Sidebar: TopicMenu + ProfileCard */}
            <div className="lg:col-span-4 xl:col-span-3 space-y-4">
              <TopicMenu
                currentPhase={currentPhase}
                knownSlots={knownSlots}
                onSendMessage={handleTopicMessage}
                collapsed
              />
              {/* ProfileCard: hidden on mobile, compact on desktop */}
              <div className="hidden lg:block">
                <ProfileCard profile={profile} phaseTitle={phaseInfo.title} />
              </div>
            </div>

            {/* Main content area — now shows a prompt to use the chat overlay */}
            <div className="lg:col-span-8 xl:col-span-9">
              <div className="rounded-3xl border bg-card shadow-sm p-8 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">DOORai staat voor je klaar</h2>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Kies een onderwerp uit het menu of klik op de chatknop rechtsonder om een gesprek te starten.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
