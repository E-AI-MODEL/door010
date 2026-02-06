import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { LayoutDashboard, Users, MessageCircle, Bell, LogOut } from "lucide-react";
import { UserOverviewTable, type ProfileWithEmail } from "@/components/backoffice/UserOverviewTable";
import { AdvisorChatPanel } from "@/components/backoffice/AdvisorChatPanel";
import { BackofficeStats } from "@/components/backoffice/BackofficeStats";
import { BackofficeAlerts } from "@/components/backoffice/BackofficeAlerts";

type AppRole = 'candidate' | 'advisor' | 'admin';

// Mock data for development/demo
const mockProfiles: ProfileWithEmail[] = [
  {
    id: '1',
    user_id: 'user-1',
    first_name: 'Maria',
    last_name: 'de Jong',
    email: 'maria.dejong@email.nl',
    phone: '06-12345678',
    current_phase: 'orienteren',
    preferred_sector: 'po',
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_at: new Date().toISOString(),
    last_activity: new Date(Date.now() - 3600000 * 2).toISOString(),
    unread_messages: 2,
  },
  {
    id: '2',
    user_id: 'user-2',
    first_name: 'Jan',
    last_name: 'Bakker',
    email: 'j.bakker@gmail.com',
    phone: '06-98765432',
    current_phase: 'interesseren',
    preferred_sector: 'vo',
    created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
    updated_at: new Date().toISOString(),
    last_activity: new Date(Date.now() - 86400000).toISOString(),
    unread_messages: 0,
  },
  {
    id: '3',
    user_id: 'user-3',
    first_name: 'Sophie',
    last_name: 'van der Berg',
    email: 'sophie.vdberg@outlook.com',
    phone: null,
    current_phase: 'beslissen',
    preferred_sector: 'mbo',
    created_at: new Date(Date.now() - 86400000 * 14).toISOString(),
    updated_at: new Date().toISOString(),
    last_activity: new Date(Date.now() - 3600000 * 5).toISOString(),
    unread_messages: 1,
  },
  {
    id: '4',
    user_id: 'user-4',
    first_name: 'Thomas',
    last_name: 'Visser',
    email: 'thomas.visser@email.nl',
    phone: '06-11223344',
    current_phase: 'matchen',
    preferred_sector: 'po',
    created_at: new Date(Date.now() - 86400000 * 21).toISOString(),
    updated_at: new Date().toISOString(),
    last_activity: new Date(Date.now() - 3600000 * 1).toISOString(),
    unread_messages: 0,
  },
  {
    id: '5',
    user_id: 'user-5',
    first_name: 'Emma',
    last_name: 'Smit',
    email: 'emma.smit@hotmail.com',
    phone: '06-55667788',
    current_phase: 'voorbereiden',
    preferred_sector: 'so',
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
    updated_at: new Date().toISOString(),
    last_activity: new Date(Date.now() - 86400000 * 2).toISOString(),
    unread_messages: 0,
  },
  {
    id: '6',
    user_id: 'user-6',
    first_name: 'Daan',
    last_name: 'Jansen',
    email: 'daan.j@gmail.com',
    phone: null,
    current_phase: 'interesseren',
    preferred_sector: null,
    created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    updated_at: new Date().toISOString(),
    last_activity: new Date(Date.now() - 3600000 * 3).toISOString(),
    unread_messages: 3,
  },
];

