import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, X, User, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const navigation = [
  { name: "Ontdek het onderwijs", href: "/kennisbank" },
  { name: "Opleidingen", href: "/opleidingen" },
  { name: "Agenda", href: "/events" },
  { name: "Vacatures", href: "/vacatures" },
];

// DOORai mascot SVG component
function DOORaiMascot() {
  return (
    <motion.div
      animate={{ y: [0, -4, 0] }}
      transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
      className="flex items-center gap-2"
    >
      <svg width="32" height="36" viewBox="0 0 60 70" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Body */}
        <rect x="12" y="25" width="36" height="35" rx="8" fill="hsl(var(--primary))" />
        {/* Head */}
        <rect x="15" y="8" width="30" height="22" rx="6" fill="hsl(var(--primary))" />
        {/* Antenna */}
        <circle cx="30" cy="4" r="4" fill="hsl(var(--accent))" />
        <rect x="28" y="4" width="4" height="6" fill="hsl(var(--primary))" />
        {/* Eyes - blinking */}
        <motion.ellipse
          cx="22"
          cy="18"
          rx="4"
          ry="4"
          fill="white"
          animate={{ scaleY: [1, 0.1, 1] }}
          transition={{ repeat: Infinity, duration: 3, repeatDelay: 2 }}
        />
        <motion.ellipse
          cx="38"
          cy="18"
          rx="4"
          ry="4"
          fill="white"
          animate={{ scaleY: [1, 0.1, 1] }}
          transition={{ repeat: Infinity, duration: 3, repeatDelay: 2 }}
        />
        {/* Pupils */}
        <circle cx="23" cy="18" r="2" fill="hsl(var(--secondary))" />
        <circle cx="39" cy="18" r="2" fill="hsl(var(--secondary))" />
        {/* Smile */}
        <path d="M24 24 Q30 28 36 24" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
      </svg>
      <div className="flex flex-col leading-tight">
        <span className="text-xs font-medium text-muted-foreground">Vraag het aan</span>
        <span className="text-sm font-bold text-primary">DOORai</span>
      </div>
    </motion.div>
  );
}

// Regular logo component
function RegularLogo() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center justify-center">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 20L28 20M28 20L20 12M28 20L20 28" stroke="currentColor" className="text-primary" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M32 8L32 32" stroke="currentColor" className="text-primary" strokeWidth="3" strokeLinecap="round"/>
        </svg>
      </div>
      <div className="flex flex-col leading-tight">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Onderwijsloket</span>
        <span className="text-lg font-bold text-primary uppercase tracking-tight">Rotterdam</span>
      </div>
    </div>
  );
}

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, loading } = useAuth();
  const [showMascot, setShowMascot] = useState(false);
  const [isAdvisorOrAdmin, setIsAdvisorOrAdmin] = useState(false);

  // Check if user has advisor or admin role
  useEffect(() => {
    if (user) {
      checkUserRole();
    } else {
      setIsAdvisorOrAdmin(false);
    }
  }, [user]);

  const checkUserRole = async () => {
    if (!user) return;
    
    try {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      
      if (data) {
        const hasAccess = data.some(
          (r) => r.role === "advisor" || r.role === "admin"
        );
        setIsAdvisorOrAdmin(hasAccess);
      }
    } catch (error) {
      console.error("Error checking user role:", error);
    }
  };

  // Show DOORai mascot every 5 minutes for 8 seconds (replaces logo)
  useEffect(() => {
    const showMascotAnimation = () => {
      setShowMascot(true);
      setTimeout(() => setShowMascot(false), 8000);
    };

    // Show after 30 seconds initially
    const initialTimeout = setTimeout(showMascotAnimation, 30000);
    
    // Then every 5 minutes
    const interval = setInterval(showMascotAnimation, 300000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full bg-background border-b border-border">
      <nav className="container flex h-16 items-center justify-between">
        {/* Logo / Mascot - animated swap */}
        <Link to="/" className="flex items-center">
          <AnimatePresence mode="wait">
            {showMascot ? (
              <motion.div
                key="mascot"
                initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.8, rotate: 10 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <DOORaiMascot />
              </motion.div>
            ) : (
              <motion.div
                key="logo"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3 }}
              >
                <RegularLogo />
              </motion.div>
            )}
          </AnimatePresence>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex lg:items-center lg:gap-1">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className="px-4 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors uppercase tracking-wide"
            >
              {item.name}
            </Link>
          ))}
          {isAdvisorOrAdmin && (
            <Link
              to="/backoffice"
              className="px-4 py-2 text-sm font-medium text-accent hover:text-accent/80 transition-colors uppercase tracking-wide flex items-center gap-1"
            >
              <Shield className="h-4 w-4" />
              Backoffice
            </Link>
          )}
        </div>

        {/* Desktop CTA */}
        <div className="hidden lg:flex lg:items-center lg:gap-3">
          {!loading && (
            user ? (
              <Button size="sm" className="font-medium" asChild>
                <Link to="/dashboard">
                  <User className="mr-2 h-4 w-4" />
                  Dashboard
                </Link>
              </Button>
            ) : (
              <Button size="sm" className="font-medium" asChild>
                <Link to="/auth">Inloggen</Link>
              </Button>
            )
          )}
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          className="lg:hidden p-2 text-foreground"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden border-t border-border bg-background"
          >
            <div className="container py-4 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className="block px-3 py-3 text-sm font-medium text-foreground hover:text-primary hover:bg-muted rounded uppercase tracking-wide"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              {isAdvisorOrAdmin && (
                <Link
                  to="/backoffice"
                  className="block px-3 py-3 text-sm font-medium text-accent hover:text-accent/80 hover:bg-muted rounded uppercase tracking-wide flex items-center gap-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Shield className="h-4 w-4" />
                  Backoffice
                </Link>
              )}
              <div className="pt-4 border-t border-border">
                {!loading && (
                  user ? (
                    <Button className="w-full" asChild>
                      <Link to="/dashboard">
                        <User className="mr-2 h-4 w-4" />
                        Dashboard
                      </Link>
                    </Button>
                  ) : (
                    <Button className="w-full" asChild>
                      <Link to="/auth">Inloggen</Link>
                    </Button>
                  )
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
