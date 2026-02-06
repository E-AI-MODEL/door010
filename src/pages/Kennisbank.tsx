import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowRight, Search, ChevronDown, ChevronUp, ExternalLink, BookOpen, FileText, HelpCircle } from "lucide-react";

const categories = [
  { id: "routes", name: "Routes naar leraarschap", icon: ArrowRight },
  { id: "bevoegdheden", name: "Bevoegdheden", icon: FileText },
  { id: "salaris", name: "Salaris & CAO", icon: BookOpen },
  { id: "faq", name: "Veelgestelde vragen", icon: HelpCircle },
];

const articles = [
  {
    id: 1,
    title: "Hoe word ik leraar basisonderwijs?",
    category: "routes",
    excerpt: "De route naar het basisonderwijs loopt via de Pabo. Ontdek wat je nodig hebt en hoe lang het duurt.",
  },
  {
    id: 2,
    title: "Zij-instromen: alles wat je moet weten",
    category: "routes",
    excerpt: "Heb je werkervaring en wil je overstappen naar het onderwijs? Lees hier over de mogelijkheden.",
  },
  {
    id: 3,
    title: "Eerste- en tweedegraads bevoegdheid uitgelegd",
    category: "bevoegdheden",
    excerpt: "Wat is het verschil tussen eerste- en tweedegraads? En welke heb je nodig voor welk niveau?",
  },
  {
    id: 4,
    title: "CAO Primair Onderwijs 2024-2025",
    category: "salaris",
    excerpt: "Bekijk de actuele salarisschalen en arbeidsvoorwaarden in het basisonderwijs.",
  },
  {
    id: 5,
    title: "CAO Voortgezet Onderwijs 2024-2025",
    category: "salaris",
    excerpt: "Bekijk de actuele salarisschalen en arbeidsvoorwaarden in het voortgezet onderwijs.",
  },
  {
    id: 6,
    title: "Subsidies voor zij-instromers",
    category: "routes",
    excerpt: "Er zijn verschillende subsidies beschikbaar voor zij-instromers. Lees welke voor jou gelden.",
  },
];

const faqs = [
  {
    question: "Wat verdient een leraar in het onderwijs?",
    answer: "Het salaris hangt af van je ervaring, sector en bevoegdheid. Een startende leraar in het PO verdient circa €2.800 bruto per maand, oplopend tot €5.500+ met ervaring. In het VO en MBO liggen de salarissen vergelijkbaar tot iets hoger.",
  },
  {
    question: "Heb ik een diploma nodig om voor de klas te staan?",
    answer: "Ja, je hebt een lesbevoegdheid nodig. Deze krijg je na het afronden van een lerarenopleiding. Bij zij-instroom kun je al wel starten voor de klas terwijl je de bevoegdheid haalt.",
  },
  {
    question: "Kan ik ook parttime werken in het onderwijs?",
    answer: "Zeker! Veel leraren werken parttime. In het onderwijs is dit gebruikelijk en goed te combineren met andere verplichtingen.",
  },
  {
    question: "Wat is het verschil tussen PO, VO en MBO?",
    answer: "PO staat voor Primair Onderwijs (basisschool, groep 1-8). VO is Voortgezet Onderwijs (middelbare school). MBO is Middelbaar Beroepsonderwijs (beroepsopleidingen na de middelbare school).",
  },
  {
    question: "Hoe lang duurt het om leraar te worden?",
    answer: "Een reguliere lerarenopleiding duurt 4 jaar. Bij zij-instroom kun je in 2 jaar een bevoegdheid halen terwijl je al werkt. Een universitaire eerstegraads opleiding duurt 1-2 jaar na je master.",
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
                  Artikelen
                </h2>
                
                <div className="space-y-4">
                  {filteredArticles.map((article) => (
                    <a
                      key={article.id}
                      href="#"
                      className="block bg-white border border-border rounded p-5 hover:border-primary/30 transition-colors group"
                    >
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors mb-2">
                        {article.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {article.excerpt}
                      </p>
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
                  Veelgestelde vragen
                </h2>

                <div className="space-y-3">
                  {faqs.map((faq, index) => (
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
