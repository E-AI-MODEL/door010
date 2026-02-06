import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { ArrowRight, ExternalLink, GraduationCap, Clock, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

const opleidingsRoutes = [
  {
    title: "Pabo (Leraar Basisonderwijs)",
    duration: "4 jaar voltijd / deeltijd mogelijk",
    niveau: "HBO",
    description: "Word leraar in het basisonderwijs. Je leert kinderen van 4-12 jaar alle vakken.",
    aanbieders: ["Hogeschool Rotterdam", "Thomas More Hogeschool"],
    sector: "PO",
  },
  {
    title: "Tweedegraads Lerarenopleiding",
    duration: "4 jaar voltijd / deeltijd mogelijk",
    niveau: "HBO",
    description: "Word docent in je vakgebied voor vmbo, havo onderbouw en mbo.",
    aanbieders: ["Hogeschool Rotterdam"],
    sector: "VO/MBO",
  },
  {
    title: "Eerstegraads Lerarenopleiding",
    duration: "1-2 jaar na master",
    niveau: "Universitair",
    description: "Word docent voor alle niveaus in het voortgezet onderwijs.",
    aanbieders: ["Erasmus Universiteit Rotterdam"],
    sector: "VO",
  },
  {
    title: "Zij-instroom traject",
    duration: "2 jaar (leren + werken)",
    niveau: "HBO",
    description: "Combineer werken voor de klas met een verkorte opleiding. Voor mensen met relevante werkervaring.",
    aanbieders: ["Diverse hogescholen"],
    sector: "PO/VO/MBO",
  },
];

const externalLinks = [
  {
    title: "Studiekeuze123",
    description: "Vergelijk alle lerarenopleidingen in Nederland",
    url: "https://www.studiekeuze123.nl",
  },
  {
    title: "Onderwijsloket",
    description: "Landelijke informatie over routes naar het leraarschap",
    url: "https://www.onderwijsloket.com",
  },
  {
    title: "Word leraar",
    description: "Officiële website van de Rijksoverheid over leraar worden",
    url: "https://www.wordleraar.nl",
  },
];

export default function Opleidingen() {
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
                Opleidingen
              </h1>
            </div>
            <p className="text-primary-foreground/90 max-w-2xl">
              Ontdek welke opleiding bij jou past. Van Pabo tot zij-instroom — er is altijd een route naar het onderwijs.
            </p>
          </div>
        </section>

        {/* Routes overview */}
        <section className="py-12 md:py-16">
          <div className="container">
            <h2 className="text-xl md:text-2xl font-bold text-foreground mb-8">
              <span className="text-primary">ROUTES</span> NAAR HET LERAARSCHAP
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              {opleidingsRoutes.map((route, index) => (
                <div
                  key={index}
                  className="bg-white border border-border rounded p-6 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-medium px-2 py-1 bg-primary/10 text-primary rounded uppercase">
                      {route.sector}
                    </span>
                    <span className="text-xs font-medium px-2 py-1 bg-muted text-foreground rounded">
                      {route.niveau}
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {route.title}
                  </h3>
                  
                  <p className="text-muted-foreground mb-4">
                    {route.description}
                  </p>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <Clock className="h-4 w-4" />
                    {route.duration}
                  </div>

                  <div className="text-sm">
                    <span className="font-medium text-foreground">Aanbieders in de regio:</span>
                    <ul className="mt-1 text-muted-foreground">
                      {route.aanbieders.map((aanbieder, i) => (
                        <li key={i}>• {aanbieder}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>

            {/* External links */}
            <div className="bg-muted rounded p-8">
              <h3 className="text-lg font-semibold text-foreground mb-6">
                Meer informatie over opleidingen
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {externalLinks.map((link, index) => (
                  <a
                    key={index}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white border border-border rounded p-4 hover:border-primary/30 transition-colors group"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-foreground group-hover:text-primary transition-colors">
                          {link.title}
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {link.description}
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

        {/* CTA */}
        <section className="bg-secondary text-secondary-foreground py-12">
          <div className="container text-center">
            <h2 className="text-xl md:text-2xl font-bold mb-4">
              Weet je niet welke route bij je past?
            </h2>
            <p className="text-secondary-foreground/80 mb-6 max-w-lg mx-auto">
              Onze AI-coach helpt je graag met persoonlijk advies over de beste route naar jouw carrière in het onderwijs.
            </p>
            <Button className="bg-primary hover:bg-primary/90" asChild>
              <Link to="/">
                <ArrowRight className="mr-2 h-4 w-4" />
                Vraag het de AI-coach
              </Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
