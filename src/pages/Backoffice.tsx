import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { 
  Users, 
  Search, 
  Filter,
  Mail,
  Phone,
  Calendar,
  GraduationCap,
  Target,
  MessageCircle,
  ArrowUpDown,
  ChevronDown,
  Eye,
  LayoutDashboard,
  TrendingUp,
  Clock,
  UserCheck
} from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

type OrientationPhase = 'interesseren' | 'orienteren' | 'beslissen' | 'matchen' | 'voorbereiden';
type AppRole = 'candidate' | 'advisor' | 'admin';

interface ProfileWithEmail {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  current_phase: OrientationPhase | null;
  preferred_sector: string | null;
  created_at: string;
  updated_at: string;
}

const phaseLabels: Record<OrientationPhase, { label: string; color: string }> = {
  interesseren: { label: 'Interesseren', color: 'bg-accent/10 text-accent border-accent/20' },
  orienteren: { label: 'Oriënteren', color: 'bg-primary/10 text-primary border-primary/20' },
  beslissen: { label: 'Beslissen', color: 'bg-primary/20 text-primary border-primary/30' },
  matchen: { label: 'Matchen', color: 'bg-accent/20 text-accent border-accent/30' },
  voorbereiden: { label: 'Voorbereiden', color: 'bg-primary/15 text-primary border-primary/25' },
};

const sectorLabels: Record<string, string> = {
  po: 'Primair Onderwijs',
  vo: 'Voortgezet Onderwijs',
  mbo: 'MBO',
  so: 'Speciaal Onderwijs',
  onbekend: 'Nog onbekend',
};

export default function Backoffice() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [profiles, setProfiles] = useState<ProfileWithEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [phaseFilter, setPhaseFilter] = useState<string>("all");
  const [sectorFilter, setSectorFilter] = useState<string>("all");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      checkAccessAndFetchData();
    }
  }, [user]);

  const checkAccessAndFetchData = async () => {
    try {
      // Check if user has advisor or admin role
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .single();

      if (roleError) throw roleError;

      const role = roleData?.role as AppRole;
      if (role !== 'advisor' && role !== 'admin') {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      setHasAccess(true);

      // Fetch all profiles (RLS allows advisors/admins to see all)
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;
      setProfiles(profilesData || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter profiles
  const filteredProfiles = profiles.filter((profile) => {
    const matchesSearch = 
      !searchQuery ||
      profile.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile.phone?.includes(searchQuery);
    
    const matchesPhase = phaseFilter === "all" || profile.current_phase === phaseFilter;
    const matchesSector = sectorFilter === "all" || profile.preferred_sector === sectorFilter;
    
    return matchesSearch && matchesPhase && matchesSector;
  });

  // Stats
  const stats = {
    total: profiles.length,
    newThisWeek: profiles.filter(p => {
      const createdDate = new Date(p.created_at);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return createdDate > weekAgo;
    }).length,
    byPhase: profiles.reduce((acc, p) => {
      const phase = p.current_phase || 'interesseren';
      acc[phase] = (acc[phase] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
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

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex flex-col bg-muted/30">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="text-destructive">Geen toegang</CardTitle>
              <CardDescription>
                Je hebt geen toegang tot het backoffice dashboard. 
                Alleen adviseurs en beheerders kunnen dit bekijken.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/dashboard")} className="w-full">
                Terug naar Dashboard
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Header />
      <main className="flex-1">
        {/* Header */}
        <section className="bg-secondary py-6">
          <div className="container">
            <div className="flex items-center gap-4">
              <div className="bg-primary/20 rounded-full p-3">
                <LayoutDashboard className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-bold text-secondary-foreground">
                  BackDOORai Dashboard
                </h1>
                <p className="text-secondary-foreground/80 text-sm">
                  Overzicht van alle kandidaten
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="container py-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 rounded-full p-2">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                      <p className="text-xs text-muted-foreground">Totaal kandidaten</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 rounded-full p-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stats.newThisWeek}</p>
                      <p className="text-xs text-muted-foreground">Nieuw deze week</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-accent/10 rounded-full p-2">
                      <Clock className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stats.byPhase['interesseren'] || 0}</p>
                      <p className="text-xs text-muted-foreground">Interesseren</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-accent/20 rounded-full p-2">
                      <UserCheck className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stats.byPhase['matchen'] || 0}</p>
                      <p className="text-xs text-muted-foreground">Matchen</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Filters */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.2 }}
            className="bg-card rounded-lg border border-border p-4 mb-6"
          >
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Zoek op naam of telefoon..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select value={phaseFilter} onValueChange={setPhaseFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Alle fases" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle fases</SelectItem>
                    {Object.entries(phaseLabels).map(([value, { label }]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={sectorFilter} onValueChange={setSectorFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Alle sectoren" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle sectoren</SelectItem>
                    {Object.entries(sectorLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </motion.div>

          {/* Table */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.25 }}
            className="bg-card rounded-lg border border-border overflow-hidden"
          >
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Kandidaat</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Fase</TableHead>
                  <TableHead>Sector</TableHead>
                  <TableHead>Aangemeld</TableHead>
                  <TableHead className="text-right">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProfiles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Geen kandidaten gevonden
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProfiles.map((profile) => (
                    <TableRow key={profile.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="bg-primary/10 rounded-full p-2">
                            <Users className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              {profile.first_name && profile.last_name 
                                ? `${profile.first_name} ${profile.last_name}`
                                : profile.first_name || 'Niet ingevuld'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              ID: {profile.id.slice(0, 8)}...
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {profile.phone ? (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <span>{profile.phone}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {profile.current_phase && phaseLabels[profile.current_phase] ? (
                          <Badge 
                            variant="outline" 
                            className={phaseLabels[profile.current_phase].color}
                          >
                            {phaseLabels[profile.current_phase].label}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-muted text-muted-foreground">
                            Onbekend
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {profile.preferred_sector 
                            ? sectorLabels[profile.preferred_sector] || profile.preferred_sector
                            : '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(profile.created_at), 'd MMM yyyy', { locale: nl })}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          Bekijk
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </motion.div>

          {/* Summary */}
          <p className="text-sm text-muted-foreground mt-4 text-center">
            {filteredProfiles.length} van {profiles.length} kandidaten getoond
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
