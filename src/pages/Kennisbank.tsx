import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowRight, Search, ChevronDown, ChevronUp, ExternalLink, BookOpen, FileText, HelpCircle, GraduationCap, Briefcase } from "lucide-react";

const categories = [
  { id: "routes", name: "Routes naar leraarschap", icon: ArrowRight },
  { id: "bevoegdheden", name: "Bevoegdheden", icon: FileText },
  { id: "salaris", name: "Salaris & CAO", icon: BookOpen },
  { id: "zij-instroom", name: "Zij-instroom", icon: Briefcase },
  { id: "faq", name: "Veelgestelde vragen", icon: HelpCircle },
];

// Echte artikelen gebaseerd op route steps en phase detector data
const articles = [
  {
    id: 1,
    title: "Hoe word ik leraar basisonderwijs?",
    category: "routes",
    excerpt: "De route naar het basisonderwijs loopt via de Pabo. Met een bevoegdheid voor het primair onderwijs mag je lesgeven als groepsleerkracht in het po, inclusief speciaal onderwijs en praktijkonderwijs.",
    url: "https://www.onderwijsloket.com/leraar-worden/primair-onderwijs",
  },
  {
    id: 2,
    title: "Zij-instromen: alles wat je moet weten",
    category: "zij-instroom",
    excerpt: "Met een zij-instroomtraject kun je in 2 jaar een bevoegdheid halen terwijl je al voor de klas staat. Je hebt een hbo- of wo-diploma nodig en moet slagen voor een geschiktheidsonderzoek.",
    url: "https://www.onderwijsloket.com/zij-instroom",
  },
  {
    id: 3,
    title: "Eerste- en tweedegraads bevoegdheid uitgelegd",
    category: "bevoegdheden",
    excerpt: "Een tweedegraads bevoegdheid geeft je toegang tot vmbo, onderbouw havo/vwo en mbo. Een eerstegraads bevoegdheid is nodig voor bovenbouw havo/vwo.",
    url: "https://www.onderwijsloket.com/bevoegdheden",
  },
  {
    id: 4,
    title: "PDG-traject voor het MBO",
    category: "zij-instroom",
    excerpt: "Met een pedagogisch-didactisch getuigschrift (PDG) mag je lesgeven op een mbo-instelling. Je moet vakinhoudelijke kennis en ervaring al hebben. De opleiding duurt ongeveer 1 jaar.",
    url: "https://www.onderwijsloket.com/pdg-traject",
  },
  {
    id: 5,
    title: "CAO Primair Onderwijs 2024-2025",
    category: "salaris",
    excerpt: "Bekijk de actuele salarisschalen en arbeidsvoorwaarden in het basisonderwijs. Een startende leraar verdient circa €2.800 bruto per maand.",
    url: "https://www.poraad.nl/cao-primair-onderwijs",
  },
  {
    id: 6,
    title: "CAO Voortgezet Onderwijs 2024-2025",
    category: "salaris",
    excerpt: "Bekijk de actuele salarisschalen en arbeidsvoorwaarden in het voortgezet onderwijs. Salarissen zijn afhankelijk van je bevoegdheid en ervaring.",
    url: "https://www.vo-raad.nl/cao-vo",
  },
  {
    id: 7,
    title: "Subsidies en regelingen voor zij-instromers",
    category: "zij-instroom",
    excerpt: "Er zijn verschillende subsidies beschikbaar voor zij-instromers, waaronder de subsidieregeling zij-instroom en tegemoetkoming studiekosten.",
    url: "https://www.onderwijsloket.com/subsidies",
  },
  {
    id: 8,
    title: "Universitaire Pabo: combineer wo en hbo",
    category: "routes",
    excerpt: "Je kunt de pabo combineren met een wo-bachelor Onderwijswetenschappen of Pedagogische Wetenschappen. In ca. 4 jaar behaal je een hbo-bachelor én een wo-bachelor.",
    url: "https://www.studiekeuze123.nl/opleidingen?q=universitaire+pabo",
  },
  {
    id: 9,
    title: "Hbo-master: van tweede- naar eerstegraads",
    category: "routes",
    excerpt: "Na een tweedegraads bevoegdheid kun je via een hbo-master doorstromen naar eerstegraads. De focus ligt op lesgeven in de bovenbouw van havo en vwo.",
    url: "https://www.studiekeuze123.nl/opleidingen?q=eerstegraads+leraar",
  },
  {
    id: 10,
    title: "Ongegradeerde bevoegdheden (LO, Kunstvakken)",
    category: "bevoegdheden",
    excerpt: "Voor lichamelijke opvoeding en kunstvakken kun je een ongegradeerde bevoegdheid halen. Hiermee mag je lesgeven in alle onderwijssectoren.",
    url: "https://www.onderwijsloket.com/ongegradeerde-bevoegdheden",
  },
];

