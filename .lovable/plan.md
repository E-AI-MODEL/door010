

## De twee widgets samenvoegen

### Probleem
Er bestaan twee aparte chatwidgets:
- **PublicChatWidget** -- de actieve widget die op elke pagina draait (vanuit App.tsx)
- **AIWidgetSection** -- een oud, niet meer gebruikt bestand dat nergens wordt geimporteerd

De mail-, telefoon- en Doortje-iconen zijn per ongeluk aan het ongebruikte bestand (`AIWidgetSection`) toegevoegd. Ze moeten naar de actieve widget (`PublicChatWidget`).

### Plan

**Stap 1: Iconen toevoegen aan PublicChatWidget**
De header van `PublicChatWidget.tsx` krijgt dezelfde drie iconen die nu in `AIWidgetSection` staan:
- Bot-icoon met link naar `https://doortje-embedded-bot.replit.app/`
- Mail-icoon met `mailto:info@onderwijsloketrotterdam.nl`
- Telefoon-icoon met `tel:+31107940000`

Deze komen naast de bestaande sluit-knop (X) in de header.

**Stap 2: AIWidgetSection verwijderen**
Het bestand `src/components/home/AIWidgetSection.tsx` wordt verwijderd omdat het nergens meer wordt gebruikt en alleen verwarring veroorzaakt.

### Technische details

**Bestand: `src/components/chat/PublicChatWidget.tsx`**
- Import `Mail`, `Phone`, `Bot` van lucide-react
- In het header-blok (naast de X-knop) drie `<a>` tags toevoegen met dezelfde styling als in AIWidgetSection
- Volgorde: Bot | Mail | Phone | X

**Bestand: `src/components/home/AIWidgetSection.tsx`**
- Volledig verwijderen (geen imports meer in het project)

