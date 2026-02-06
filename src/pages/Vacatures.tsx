import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowRight, Search, MapPin, Briefcase, Clock, ExternalLink } from "lucide-react";

// Mock vacature data
const vacatures = [
  {
    id: 1,
    title: "Docent Wiskunde",
    school: "Comenius College",
    location: "Rotterdam-Zuid",
    sector: "VO",
    hours: "0.8 - 1.0 FTE",
    type: "Vast",
    posted: "2 dagen geleden",
    url: "#",
  },
  {
    id: 2,
    title: "Groepsleerkracht groep 5/6",
    school: "OBS De Globetrotter",
    location: "Rotterdam-West",
    sector: "PO",
    hours: "0.6 - 0.8 FTE",
    type: "Vast",
    posted: "3 dagen geleden",
    url: "#",
  },
  {
    id: 3,
    title: "Docent Nederlands",
    school: "Zadkine MBO",
    location: "Rotterdam-Centrum",
    sector: "MBO",
    hours: "1.0 FTE",
    type: "Tijdelijk",
    posted: "1 week geleden",
    url: "#",
  },
  {
    id: 4,
    title: "Onderwijsassistent",
    school: "Basisschool Het Kompas",
    location: "Rotterdam-Noord",
    sector: "PO",
    hours: "0.5 FTE",
    type: "Vast",
    posted: "4 dagen geleden",
    url: "#",
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
    url: "#",
  },
  {
    id: 6,
    title: "Docent Techniek",
    school: "Albeda College",
    location: "Rotterdam-Zuid",
    sector: "MBO",
    hours: "1.0 FTE",
    type: "Vast",
    posted: "1 dag geleden",
    url: "#",
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
              {filteredVacatures.length} vacatures gevonden
            </p>

            <div className="space-y-4">
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
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  Geen vacatures gevonden met deze filters.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
