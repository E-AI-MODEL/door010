import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageHero } from "@/components/shared/PageHero";
import { motion } from "framer-motion";
import { ExternalLink, Calendar } from "lucide-react";
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
    description: "Regionale activiteiten en events voor (aankomende) leraren",
    url: "https://www.onderwijsloketrotterdam.nl/activiteiten",
  },
  {
    title: "Onderwijs010",
    description: "Events en informatiebijeenkomsten in de onderwijsregio Rotterdam",
    url: "https://www.onderwijs010.nl/activiteiten",
  },
  {
    title: "Landelijk Onderwijsloket",
    description: "Landelijke agenda met open dagen, webinars en meeloopdagen",
    url: "https://www.onderwijsloket.com/activiteiten",
  },
];

const eventTypes = [
  { title: "Open dagen", description: "Bezoek hogescholen en lerarenopleidingen" },
  { title: "Webinars", description: "Online sessies over zij-instromen en subsidies" },
  { title: "Meeloopdagen", description: "Ervaar het vak van leraar in de praktijk" },
  { title: "Informatiebijeenkomsten", description: "Ontmoet scholen en besturen" },
  { title: "Banenmarkten", description: "Direct solliciteren bij vacatures" },
  { title: "Trainingen", description: "Ontdek of het onderwijs bij je past" },
];

export default function Events() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <PageHero
          variant="image"
          title="AGENDA"
          titleHighlight="& EVENTS"
          subtitle="Bekijk alle open dagen, webinars, informatiesessies en meeloopdagen in de regio Rotterdam."
        />

        {/* Main agenda links */}
        <section className="py-12 md:py-16">
          <div className="container">
            <h2 className="text-xl font-bold text-foreground mb-8 uppercase tracking-wide">
              Agenda's <span className="text-primary">Rotterdam</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {externalAgendas.map((agenda, index) => (
                <motion.a
                  key={index}
                  href={agenda.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="group bg-white border border-border rounded-lg p-8 hover:border-primary/50 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="bg-primary/10 rounded-full p-3">
                      <Calendar className="h-6 w-6 text-primary" />
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors mb-2">
                    {agenda.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {agenda.description}
                  </p>
                </motion.a>
              ))}
            </div>
          </div>
        </section>

        {/* Event types */}
        <section className="bg-muted py-12 md:py-16">
          <div className="container">
            <h2 className="text-xl font-bold text-foreground mb-8 uppercase tracking-wide">
              Welke <span className="text-primary">events</span> kun je verwachten?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {eventTypes.map((type, index) => (
                <motion.div
                  key={type.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="bg-white rounded-lg p-6 border border-border"
                >
                  <h3 className="font-semibold text-foreground mb-2">{type.title}</h3>
                  <p className="text-sm text-muted-foreground">{type.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Regional desks */}
        {eventSources.length > 0 && (
          <section className="py-12 md:py-16">
            <div className="container">
              <h2 className="text-xl font-bold text-foreground mb-4 uppercase tracking-wide">
                Activiteiten van <span className="text-primary">regionale loketten</span>
              </h2>
              <p className="text-muted-foreground mb-8">
                Bekijk de agenda's van onderwijsloketten door heel Nederland:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {eventSources.slice(0, 9).map((source, index) => (
                  <motion.a
                    key={index}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: index * 0.03 }}
                    className="group bg-white border border-border rounded-lg p-4 hover:border-primary/50 transition-all flex items-start justify-between"
                  >
                    <div>
                      <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                        {source.title}
                      </h3>
                      {source.regions.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {source.regions.slice(0, 2).join(", ")}
                          {source.regions.length > 2 && ` +${source.regions.length - 2}`}
                        </p>
                      )}
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                  </motion.a>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
