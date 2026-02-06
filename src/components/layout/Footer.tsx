import { Link } from "react-router-dom";

const footerLinks = {
  platform: [
    { name: "Werken in Onderwijs", href: "/werken-in-onderwijs" },
    { name: "Vacatures", href: "/vacatures" },
    { name: "Events", href: "/events" },
    { name: "Kennisbank", href: "/kennisbank" },
  ],
  support: [
    { name: "Contact", href: "/contact" },
    { name: "FAQ", href: "/kennisbank#faq" },
    { name: "Over DOOR", href: "/over-ons" },
  ],
  legal: [
    { name: "Privacyverklaring", href: "/privacy" },
    { name: "Algemene voorwaarden", href: "/voorwaarden" },
    { name: "Toegankelijkheid", href: "/toegankelijkheid" },
  ],
};

const partners = [
  "Onderwijsregio Rotterdam PO",
  "Onderwijsregio Rotterdam VO-MBO",
  "Gemeente Rotterdam",
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="container py-12 md:py-16">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <span className="text-lg font-bold text-primary-foreground">D</span>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-semibold leading-tight">DOOR</span>
                <span className="text-xs text-muted-foreground leading-tight">
                  Digitaal Onderwijsloket Rotterdam
                </span>
              </div>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs mb-6">
              Van eerste oriëntatie tot instroom in het onderwijs — persoonlijk begeleid door een AI-coach.
            </p>
            <div className="text-xs text-muted-foreground">
              <p className="font-medium mb-2">Partners:</p>
              <ul className="space-y-1">
                {partners.map((partner) => (
                  <li key={partner}>{partner}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Platform links */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Platform</h3>
            <ul className="space-y-2">
              {footerLinks.platform.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support links */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Ondersteuning</h3>
            <ul className="space-y-2">
              {footerLinks.support.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal links */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Juridisch</h3>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} DOOR - Onderwijsregio's Rotterdam. Alle rechten voorbehouden.
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>WCAG 2.1 AA</span>
            <span>•</span>
            <span>AVG-proof</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