// Echte FAQs gebaseerd op phase detector question map
const faqs = [
  {
    question: "Wat verdient een leraar in het onderwijs?",
    answer: "Het salaris hangt af van je ervaring, sector en bevoegdheid. Een startende leraar in het PO verdient circa €2.800 bruto per maand, oplopend tot €5.500+ met ervaring. In het VO liggen de salarissen vergelijkbaar. In het MBO zijn ze afhankelijk van je inschaling (LB, LC, LD).",
  },
  {
    question: "Heb ik een diploma nodig om voor de klas te staan?",
    answer: "Ja, je hebt een lesbevoegdheid nodig. Deze krijg je na het afronden van een lerarenopleiding. Bij zij-instroom kun je al wel starten voor de klas terwijl je de bevoegdheid haalt, mits je slaagt voor het geschiktheidsonderzoek.",
  },
  {
    question: "Wat is het verschil tussen een zij-instroomtraject en deeltijdstudie?",
    answer: "Bij zij-instroom werk je al voor de klas en volg je een verkort traject van 2 jaar. Bij deeltijd studeer je naast je huidige baan en doe je later stages. Zij-instroom is intensiever maar je verdient direct een salaris in het onderwijs.",
  },
  {
    question: "Kan ik ook parttime werken in het onderwijs?",
    answer: "Zeker! Veel leraren werken parttime (0.4 - 0.8 FTE). In het onderwijs is dit gebruikelijk en goed te combineren met andere verplichtingen. Bij zij-instroom werk je meestal minimaal 0.5 FTE.",
  },
  {
    question: "Wat is het verschil tussen PO, VO en MBO?",
    answer: "PO staat voor Primair Onderwijs (basisschool, groep 1-8, kinderen van 4-12 jaar). VO is Voortgezet Onderwijs (vmbo, havo, vwo). MBO is Middelbaar Beroepsonderwijs met niveaus 1 t/m 4.",
  },
  {
    question: "Hoe lang duurt het om leraar te worden?",
    answer: "Een reguliere lerarenopleiding duurt 4 jaar (voltijd) of 4-5 jaar (deeltijd). Bij zij-instroom kun je in 2 jaar een bevoegdheid halen. Een universitaire eerstegraads opleiding duurt 1-2 jaar na je wo-master.",
  },
  {
    question: "Welke route past het beste bij mijn vooropleiding?",
    answer: "Dat hangt af van je huidige diploma en werkervaring. Met een hbo/wo-diploma kun je vaak zij-instromen. Zonder hogere opleiding kun je via mbo-4 → pabo of vavo → pabo alsnog leraar worden. De AI-coach kan je hierbij adviseren.",
  },
  {
    question: "Wat houdt het geschiktheidsonderzoek in?",
    answer: "Het geschiktheidsonderzoek toetst of je geschikt bent voor het leraarschap. Het bestaat uit assessments, gesprekken en soms proeflessen. Je wordt beoordeeld op vakinhoud, didactische aanleg en pedagogische vaardigheden.",
  },
  {
    question: "Kan ik zij-instromen voor een vak waar ik geen achtergrond in heb?",
    answer: "Nee, voor zij-instroom moet je vakinhoudelijke kennis meebrengen. Als je bijvoorbeeld wiskunde wilt geven, heb je een wiskundige achtergrond nodig. Voor een ander vak kun je een reguliere opleiding volgen.",
  },
  {
    question: "Zijn er subsidies of financiële regelingen voor zij-instromers?",
    answer: "Ja, er zijn verschillende regelingen: de subsidieregeling zij-instroom (voor scholen), studiefinanciering voor 30-plussers (levenlanglerenkrediet), en soms regionale tegemoetkomingen. Neem contact op met het onderwijsloket voor persoonlijk advies.",
  },
];

