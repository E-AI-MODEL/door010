import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { AvatarUpload } from "@/components/profile/AvatarUpload";
import { CVUpload } from "@/components/profile/CVUpload";
import { InterestTest } from "@/components/profile/InterestTest";
import { ProfileHero } from "@/components/profile/ProfileHero";
import { ProfileTimeline } from "@/components/profile/ProfileTimeline";
import {
  User,
  Mail,
  Phone,
  GraduationCap,
  Save,
  CheckCircle2,
  Target,
} from "lucide-react";

type OrientationPhase = 'interesseren' | 'orienteren' | 'beslissen' | 'matchen' | 'voorbereiden';

interface Profile {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  current_phase: OrientationPhase | null;
  preferred_sector: string | null;
  avatar_url: string | null;
  cv_url: string | null;
  bio: string | null;
  test_completed: boolean;
  test_results: unknown;
}

const phases: { value: OrientationPhase; label: string; description: string }[] = [
  { value: 'interesseren', label: 'Interesseren', description: 'Ontdek of het onderwijs bij je past' },
  { value: 'orienteren', label: 'Oriënteren', description: 'Onderzoek de routes' },
  { value: 'beslissen', label: 'Beslissen', description: 'Maak je keuze' },
  { value: 'matchen', label: 'Matchen', description: 'Vind de juiste plek' },
  { value: 'voorbereiden', label: 'Voorbereiden', description: 'Klaar voor de start!' },
];

const sectors = [
  { value: 'po', label: 'PO', description: 'Basisschool' },
  { value: 'vo', label: 'VO', description: 'Middelbaar' },
  { value: 'mbo', label: 'MBO', description: 'Beroepsonderwijs' },
  { value: 'so', label: 'SO', description: 'Speciaal onderwijs' },
  { value: 'onbekend', label: 'Onbekend', description: 'Nog ontdekken' },
];

export default function Profile() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [currentPhase, setCurrentPhase] = useState<OrientationPhase>("interesseren");
  const [preferredSector, setPreferredSector] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [cvUrl, setCvUrl] = useState<string | null>(null);
  const [testCompleted, setTestCompleted] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, unknown> | null>(null);

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
      setFirstName(data.first_name || "");
      setLastName(data.last_name || "");
      setPhone(data.phone || "");
      setBio(data.bio || "");
      setCurrentPhase(data.current_phase || "interesseren");
      setPreferredSector(data.preferred_sector || "");
      setAvatarUrl(data.avatar_url);
      setCvUrl(data.cv_url);
      setTestCompleted(data.test_completed || false);
      setTestResults(data.test_results as Record<string, unknown> | null);
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
          phone: phone.trim() || null,
          bio: bio.trim() || null,
          current_phase: currentPhase,
          preferred_sector: preferredSector || null,
        })
        .eq("user_id", user!.id);

      if (error) throw error;

      toast({
        title: "Profiel opgeslagen",
        description: "Je wijzigingen zijn succesvol opgeslagen.",
      });
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "Fout bij opslaan",
        description: "Er is iets misgegaan. Probeer het opnieuw.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
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

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Header />
      <main className="flex-1">
        <div className="container max-w-5xl py-6">
          <form onSubmit={handleSubmit}>
            {/* Hero - compact horizontal */}
            <ProfileHero
              firstName={firstName}
              lastName={lastName}
              avatarUrl={avatarUrl}
              currentPhase={currentPhase}
              preferredSector={preferredSector}
              phone={phone}
              bio={bio}
              testCompleted={testCompleted}
              cvUrl={cvUrl}
            />

            {/* Tile grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {/* Tile 1: Personal info + avatar */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                <Card className="rounded-2xl shadow-door h-full">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" />
                      <span className="text-xs font-semibold tracking-wide uppercase">Gegevens</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-center pb-3 border-b border-border">
                      <AvatarUpload
                        userId={user.id}
                        currentAvatarUrl={avatarUrl}
                        firstName={firstName}
                        lastName={lastName}
                        onAvatarChange={setAvatarUrl}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor="firstName" className="text-[10px] uppercase tracking-wider text-muted-foreground">Voornaam</Label>
                        <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Voornaam" className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="lastName" className="text-[10px] uppercase tracking-wider text-muted-foreground">Achternaam</Label>
                        <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Achternaam" className="h-8 text-sm" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">E-mail</Label>
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="phone" className="text-[10px] uppercase tracking-wider text-muted-foreground">Telefoon</Label>
                      <div className="relative">
                        <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                        <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="06-12345678" className="pl-8 h-8 text-sm" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="bio" className="text-[10px] uppercase tracking-wider text-muted-foreground">Over jezelf</Label>
                      <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Kort iets over jezelf..." rows={2} className="text-sm resize-none" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Tile 2: Sector */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card className="rounded-2xl shadow-door h-full">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-primary" />
                      <span className="text-xs font-semibold tracking-wide uppercase">Sector</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-1.5">
                      {sectors.map((sector) => (
                        <button
                          key={sector.value}
                          type="button"
                          onClick={() => setPreferredSector(sector.value)}
                          className={`p-2.5 rounded-xl border text-left transition-all text-sm ${
                            preferredSector === sector.value
                              ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium text-foreground text-sm">{sector.label}</span>
                              <span className="text-xs text-muted-foreground ml-2">{sector.description}</span>
                            </div>
                            {preferredSector === sector.value && (
                              <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Tile 3: Phase selector */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <Card className="rounded-2xl shadow-door h-full">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      <span className="text-xs font-semibold tracking-wide uppercase">Fase</span>
                    </CardTitle>
                    <CardDescription className="text-[10px]">Waar bevind je je?</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-1.5">
                      {phases.map((phase) => (
                        <button
                          key={phase.value}
                          type="button"
                          onClick={() => setCurrentPhase(phase.value)}
                          className={`p-2.5 rounded-xl border text-left transition-all text-sm ${
                            currentPhase === phase.value
                              ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium text-foreground text-sm">{phase.label}</span>
                              <span className="text-xs text-muted-foreground ml-2">{phase.description}</span>
                            </div>
                            {currentPhase === phase.value && (
                              <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Tile 4: Interest test */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <InterestTest
                  userId={user.id}
                  testCompleted={testCompleted}
                  testResults={testResults}
                  onTestComplete={(results) => {
                    setTestCompleted(true);
                    setTestResults(results);
                    if (results.recommendedSector) {
                      setPreferredSector(results.recommendedSector as string);
                    }
                  }}
                />
              </motion.div>

              {/* Tile 5: CV Upload */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                <CVUpload userId={user.id} currentCVUrl={cvUrl} onCVChange={setCvUrl} />
              </motion.div>

              {/* Tile 6: Timeline (spans full width on lg) */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="md:col-span-2 lg:col-span-1"
              >
                <ProfileTimeline
                  userId={user.id}
                  currentPhase={currentPhase}
                  preferredSector={preferredSector}
                  testCompleted={testCompleted}
                />
              </motion.div>
            </div>

            {/* Sticky save bar */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="sticky bottom-4 mt-4 flex justify-end gap-3 bg-background/80 backdrop-blur-sm rounded-2xl border border-border p-3 shadow-door"
            >
              <Button type="button" variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
                Annuleren
              </Button>
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-1.5" />
                    Opslaan...
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5 mr-1.5" />
                    Opslaan
                  </>
                )}
              </Button>
            </motion.div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
