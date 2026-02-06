import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageHero } from "@/components/shared/PageHero";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ExternalLink, Calendar, MapPin, Laptop, Users, Briefcase, GraduationCap, Lightbulb } from "lucide-react";
import regionalDesks from "@/data/regional-education-desks.json";

// Extract event sources from regional desks
const getEventSources = () => {
  const sources: Array<{ title: string; url: string; regions: string[] }> = [];

  regionalDesks.forEach((desk: any) => {
    if (desk.service_links) {
      desk.service_links.forEach((link: any) => {
        if (link.type === "oriëntatieactiviteiten" || link.type === "agenda" || link.type === "events") {
          if (!sources.find(s => s.url === link.url)) {
            sources.push({
              title: desk.title,
              url: link.url,
              regions: desk.regions || [],
            });
          }
        }
      });
    }
  });

  return sources;
};

const eventSources = getEventSources();

const externalAgendas = [
  {
    title: "Onderwijsloket Rotterdam",
    description: "Regionale activiteiten en events",
    url: "https://www.onderwijsloketrotterdam.nl/activiteiten",
    highlight: true,
  },
  {
    title: "Onderwijs010",
    description: "Events onderwijsregio Rotterdam",
    url: "https://www.onderwijs010.nl/activiteiten",
    highlight: true,
  },
  {
    title: "Landelijk Onderwijsloket",
    description: "Landelijke open dagen & webinars",
    url: "https://www.onderwijsloket.com/activiteiten",
    highlight: false,
  },
];

const eventTypes = [
  { id: "open-dagen", title: "Open dagen", description: "Bezoek hogescholen en lerarenopleidingen", icon: GraduationCap },
  { id: "webinars", title: "Webinars", description: "Online sessies over zij-instromen en subsidies", icon: Laptop },
  { id: "meeloopdagen", title: "Meeloopdagen", description: "Ervaar het vak van leraar in de praktijk", icon: Users },
  { id: "info", title: "Informatiebijeenkomsten", description: "Ontmoet scholen en besturen", icon: Lightbulb },
  { id: "banenmarkten", title: "Banenmarkten", description: "Direct solliciteren bij vacatures", icon: Briefcase },
];

const quickNavItems = [
  { label: "Agenda's Rotterdam", href: "#agendas" },
  { label: "Type events", href: "#types" },
  { label: "Regionale loketten", href: "#regionaal" },
];

export default function Events() {
  const [activeSection, setActiveSection] = useState("agendas");

  const scrollToSection = (id: string) => {
    setActiveSection(id.replace("#", ""));
    document.querySelector(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <PageHero
          variant="image"
          title="AGENDA"
          titleHighlight="& EVENTS"
          subtitle="Open dagen, webinars en meeloopdagen in de regio Rotterdam."
        />

        {/* Quick navigation - sticky */}
        <nav className="bg-white border-b border-border sticky top-16 z-40">
          <div className="container py-3">
            <div className="flex items-center gap-2 overflow-x-auto">
              {quickNavItems.map((item) => (
                <Button
                  key={item.href}
                  variant={activeSection === item.href.replace("#", "") ? "default" : "outline"}
                  size="sm"
                  onClick={() => scrollToSection(item.href)}
                  className="whitespace-nowrap"
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
        </nav>

        {/* Main agenda links - compact cards */}
        <section id="agendas" className="py-10 md:py-12">
          <div className="container">
            <h2 className="text-lg font-bold text-foreground mb-6 uppercase tracking-wide">
              Agenda's <span className="text-primary">Rotterdam</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {externalAgendas.map((agenda, index) => (
                <motion.a
                  key={index}
                  href={agenda.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className={`group flex items-center gap-4 rounded-lg p-4 transition-all ${
                    agenda.highlight 
                      ? "bg-primary/5 border-2 border-primary/20 hover:border-primary/50" 
                      : "bg-white border border-border hover:border-primary/30"
                  }`}
                >
                  <div className={`rounded-full p-2 ${agenda.highlight ? "bg-primary/10" : "bg-muted"}`}>
                    <Calendar className={`h-5 w-5 ${agenda.highlight ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm">
                      {agenda.title}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate">
                      {agenda.description}
                    </p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                </motion.a>
              ))}
            </div>
          </div>
        </section>

        {/* Event types - horizontal scroll on mobile, grid on desktop */}
        <section id="types" className="bg-muted py-10 md:py-12">
          <div className="container">
            <h2 className="text-lg font-bold text-foreground mb-6 uppercase tracking-wide">
              Welke <span className="text-primary">events</span> zijn er?
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-5 md:overflow-visible">
              {eventTypes.map((type, index) => (
                <motion.div
                  key={type.id}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                  className="bg-white rounded-lg p-4 border border-border min-w-[160px] md:min-w-0 flex flex-col items-center text-center"
                >
                  <div className="bg-primary/10 rounded-full p-3 mb-3">
                    <type.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground text-sm mb-1">{type.title}</h3>
                  <p className="text-xs text-muted-foreground">{type.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Regional desks - collapsible/compact */}
        {eventSources.length > 0 && (
          <section id="regionaal" className="py-10 md:py-12">
            <div className="container">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-foreground uppercase tracking-wide">
                  <span className="text-primary">Regionale</span> loketten
                </h2>
                <span className="text-sm text-muted-foreground">
                  {eventSources.length} loketten
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {eventSources.slice(0, 8).map((source, index) => (
                  <motion.a
                    key={index}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.2, delay: index * 0.02 }}
                    className="group bg-white border border-border rounded-lg p-3 hover:border-primary/50 transition-all"
                  >
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <h3 className="font-medium text-foreground group-hover:text-primary transition-colors text-sm truncate">
                          {source.title}
                        </h3>
                        {source.regions.length > 0 && (
                          <p className="text-xs text-muted-foreground truncate">
                            {source.regions.slice(0, 2).join(", ")}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.a>
                ))}
              </div>
              {eventSources.length > 8 && (
                <div className="mt-4 text-center">
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://www.onderwijsloket.com/loketten" target="_blank" rel="noopener noreferrer">
                      Bekijk alle {eventSources.length} loketten
                      <ExternalLink className="ml-2 h-3 w-3" />
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