export default function Kennisbank() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const filteredArticles = articles.filter((article) => {
    const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.excerpt.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || article.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredFaqs = faqs.filter((faq) => {
    return faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
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
                Kennisbank
              </h1>
            </div>
            <p className="text-primary-foreground/90 max-w-2xl mb-6">
              Vind antwoorden op al je vragen over werken in het onderwijs.
            </p>

            {/* Search */}
            <div className="relative max-w-xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Zoek in de kennisbank..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white h-12 text-base"
              />
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="bg-muted py-6 border-b border-border">
          <div className="container">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={!selectedCategory ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(null)}
                className={!selectedCategory ? "bg-primary" : "bg-white"}
              >
                Alle onderwerpen
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={selectedCategory === cat.id ? "bg-primary" : "bg-white"}
                >
                  {cat.name}
                </Button>
              ))}
            </div>
          </div>
        </section>

        {/* Articles */}
        <section className="py-12">
          <div className="container">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Articles list */}
              <div className="lg:col-span-2">
                <h2 className="text-xl font-semibold text-foreground mb-6">
                  Artikelen ({filteredArticles.length})
                </h2>
                
                <div className="space-y-4">
                  {filteredArticles.map((article) => (
                    <a
                      key={article.id}
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block bg-white border border-border rounded p-5 hover:border-primary/30 transition-colors group"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors mb-2">
                            {article.title}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {article.excerpt}
                          </p>
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0 mt-1 ml-4" />
                      </div>
                    </a>
                  ))}
                </div>

                {filteredArticles.length === 0 && (
                  <p className="text-muted-foreground py-8">
                    Geen artikelen gevonden met deze zoekopdracht.
                  </p>
                )}
              </div>

              {/* FAQ sidebar */}
              <div id="faq">
                <h2 className="text-xl font-semibold text-foreground mb-6">
                  Veelgestelde vragen ({filteredFaqs.length})
                </h2>

                <div className="space-y-3">
                  {filteredFaqs.map((faq, index) => (
                    <div
                      key={index}
                      className="bg-white border border-border rounded overflow-hidden"
                    >
                      <button
                        onClick={() => setOpenFaq(openFaq === index ? null : index)}
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
                      >
                        <span className="font-medium text-foreground text-sm pr-4">
                          {faq.question}
                        </span>
                        {openFaq === index ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                      </button>
                      {openFaq === index && (
                        <div className="px-4 pb-4">
                          <p className="text-sm text-muted-foreground">
                            {faq.answer}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* External links */}
        <section className="bg-muted py-12">
          <div className="container">
            <h2 className="text-xl font-semibold text-foreground mb-6">
              Handige links
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <a
                href="https://www.onderwijsloket.com"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white border border-border rounded p-4 hover:border-primary/30 transition-colors group flex items-start justify-between"
              >
                <div>
                  <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                    Onderwijsloket
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Landelijk informatiepunt
                  </p>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
              </a>
              <a
                href="https://www.onderwijsloketrotterdam.nl"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white border border-border rounded p-4 hover:border-primary/30 transition-colors group flex items-start justify-between"
              >
                <div>
                  <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                    Onderwijsloket Rotterdam
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Regionale begeleiding
                  </p>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
              </a>
              <a
                href="https://www.rijksoverheid.nl/onderwerpen/werken-in-het-onderwijs"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white border border-border rounded p-4 hover:border-primary/30 transition-colors group flex items-start justify-between"
              >
                <div>
                  <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                    Rijksoverheid
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Officiële informatie
                  </p>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
              </a>
              <a
                href="https://www.studiekeuze123.nl"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white border border-border rounded p-4 hover:border-primary/30 transition-colors group flex items-start justify-between"
              >
                <div>
                  <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                    Studiekeuze123
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Vergelijk opleidingen
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
