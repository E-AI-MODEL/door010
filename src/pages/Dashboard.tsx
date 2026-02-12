import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PhaseCard } from "@/components/dashboard/PhaseCard";
import { PhaseProgress } from "@/components/dashboard/PhaseProgress";
import { WelcomeHeader, ProfileCard } from "@/components/dashboard/DashboardCards";
import { ProfileTimeline } from "@/components/profile/ProfileTimeline";
import { DashboardChat } from "@/components/dashboard/DashboardChat";
import { phaseData, type OrientationPhase } from "@/data/dashboard-phases";

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  current_phase: OrientationPhase;
  preferred_sector: string | null;
  test_completed: boolean | null;
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
  const phaseInfo = phaseData[currentPhase];

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Header />
      <main className="flex-1">
        <WelcomeHeader profile={profile} onSignOut={handleSignOut} />
        <PhaseProgress currentPhase={currentPhase} />

        <div className="container py-6 md:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left column - Timeline + Phase + Profile */}
            <div className="lg:col-span-2 space-y-6">
              <ProfileTimeline
                userId={user.id}
                currentPhase={currentPhase}
                preferredSector={profile?.preferred_sector || null}
                testCompleted={profile?.test_completed || false}
              />
              <PhaseCard phaseInfo={phaseInfo} />
              <ProfileCard profile={profile} phaseTitle={phaseInfo.title} />
            </div>

            {/* Right column - Inline chat */}
            <div className="lg:col-span-3">
              <div className="lg:sticky lg:top-6">
                <DashboardChat
                  userId={user.id}
                  currentPhase={currentPhase}
                  preferredSector={profile?.preferred_sector || null}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
