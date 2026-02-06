import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PhaseCard, PhaseTips } from "@/components/dashboard/PhaseCard";
import { PhaseProgress } from "@/components/dashboard/PhaseProgress";
import { 
  WelcomeHeader, 
  DOORaiCard, 
  QuickLinksCard, 
  ProfileCard, 
  RotterdamInfoCard 
} from "@/components/dashboard/DashboardCards";
import { phaseData, type OrientationPhase } from "@/data/dashboard-phases";

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  current_phase: OrientationPhase;
  preferred_sector: string | null;
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
      
      // Set profile even if null - component will use defaults
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main content - left 2 columns */}
            <div className="lg:col-span-2 space-y-6">
              <PhaseCard phaseInfo={phaseInfo} />
              <DOORaiCard />
              <PhaseTips tips={phaseInfo.tips} />
            </div>

            {/* Sidebar - right column */}
            <div className="space-y-6">
              <QuickLinksCard />
              <ProfileCard profile={profile} phaseTitle={phaseInfo.title} />
              <RotterdamInfoCard />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
