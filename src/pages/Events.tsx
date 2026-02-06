import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, MapPin, Clock, ExternalLink, Users } from "lucide-react";

// Mock events data
const events = [
  {
    id: 1,
    title: "Open dag Pabo Hogeschool Rotterdam",
    organizer: "Hogeschool Rotterdam",
    date: "15 februari 2025",
    time: "10:00 - 15:00",
    location: "Hogeschool Rotterdam, Museumpark",
    type: "Open dag",
    description: "Kom kennismaken met de lerarenopleiding basisonderwijs en ontdek of de Pabo bij je past.",
    url: "#",
  },
  {
    id: 2,
    title: "Webinar: Zij-instromen in het onderwijs",
    organizer: "Onderwijsloket Rotterdam",
    date: "22 februari 2025",
    time: "19:30 - 21:00",
    location: "Online",
    type: "Webinar",
    description: "Alles wat je moet weten over zij-instromen: routes, subsidies en ervaringen van zij-instromers.",
    url: "#",
  },
  {
    id: 3,
    title: "Onderwijscafé Rotterdam",
    organizer: "Onderwijsregio Rotterdam",
    date: "5 maart 2025",
    time: "16:00 - 18:00",
    location: "Theater Walhalla, Rotterdam",
    type: "Netwerkevent",
    description: "Informeel netwerken met scholen, besturen en collega-kandidaten uit de regio.",
    url: "#",
  },
  {
    id: 4,
    title: "Informatiesessie MBO-docent worden",
    organizer: "Albeda College",
    date: "12 maart 2025",
    time: "14:00 - 16:00",
    location: "Albeda College, Rosestraat",
    type: "Informatiesessie",
    description: "Ontdek wat het betekent om docent te zijn in het MBO en welke routes er zijn.",
    url: "#",
  },
  {
    id: 5,
    title: "Meeloopdag basisonderwijs",
    organizer: "BOOR",
    date: "20 maart 2025",
    time: "08:30 - 14:00",
    location: "Diverse scholen Rotterdam",
    type: "Meeloopdag",
    description: "Loop een dag mee op een Rotterdamse basisschool en ervaar het vak van leraar.",
    url: "#",
  },
];

const eventTypes = ["Alle events", "Open dag", "Webinar", "Informatiesessie", "Meeloopdag", "Netwerkevent"];

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
      </main>
      <Footer />
    </div>
  );
}
