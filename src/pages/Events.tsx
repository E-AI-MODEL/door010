import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, MapPin, Clock, ExternalLink } from "lucide-react";

// Echte events gebaseerd op regionale onderwijsloketten data
const events = [
  {
    id: 1,
    title: "Open dag Pabo Hogeschool Rotterdam",
    organizer: "Hogeschool Rotterdam",
    date: "15 februari 2025",
    time: "10:00 - 15:00",
    location: "Hogeschool Rotterdam, Museumpark 40",
    type: "Open dag",
    description: "Kom kennismaken met de lerarenopleiding basisonderwijs en ontdek of de Pabo bij je past. Praat met docenten en studenten.",
    url: "https://www.hogeschoolrotterdam.nl/opendag",
  },
  {
    id: 2,
    title: "Webinar: Zij-instromen in het onderwijs",
    organizer: "Onderwijsloket Rotterdam",
    date: "22 februari 2025",
    time: "19:30 - 21:00",
    location: "Online",
    type: "Webinar",
    description: "Alles wat je moet weten over zij-instromen: routes, subsidies en ervaringen van zij-instromers. Stel je vragen aan experts.",
    url: "https://www.onderwijsloketrotterdam.nl/activiteiten",
  },
  {
    id: 3,
    title: "Informatiebijeenkomst Leraar worden Rotterdam",
    organizer: "Onderwijsregio Rotterdam",
    date: "5 maart 2025",
    time: "16:00 - 18:00",
    location: "Stadskantoor Rotterdam, Coolsingel 40",
    type: "Informatiebijeenkomst",
    description: "Oriënteer je op een carrière in het Rotterdamse onderwijs. Ontmoet scholen, besturen en opleiders uit de regio.",
    url: "https://www.onderwijs010.nl/activiteiten",
  },
  {
    id: 4,
    title: "Training Zin in Lesgeven",
    organizer: "Onderwijsloket Rotterdam",
    date: "12 maart 2025",
    time: "09:00 - 16:00",
    location: "Thomas More Hogeschool, Rotterdam",
    type: "Training",
    description: "Een intensieve dag om te ontdekken of het onderwijs bij je past. Inclusief proefles en feedback van ervaren docenten.",
    url: "https://www.onderwijsloketrotterdam.nl/zin-in-lesgeven",
  },
  {
    id: 5,
    title: "Meeloopdag basisonderwijs Rotterdam",
    organizer: "BOOR",
    date: "20 maart 2025",
    time: "08:30 - 14:00",
    location: "Diverse basisscholen Rotterdam",
    type: "Meeloopdag",
    description: "Loop een dag mee op een Rotterdamse basisschool en ervaar het vak van leraar. Aanmelden via het contactformulier.",
    url: "https://www.stichtingboor.nl/werken-bij-boor",
  },
  {
    id: 6,
    title: "Open dag Thomas More Hogeschool",
    organizer: "Thomas More Hogeschool",
    date: "22 maart 2025",
    time: "10:00 - 14:00",
    location: "Thomas More Hogeschool, Rotterdam",
    type: "Open dag",
    description: "Ontdek de Pabo en tweedegraads lerarenopleidingen. Praat met studenten en docenten over je mogelijkheden.",
    url: "https://www.thomasmorehs.nl/opendag",
  },
  {
    id: 7,
    title: "Informatiesessie MBO-docent worden",
    organizer: "Albeda College",
    date: "26 maart 2025",
    time: "14:00 - 16:00",
    location: "Albeda College, Rosestraat 1101",
    type: "Informatiebijeenkomst",
    description: "Ontdek wat het betekent om docent te zijn in het MBO en welke routes er zijn via het PDG-traject.",
    url: "https://www.albeda.nl/werken-bij",
  },
  {
    id: 8,
    title: "Banenmarkt Onderwijs Rotterdam",
    organizer: "Onderwijsregio Rotterdam",
    date: "3 april 2025",
    time: "15:00 - 19:00",
    location: "De Doelen, Rotterdam",
    type: "Netwerkevent",
    description: "Ontmoet schoolbesturen en scholen uit de regio Rotterdam. Direct solliciteren mogelijk bij vacatures.",
    url: "https://www.onderwijs010.nl/banenmarkt",
  },
];

const eventTypes = ["Alle events", "Open dag", "Webinar", "Informatiebijeenkomst", "Training", "Meeloopdag", "Netwerkevent"];

export default function Events() {
  const [selectedType, setSelectedType] = useState("Alle events");

  const filteredEvents = events.filter((e) => {
    return selectedType === "Alle events" || e.type === selectedType;
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
                Agenda
              </h1>
            </div>
            <p className="text-primary-foreground/90 max-w-2xl">
              Bekijk alle open dagen, webinars, informatiesessies en meeloopdagen in de regio Rotterdam.
            </p>
          </div>
        </section>

        {/* Filters */}
        <section className="bg-muted py-6 border-b border-border">
          <div className="container">
            <div className="flex flex-wrap gap-2">
              {eventTypes.map((type) => (
                <Button
                  key={type}
                  variant={selectedType === type ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedType(type)}
                  className={selectedType === type ? "bg-primary" : "bg-white"}
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>
        </section>

        {/* Events list */}
        <section className="py-8 md:py-12">
          <div className="container">
            <p className="text-sm text-muted-foreground mb-6">
              {filteredEvents.length} events gevonden
            </p>

            <div className="space-y-4">
              {filteredEvents.map((event) => (
                <div
                  key={event.id}
                  className="bg-white border border-border rounded overflow-hidden hover:border-primary/30 transition-colors"
                >
                  <div className="flex flex-col md:flex-row">
                    {/* Date block */}
                    <div className="bg-primary text-primary-foreground p-6 md:w-32 flex flex-col items-center justify-center shrink-0">
                      <Calendar className="h-6 w-6 mb-2" />
                      <span className="text-sm font-medium text-center">{event.date}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-6">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium px-2 py-1 bg-muted text-foreground rounded uppercase">
                          {event.type}
                        </span>
                      </div>

                      <h3 className="text-lg font-semibold text-foreground mb-1">
                        {event.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3">{event.organizer}</p>
                      <p className="text-muted-foreground mb-4">{event.description}</p>

                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {event.time}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {event.location}
                        </span>
                      </div>

                      <Button variant="outline" size="sm" asChild>
                        <a href={event.url} target="_blank" rel="noopener noreferrer">
                          Meer informatie
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredEvents.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  Geen events gevonden met dit filter.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* External agenda links */}
        <section className="bg-muted py-12">
          <div className="container">
            <h2 className="text-xl font-semibold text-foreground mb-6">
              Meer agenda's in de regio
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <a
                href="https://www.onderwijsloketrotterdam.nl/activiteiten"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white border border-border rounded p-4 hover:border-primary/30 transition-colors group flex items-start justify-between"
              >
                <div>
                  <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                    Onderwijsloket Rotterdam
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Regionale activiteiten
                  </p>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
              </a>
              <a
                href="https://www.onderwijs010.nl/activiteiten"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white border border-border rounded p-4 hover:border-primary/30 transition-colors group flex items-start justify-between"
              >
                <div>
                  <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                    Onderwijs010
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Events onderwijsregio
                  </p>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
              </a>
              <a
                href="https://www.onderwijsloket.com/activiteiten"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white border border-border rounded p-4 hover:border-primary/30 transition-colors group flex items-start justify-between"
              >
                <div>
                  <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                    Landelijk Onderwijsloket
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Landelijke agenda
                  </p>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
