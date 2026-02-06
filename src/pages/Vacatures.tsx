import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowRight, Search, MapPin, Briefcase, Clock, ExternalLink } from "lucide-react";

// Voor nu tonen we links naar externe vacaturesites - later kunnen we scrapen
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
    title: "BOOR Vacatures",
    description: "Vacatures bij Stichting BOOR - openbaar onderwijs Rotterdam",
    url: "https://www.stichtingboor.nl/werken-bij-boor/vacatures",
    sector: "PO",
  },
  {
    title: "LMC-VO Vacatures",
    description: "Vacatures bij LMC Voortgezet Onderwijs Rotterdam",
    url: "https://www.lmc-vo.nl/werken-bij-lmc",
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

// Voorbeeldvacatures gebaseerd op regionale data
const vacatures = [
  {
    id: 1,
    title: "Groepsleerkracht groep 5/6",
    school: "OBS De Globetrotter",
    location: "Rotterdam-West",
    sector: "PO",
    hours: "0.8 - 1.0 FTE",
    type: "Vast",
    posted: "Vandaag",
    url: "https://www.meesterbaan.nl",
    source: "Meesterbaan",
  },
  {
    id: 2,
    title: "Docent Wiskunde",
    school: "Comenius College",
    location: "Rotterdam-Zuid",
    sector: "VO",
    hours: "0.8 - 1.0 FTE",
    type: "Vast",
    posted: "2 dagen geleden",
    url: "https://www.lmc-vo.nl/werken-bij-lmc",
    source: "LMC-VO",
  },
  {
    id: 3,
    title: "Docent Nederlands",
    school: "Albeda College",
    location: "Rotterdam-Centrum",
    sector: "MBO",
    hours: "1.0 FTE",
    type: "Tijdelijk",
    posted: "3 dagen geleden",
    url: "https://www.albeda.nl/werken-bij",
    source: "Albeda",
  },
  {
    id: 4,
    title: "Leraar basisonderwijs",
    school: "Basisschool Het Kompas",
    location: "Rotterdam-Noord",
    sector: "PO",
    hours: "0.6 - 0.8 FTE",
    type: "Vast",
    posted: "4 dagen geleden",
    url: "https://www.stichtingboor.nl/werken-bij-boor/vacatures",
    source: "BOOR",
  },
  {
    id: 5,
    title: "Docent Economie",
    school: "Erasmiaans Gymnasium",
    location: "Rotterdam-Centrum",
    sector: "VO",
    hours: "0.8 FTE",
    type: "Vast",
    posted: "5 dagen geleden",
    url: "https://www.meesterbaan.nl",
    source: "Meesterbaan",
  },
  {
    id: 6,
    title: "Docent Techniek",
    school: "ROC Zadkine",
    location: "Rotterdam-Zuid",
    sector: "MBO",
    hours: "1.0 FTE",
    type: "Vast",
    posted: "1 week geleden",
    url: "https://www.zadkine.nl/over-zadkine/werken-bij-zadkine",
    source: "Zadkine",
  },
  {
    id: 7,
    title: "Onderwijsassistent",
    school: "SBO De Dreef",
    location: "Rotterdam-Oost",
    sector: "PO",
    hours: "0.6 FTE",
    type: "Vast",
    posted: "1 week geleden",
    url: "https://www.stichtingboor.nl/werken-bij-boor/vacatures",
    source: "BOOR",
  },
  {
    id: 8,
    title: "Docent Engels",
    school: "Montessori Lyceum Rotterdam",
    location: "Rotterdam-Kralingen",
    sector: "VO",
    hours: "0.6 - 1.0 FTE",
    type: "Vast",
    posted: "1 week geleden",
    url: "https://www.meesterbaan.nl",
    source: "Meesterbaan",
  },
];

const sectors = ["Alle sectoren", "PO", "VO", "MBO"];

export default function Vacatures() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSector, setSelectedSector] = useState("Alle sectoren");

  const filteredVacatures = vacatures.filter((v) => {
    const matchesSearch = v.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.school.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSector = selectedSector === "Alle sectoren" || v.sector === selectedSector;
    return matchesSearch && matchesSector;
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
              Ontdek alle beschikbare vacatures in het Rotterdamse onderwijs. 
              Filter op sector, locatie en meer.
            </p>
          </div>
        </section>

        {/* Filters */}
        <section className="bg-muted py-6 border-b border-border">
          <div className="container">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Zoek op functie of school..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white"
                />
              </div>
              <div className="flex gap-2">
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
          </div>
        </section>

        {/* Results */}
        <section className="py-8 md:py-12">
          <div className="container">
            <p className="text-sm text-muted-foreground mb-6">
              {filteredVacatures.length} voorbeeldvacatures • Bekijk hieronder de actuele vacaturesites
            </p>

            <div className="space-y-4 mb-12">
              {filteredVacatures.map((vacature) => (
                <div
                  key={vacature.id}
                  className="bg-white border border-border rounded p-6 hover:border-primary/30 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium px-2 py-1 bg-primary/10 text-primary rounded uppercase">
                          {vacature.sector}
                        </span>
                        <span className="text-xs text-muted-foreground">{vacature.posted}</span>
                        <span className="text-xs text-muted-foreground">• via {vacature.source}</span>
                      </div>
                      
                      <h3 className="text-lg font-semibold text-foreground mb-1">
                        {vacature.title}
                      </h3>
                      <p className="text-muted-foreground mb-3">{vacature.school}</p>
                      
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {vacature.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {vacature.hours}
                        </span>
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-4 w-4" />
                          {vacature.type}
                        </span>
                      </div>
                    </div>

                    <Button variant="outline" size="sm" className="shrink-0" asChild>
                      <a href={vacature.url} target="_blank" rel="noopener noreferrer">
                        Bekijk vacature
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {filteredVacatures.length === 0 && (
              <div className="text-center py-12 mb-12">
                <p className="text-muted-foreground">
                  Geen vacatures gevonden met deze filters.
                </p>
              </div>
            )}

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
