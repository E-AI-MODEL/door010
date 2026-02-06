import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ArrowRight, ExternalLink } from "lucide-react";

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
              Bekijk alle open dagen, webinars, informatiesessies en meeloopdagen in de regio Rotterdam.
            </p>
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
