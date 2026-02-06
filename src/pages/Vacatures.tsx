import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { ArrowRight, ExternalLink } from "lucide-react";

// Externe vacaturesites in de regio Rotterdam
const externalVacatureSites = [
  {
    title: "Meesterbaan",
    description: "De grootste vacaturesite voor het onderwijs in Nederland",
    url: "https://www.meesterbaan.nl/vacatures/rotterdam",
    sector: "PO/VO/MBO",
  },
  {
    title: "Werken in het onderwijs",
    description: "Officiële vacaturesite van de overheid",
    url: "https://www.werkeninhetonderwijs.nl/vacatures?plaats=rotterdam",
    sector: "PO/VO/MBO",
  },
  {
    title: "SARO Vacatures",
    description: "Vacatures bij SARO - voortgezet onderwijs Rotterdam",
    url: "https://www.saro.nl/werken-bij-saro",
    sector: "VO",
  },
  {
    title: "CVO Rotterdam",
    description: "Vacatures bij CVO - openbaar onderwijs Rotterdam",
    url: "https://www.cvorotterdam.nl/vacatures",
    sector: "PO/VO",
  },
  {
    title: "KAVOR",
    description: "Vacatures bij Katholiek Voortgezet Onderwijs Rotterdam",
    url: "https://www.kavor.nl/vacatures",
    sector: "VO",
  },
  {
    title: "Albeda College",
    description: "Vacatures bij het grootste mbo van Rotterdam",
    url: "https://www.albeda.nl/werken-bij",
    sector: "MBO",
  },
  {
    title: "Zadkine",
    description: "Vacatures bij ROC Zadkine Rotterdam",
    url: "https://www.zadkine.nl/over-zadkine/werken-bij-zadkine",
    sector: "MBO",
  },
];

const sectors = ["Alle sectoren", "PO", "VO", "MBO"];

export default function Vacatures() {
  const [selectedSector, setSelectedSector] = useState("Alle sectoren");

  const filteredSites = externalVacatureSites.filter((site) => {
    return selectedSector === "Alle sectoren" || site.sector.includes(selectedSector);
  });

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
                Vacatures
              </h1>
            </div>
            <p className="text-primary-foreground/90 max-w-2xl">
              Bekijk de actuele vacatures bij scholen en besturen in de regio Rotterdam.
            </p>
          </div>
        </section>

        {/* Filters */}
        <section className="bg-muted py-6 border-b border-border">
          <div className="container">
            <div className="flex flex-wrap gap-2">
              {sectors.map((sector) => (
                <Button
                  key={sector}
                  variant={selectedSector === sector ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedSector(sector)}
                  className={selectedSector === sector ? "bg-primary" : "bg-white"}
                >
                  {sector}
                </Button>
              ))}
            </div>
          </div>
        </section>

        {/* Vacancy sites */}
        <section className="py-8 md:py-12">
          <div className="container">
            <p className="text-sm text-muted-foreground mb-6">
              {filteredSites.length} vacaturesites gevonden
            </p>

            {/* External vacancy sites */}
            <div className="bg-muted rounded-lg p-8">
              <h2 className="text-xl font-semibold text-foreground mb-6">
                Vacaturesites in de regio Rotterdam
              </h2>
              <p className="text-muted-foreground mb-6">
                Bekijk de actuele vacatures op deze sites van scholen en besturen in de regio:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {externalVacatureSites.map((site, index) => (
                  <a
                    key={index}
                    href={site.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white border border-border rounded p-4 hover:border-primary/30 transition-colors group"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                            {site.title}
                          </h3>
                          <span className="text-xs font-medium px-2 py-0.5 bg-primary/10 text-primary rounded">
                            {site.sector}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {site.description}
                        </p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
