import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, X, User, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

const navigation = [
  { name: "Ontdek het onderwijs", href: "/kennisbank" },
  { name: "Opleidingen", href: "/opleidingen" },
  { name: "Agenda", href: "/events" },
  { name: "Vacatures", href: "/vacatures" },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, loading } = useAuth();
  const [showDooraiHint, setShowDooraiHint] = useState(false);

  // Show DOORai hint every 2 minutes for 5 seconds
  useEffect(() => {
    const showHint = () => {
      setShowDooraiHint(true);
      setTimeout(() => setShowDooraiHint(false), 5000);
    };

    // Show after 10 seconds initially
    const initialTimeout = setTimeout(showHint, 10000);
    
    // Then every 2 minutes
    const interval = setInterval(showHint, 120000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-border">
      <nav className="container flex h-16 items-center justify-between">
        {/* Logo - styled like onderwijsloketrotterdam.nl */}
        <Link to="/" className="flex items-center gap-3">
          {/* Arrow icon similar to onderwijsloket */}
          <div className="flex items-center justify-center">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 20L28 20M28 20L20 12M28 20L20 28" stroke="hsl(152 100% 33%)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M32 8L32 32" stroke="hsl(152 100% 33%)" strokeWidth="3" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Onderwijsloket</span>
            <span className="text-lg font-bold text-primary uppercase tracking-tight">Rotterdam</span>
          </div>
        </Link>

        {/* DOORai hint - subtle animation */}
        <AnimatePresence>
          {showDooraiHint && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              className="absolute left-1/2 -translate-x-1/2 top-full mt-2 hidden lg:block"
            >
              <div className="bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium">
                <MessageCircle className="h-4 w-4" />
                <span>DOORai staat klaar om je te helpen!</span>
                <motion.div
                  animate={{ x: [0, 4, 0] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="text-primary-foreground/80"
                >
                  →
                </motion.div>
              </div>
              {/* Arrow pointing up */}
              <div className="absolute left-1/2 -translate-x-1/2 -top-2 w-0 h-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-primary" />
            </motion.div>
          )}
        </AnimatePresence>

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
            className="lg:hidden border-t border-border bg-white"
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
