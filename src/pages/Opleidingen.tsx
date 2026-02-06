import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { ArrowRight, ExternalLink, Clock } from "lucide-react";
import { Link } from "react-router-dom";

// Echte opleidingsroutes uit Route_Steps JSON
const opleidingsRoutes = [
  {
    title: "Pabo (Leraar Basisonderwijs)",
    shortTitle: "Hbo-bachelor",
    duration: "4 jaar voltijd / deeltijd mogelijk",
    durationMonths: 48,
    niveau: "HBO",
    description: "De pabo leidt je op tot leraar in het primair onderwijs. Je leert kinderen van 4-12 jaar alle vakken. Met een bevoegdheid voor het primair onderwijs mag je lesgeven als groepsleerkracht in het po, inclusief speciaal onderwijs en praktijkonderwijs.",
    aanbieders: ["Hogeschool Rotterdam", "Thomas More Hogeschool", "Hogeschool Inholland"],
    sector: "PO",
    url: "https://www.studiekeuze123.nl/opleidingen/leraar-basisonderwijs-pabo",
  },
  {
    title: "Tweedegraads Lerarenopleiding",
    shortTitle: "Hbo-bachelor",
    duration: "4 jaar voltijd / deeltijd mogelijk",
    durationMonths: 48,
    niveau: "HBO",
    description: "Met een tweedegraads bevoegdheid mag je lesgeven in het vmbo, de onderbouw van havo/vwo en het mbo. Je specialiseert je in één of meerdere schoolvakken zoals Nederlands, Engels, Wiskunde, of vakken als Biologie en Geschiedenis.",
    aanbieders: ["Hogeschool Rotterdam", "Hogeschool Inholland"],
    sector: "VO/MBO",
    url: "https://www.studiekeuze123.nl/opleidingen?q=tweedegraads+lerarenopleiding",
  },
  {
    title: "Eerstegraads Lerarenopleiding (Universitair)",
    shortTitle: "Wo-master",
    duration: "1-2 jaar na master",
    durationMonths: 24,
    niveau: "Universitair",
    description: "De universitaire lerarenopleiding (ULO) leidt op tot eerstegraads docent. Hiermee mag je lesgeven op alle niveaus in het voortgezet onderwijs, inclusief bovenbouw havo/vwo. De opleiding is beschikbaar als éénjarige of tweejarige educatieve master.",
    aanbieders: ["Erasmus Universiteit Rotterdam", "Universiteit Leiden"],
    sector: "VO",
    url: "https://www.studiekeuze123.nl/opleidingen?q=eerstegraads+lerarenopleiding",
  },
  {
    title: "Hbo-master Eerstegraads",
    shortTitle: "Hbo-master",
    duration: "2 jaar deeltijd",
    durationMonths: 24,
    niveau: "HBO",
    description: "Na het behalen van een tweedegraads bevoegdheid kun je jouw bevoegdheid uitbreiden tot een eerstegraads bevoegdheid voor datzelfde schoolvak door middel van een hbo-master. De focus ligt op lesgeven in de bovenbouw van havo en vwo.",
    aanbieders: ["Hogeschool Rotterdam"],
    sector: "VO",
    url: "https://www.studiekeuze123.nl/opleidingen?q=eerstegraads+leraar",
  },
  {
    title: "Zij-instroom traject PO",
    shortTitle: "Zij-instroom",
    duration: "2 jaar (leren + werken)",
    durationMonths: 24,
    niveau: "HBO",
    description: "Combineer werken voor de klas met een verkorte opleiding. Je hebt minimaal een afgeronde hbo- of wo-opleiding nodig en slaagt voor een geschiktheidsonderzoek. Je krijgt intensieve begeleiding van school én opleiding.",
    aanbieders: ["Hogeschool Rotterdam", "Thomas More Hogeschool", "Hogeschool Inholland"],
    sector: "PO",
    url: "https://www.onderwijsloket.com/zij-instroom",
  },
  {
    title: "Zij-instroom traject VO/MBO",
    shortTitle: "Zij-instroom",
    duration: "2 jaar (leren + werken)",
    durationMonths: 24,
    niveau: "HBO",
    description: "Stap via zij-instroom over naar het voortgezet onderwijs of mbo. Je moet vakinhoudelijke kennis meebrengen uit je werkervaring of vooropleiding. Je werkt al voor de klas terwijl je de didactische vaardigheden leert.",
    aanbieders: ["Hogeschool Rotterdam", "Hogeschool Inholland"],
    sector: "VO/MBO",
    url: "https://www.onderwijsloket.com/zij-instroom",
  },
  {
    title: "PDG-traject (Pedagogisch Didactisch Getuigschrift)",
    shortTitle: "PDG",
    duration: "1 jaar",
    durationMonths: 12,
    niveau: "HBO",
    description: "Met een pedagogisch-didactisch getuigschrift (PDG), in combinatie met een geschiktheidsverklaring, mag je lesgeven op een mbo-instelling. Je moet al vakinhoudelijke kennis en ervaring hebben. Met minstens 3 jaar werkervaring en hbo-denkniveau kun je ook zonder hbo-diploma starten.",
    aanbieders: ["Hogeschool Rotterdam", "Hogeschool Inholland"],
    sector: "MBO",
    url: "https://www.onderwijsloket.com/pdg-traject",
  },
  {
    title: "Academie voor Lichamelijke Opvoeding (ALO)",
    shortTitle: "Ongegradeerd",
    duration: "4 jaar voltijd",
    durationMonths: 48,
    niveau: "HBO",
    description: "Bij de ALO kun je een ongegradeerde bevoegdheid voor docent lichamelijke opvoeding halen. Hiermee mag je lesgeven in elke onderwijssector: primair onderwijs, voortgezet onderwijs én mbo.",
    aanbieders: ["Hogeschool Rotterdam"],
    sector: "PO/VO/MBO",
    url: "https://www.studiekeuze123.nl/opleidingen?q=lichamelijke+opvoeding",
  },
];

const externalLinks = [
  {
    title: "Onderwijsloket",
    description: "Landelijke informatie over routes naar het leraarschap",
    url: "https://www.onderwijsloket.com",
  },
  {
    title: "Onderwijsloket Rotterdam",
    description: "Regionale begeleiding voor zij-instromers in Rotterdam",
    url: "https://www.onderwijsloketrotterdam.nl",
  },
  {
    title: "Studiekeuze123",
    description: "Vergelijk alle lerarenopleidingen in Nederland",
    url: "https://www.studiekeuze123.nl",
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
                    <span className="text-xs font-medium px-2 py-1 bg-secondary/50 text-secondary-foreground rounded">
                      {route.shortTitle}
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {route.title}
                  </h3>
                  
                  <p className="text-muted-foreground mb-4 text-sm">
                    {route.description}
                  </p>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <Clock className="h-4 w-4" />
                    {route.duration}
                  </div>

                  <div className="text-sm mb-4">
                    <span className="font-medium text-foreground">Aanbieders in de regio:</span>
                    <ul className="mt-1 text-muted-foreground">
                      {route.aanbieders.map((aanbieder, i) => (
                        <li key={i}>• {aanbieder}</li>
                      ))}
                    </ul>
                  </div>

                  <Button variant="outline" size="sm" asChild>
                    <a href={route.url} target="_blank" rel="noopener noreferrer">
                      Meer informatie
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                </div>
              ))}
            </div>

            {/* External links */}
            <div className="bg-muted rounded p-8">
              <h3 className="text-lg font-semibold text-foreground mb-6">
                Meer informatie over opleidingen
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