export default function Backoffice() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  
  const [profiles, setProfiles] = useState<ProfileWithEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ProfileWithEmail | null>(null);

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
        .eq("user_id", user!.id);

      if (roleError) throw roleError;

      const hasAccess = roleData?.some(
        (r) => r.role === 'advisor' || r.role === 'admin'
      );
      
      if (!hasAccess) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      setHasAccess(true);

      // Try to fetch real profiles, fall back to mock data
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-profiles-with-email`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const { profiles: profilesData } = await response.json();
          // Merge with mock data for demo purposes
          const enrichedProfiles = (profilesData || []).map((p: ProfileWithEmail, i: number) => ({
            ...p,
            last_activity: new Date(Date.now() - Math.random() * 86400000 * 3).toISOString(),
            unread_messages: Math.floor(Math.random() * 4),
          }));
          setProfiles(enrichedProfiles.length > 0 ? enrichedProfiles : mockProfiles);
        } else {
          setProfiles(mockProfiles);
        }
      } catch {
        // Use mock data if API fails
        setProfiles(mockProfiles);
      }
    } catch (error) {
      console.error("Error:", error);
      setProfiles(mockProfiles);
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

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex flex-col bg-muted/30">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="text-destructive">Geen toegang</CardTitle>
              <CardDescription>
                Je hebt geen toegang tot de backoffice. 
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
        <section className="bg-secondary py-4">
          <div className="container">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-primary/20 rounded-full p-3">
                  <LayoutDashboard className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-lg md:text-xl font-bold text-secondary-foreground">
                    BackDOORai
                  </h1>
                  <p className="text-secondary-foreground/80 text-sm">
                    Adviseur Dashboard • {profiles.length} kandidaten
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Uitloggen
              </Button>
            </div>
          </div>
        </section>

        <div className="container py-6">
          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <BackofficeStats profiles={profiles} />
          </motion.div>

          {/* Main Content */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Overzicht
              </TabsTrigger>
              <TabsTrigger value="alerts" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Meldingen
              </TabsTrigger>
              <TabsTrigger value="chat" className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Gesprekken
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* User table - 2 columns */}
                  <div className="lg:col-span-2">
                    <UserOverviewTable 
                      profiles={profiles} 
                      onSelectUser={setSelectedUser}
                      selectedUserId={selectedUser?.user_id}
                    />
                  </div>
                  
                  {/* Chat panel - 1 column */}
                  <div className="lg:col-span-1">
                    <AdvisorChatPanel 
                      selectedUser={selectedUser}
                      onClose={() => setSelectedUser(null)}
                    />
                  </div>
                </div>
              </motion.div>
            </TabsContent>

            <TabsContent value="alerts">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Alerts panel - 2 columns */}
                  <div className="lg:col-span-2">
                    <BackofficeAlerts 
                      onSelectUser={(userId) => {
                        const profile = profiles.find(p => p.user_id === userId);
                        if (profile) setSelectedUser(profile);
                      }}
                    />
                  </div>
                  
                  {/* Chat panel - 1 column */}
                  <div className="lg:col-span-1">
                    <AdvisorChatPanel 
                      selectedUser={selectedUser}
                      onClose={() => setSelectedUser(null)}
                    />
                  </div>
                </div>
              </motion.div>
            </TabsContent>

            <TabsContent value="chat">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* Compact user list */}
                  <div className="lg:col-span-1">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Kandidaten</CardTitle>
                      </CardHeader>
                      <CardContent className="p-2">
                        <div className="space-y-1">
                          {profiles.map((profile) => (
                            <button
                              key={profile.id}
                              onClick={() => setSelectedUser(profile)}
                              className={`w-full text-left p-2 rounded-lg hover:bg-muted transition-colors ${
                                selectedUser?.user_id === profile.user_id ? 'bg-primary/10' : ''
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <div className="relative">
                                  <div className="bg-primary/10 rounded-full p-1.5">
                                    <Users className="h-3 w-3 text-primary" />
                                  </div>
                                  {(profile.unread_messages ?? 0) > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-accent text-accent-foreground text-[10px] rounded-full h-3.5 w-3.5 flex items-center justify-center">
                                      {profile.unread_messages}
                                    </span>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">
                                    {profile.first_name || 'Onbekend'}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {profile.current_phase || 'Geen fase'}
                                  </p>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* Full-width chat panel */}
                  <div className="lg:col-span-3">
                    <AdvisorChatPanel 
                      selectedUser={selectedUser}
                      onClose={() => setSelectedUser(null)}
                    />
                  </div>
                </div>
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
}
