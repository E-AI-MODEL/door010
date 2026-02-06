import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ArrowRight, ExternalLink, Calendar } from "lucide-react";
import regionalDesks from "@/data/regional-education-desks.json";

// Extract all orientation activity / event links from regional desks
const getEventSources = () => {
  const sources: Array<{
    title: string;
    url: string;
    type: string;
    regions: string[];
  }> = [];

  regionalDesks.forEach((desk: any) => {
    if (desk.service_links) {
      desk.service_links.forEach((link: any) => {
        if (link.type === "oriëntatieactiviteiten" || link.type === "agenda" || link.type === "events") {
          // Avoid duplicates
          if (!sources.find(s => s.url === link.url)) {
            sources.push({
              title: desk.title,
              url: link.url,
              type: link.type,
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

// Grouped by domain for cleaner display
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

export default function Events() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="bg-primary py-12 md:py-16">
          <div className="container">
            <div className="flex items-center gap-3 mb-4">
              <ArrowRight className="h-8 w-8 text-primary-foreground" />
              <h1 className="text-2xl md:text-4xl font-bold text-primary-foreground uppercase tracking-tight">
                Agenda
              </h1>
            </div>
            <p className="text-primary-foreground/90 max-w-2xl">
              Bekijk alle open dagen, webinars, informatiesessies en meeloopdagen in de regio Rotterdam en daarbuiten.
            </p>
          </div>
        </section>

        {/* Main agenda links */}
        <section className="py-8 md:py-12">
          <div className="container">
            <h2 className="text-xl font-semibold text-foreground mb-6">
              Agenda's in de regio Rotterdam
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
              {externalAgendas.map((agenda, index) => (
                <a
                  key={index}
                  href={agenda.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white border border-border rounded-lg p-6 hover:border-primary/30 hover:shadow-md transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <Calendar className="h-8 w-8 text-primary" />
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors mb-2">
                    {agenda.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {agenda.description}
                  </p>
                </a>
              ))}
            </div>

            {/* Event sources from regional desks */}
            {eventSources.length > 0 && (
              <>
                <h2 className="text-xl font-semibold text-foreground mb-4">
                  Activiteiten van regionale onderwijsloketten
                </h2>
                <p className="text-muted-foreground mb-6">
                  Bekijk de agenda's van onderwijsloketten door heel Nederland:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {eventSources.map((source, index) => (
                    <a
                      key={index}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white border border-border rounded p-4 hover:border-primary/30 transition-colors group flex items-start justify-between"
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
                    </a>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        {/* Types of events info */}
        <section className="bg-muted py-12">
          <div className="container">
            <h2 className="text-xl font-semibold text-foreground mb-6">
              Welke events kun je verwachten?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg p-6">
                <h3 className="font-semibold text-foreground mb-2">Open dagen</h3>
                <p className="text-sm text-muted-foreground">
                  Bezoek hogescholen en opleidingen om kennismaken met de Pabo of lerarenopleiding.
                </p>
              </div>
              <div className="bg-white rounded-lg p-6">
                <h3 className="font-semibold text-foreground mb-2">Webinars</h3>
                <p className="text-sm text-muted-foreground">
                  Online sessies over zij-instromen, subsidies en routes naar het leraarschap.
                </p>
              </div>
              <div className="bg-white rounded-lg p-6">
                <h3 className="font-semibold text-foreground mb-2">Meeloopdagen</h3>
                <p className="text-sm text-muted-foreground">
                  Loop een dag mee op een school en ervaar het vak van leraar in de praktijk.
                </p>
              </div>
              <div className="bg-white rounded-lg p-6">
                <h3 className="font-semibold text-foreground mb-2">Informatiebijeenkomsten</h3>
                <p className="text-sm text-muted-foreground">
                  Leer meer over werken in het onderwijs en ontmoet scholen en besturen.
                </p>
              </div>
              <div className="bg-white rounded-lg p-6">
                <h3 className="font-semibold text-foreground mb-2">Banenmarkten</h3>
                <p className="text-sm text-muted-foreground">
                  Ontmoet werkgevers en solliciteer direct bij vacatures in jouw regio.
                </p>
              </div>
              <div className="bg-white rounded-lg p-6">
                <h3 className="font-semibold text-foreground mb-2">Trainingen</h3>
                <p className="text-sm text-muted-foreground">
                  Korte trainingen zoals "Zin in Lesgeven" om te ontdekken of het onderwijs bij je past.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
