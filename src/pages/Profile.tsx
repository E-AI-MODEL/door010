import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { 
  User, 
  Mail, 
  Phone, 
  GraduationCap, 
  Briefcase,
  MapPin,
  Calendar,
  Save,
  ArrowLeft,
  CheckCircle2,
  Target
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
}

const phases: { value: OrientationPhase; label: string; description: string }[] = [
  { value: 'interesseren', label: 'Interesseren', description: 'Ontdek of het onderwijs bij je past' },
  { value: 'orienteren', label: 'Oriënteren', description: 'Onderzoek de routes naar het leraarschap' },
  { value: 'beslissen', label: 'Beslissen', description: 'Maak je keuze voor een route' },
  { value: 'matchen', label: 'Matchen', description: 'Vind de juiste school of opleiding' },
  { value: 'voorbereiden', label: 'Voorbereiden', description: 'Klaar voor de start!' },
];

const sectors = [
  { value: 'po', label: 'Primair Onderwijs (PO)', description: 'Basisschool, groep 1-8' },
  { value: 'vo', label: 'Voortgezet Onderwijs (VO)', description: 'Middelbare school' },
  { value: 'mbo', label: 'Middelbaar Beroepsonderwijs (MBO)', description: 'Beroepsgerichte opleidingen' },
  { value: 'so', label: 'Speciaal Onderwijs (SO)', description: 'Voor leerlingen met extra ondersteuning' },
  { value: 'onbekend', label: 'Nog onbekend', description: 'Ik wil eerst meer ontdekken' },
];

export default function Profile() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [currentPhase, setCurrentPhase] = useState<OrientationPhase>("interesseren");
  const [preferredSector, setPreferredSector] = useState("");

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
      setCurrentPhase(data.current_phase || "interesseren");
      setPreferredSector(data.preferred_sector || "");
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
        {/* Header */}
        <section className="bg-primary py-6">
          <div className="container">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate("/dashboard")}
                className="text-primary-foreground hover:bg-white/20"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-4">
                <div className="bg-white/20 rounded-full p-3">
                  <User className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-lg md:text-xl font-bold text-primary-foreground">
                    Mijn Profiel
                  </h1>
                  <p className="text-primary-foreground/80 text-sm">
                    Beheer je persoonlijke gegevens
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="container py-8">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-6">
            {/* Personal Info */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Persoonlijke gegevens
                  </CardTitle>
                  <CardDescription>
                    Vul je basisgegevens in zodat adviseurs je kunnen bereiken
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Voornaam</Label>
                      <Input
                        id="firstName"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Je voornaam"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Achternaam</Label>
                      <Input
                        id="lastName"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Je achternaam"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mailadres</Label>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{user.email}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefoonnummer</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="06-12345678"
                        className="pl-10"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Career Phase */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Oriëntatiefase
                  </CardTitle>
                  <CardDescription>
                    Waar bevind je je in je oriëntatie naar het onderwijs?
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {phases.map((phase) => (
                      <button
                        key={phase.value}
                        type="button"
                        onClick={() => setCurrentPhase(phase.value)}
                        className={`p-4 rounded-lg border text-left transition-all ${
                          currentPhase === phase.value
                            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                            : "border-border hover:border-primary/50 hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <span className="font-medium text-foreground">{phase.label}</span>
                          {currentPhase === phase.value && (
                            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{phase.description}</p>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Preferred Sector */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    Voorkeur onderwijssector
                  </CardTitle>
                  <CardDescription>
                    In welke sector wil je graag werken?
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {sectors.map((sector) => (
                      <button
                        key={sector.value}
                        type="button"
                        onClick={() => setPreferredSector(sector.value)}
                        className={`p-4 rounded-lg border text-left transition-all ${
                          preferredSector === sector.value
                            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                            : "border-border hover:border-primary/50 hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <span className="font-medium text-foreground">{sector.label}</span>
                          {preferredSector === sector.value && (
                            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{sector.description}</p>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Submit */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex justify-end gap-3"
            >
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/dashboard")}
              >
                Annuleren
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                    Opslaan...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Profiel opslaan
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
