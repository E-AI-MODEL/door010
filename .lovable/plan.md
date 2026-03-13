

# Dashboard UX Redesign: Smart Topic Menu + Chat-First Layout

## Analyse huidige situatie

Het dashboard op 393px breed (mobiel) toont nu:
1. **PhaseProgress** — horizontale fase-balk (bovenaan)
2. **ProfileTimeline** — uitklapbare fase-accordeon met veel tekst (linkerkolom)
3. **ProfileCard** — kleine profielkaart (linkerkolom)
4. **DashboardChat** — inline chatvenster (rechterkolom, op mobiel onderaan)

**Problemen**:
- Op mobiel staat de chat helemaal onderaan, na 2 grote blokken. De gebruiker moet scrollen om bij de kern te komen.
- De ProfileTimeline bevat 5 uitklapbare fasen met elk 5-6 bullets + 3 links. Dit is informatieoverload.
- Er is geen "slim menu" dat gebruikers begeleidt naar relevante thema's op basis van hun fase en slots.
- De `visibleMessages` toont maar 6 berichten — op mobiel een klein venster.
- Actions/chips zijn klein en niet goed vindbaar.

## Plan

### 1. Layout omdraaien: Chat-first

**Dashboard.tsx** krijgt een nieuwe indeling:

```text
MOBIEL (393px):
┌─────────────────────┐
│ PhaseProgress (slim) │  ← compact, 1 regel
├─────────────────────┤
│ Smart Topic Menu    │  ← NIEUW: burgermenu met thema's
├─────────────────────┤
│ DashboardChat       │  ← HOOFDELEMENT, neemt meeste ruimte
├─────────────────────┤
│ ProfileCard (mini)  │  ← compact, inklapbaar
└─────────────────────┘

DESKTOP (lg+):
┌────────────────┬────────────────────────┐
│ Smart Menu     │  DashboardChat         │
│ (sidebar-stijl)│  (hoofdgebied)         │
│                │                        │
│ ProfileCard    │                        │
│ (compact)      │                        │
└────────────────┴────────────────────────┘
```

### 2. Smart Topic Menu — het "burgermenu"

Nieuw component `TopicMenu.tsx` dat thema's en subthema's toont op basis van:
- **Huidige fase** (uit `phaseData` + `phase-detector-rules.json`)
- **Bekende slots** (school_type, role_interest, etc.)
- **SSOT content** (uit `route-questions.json` en `route-steps.json`)

**Structuur**:

```text
▼ Jouw fase: Oriënteren
  ├── Routes bekijken         → stuurt vraag naar chat
  ├── Bevoegdheden uitgelegd  → stuurt vraag naar chat
  └── Kosten en duur          → stuurt vraag naar chat

▼ Veelgestelde vragen
  ├── Zij-instroom uitgelegd  → stuurt vraag naar chat
  ├── Salaris leraar          → stuurt vraag naar chat
  └── Toelatingseisen         → stuurt vraag naar chat

▼ Snelle acties
  ├── 🔗 Vacatures bekijken  → navigeert naar /vacatures
  ├── 🔗 Events              → navigeert naar /events
  └── 🔗 Opleidingen         → navigeert naar /opleidingen
```

Op mobiel: een collapsible panel boven de chat (standaard ingeklapt na eerste interactie).
Op desktop: een zijpaneel links naast de chat.

**Fase-specifieke thema's** komen uit `phaseData[currentPhase].actions` + `phaseData[currentPhase].tips` + de `phaseContent` uit ProfileTimeline. Het menu genereert per thema een pre-filled chatbericht. Klik op "Routes bekijken" stuurt `"Welke routes zijn er voor mij om leraar te worden?"` naar de chat.

**Slot-afhankelijke thema's**: als `school_type === "PO"`, toon PO-specifieke subthema's (Pabo, zij-instroom PO). Data komt uit `route-questions.json` en `route-steps.json` die al 30+ routes en 1200+ vragen bevatten.

### 3. DashboardChat UX-verbeteringen

- **Meer berichten zichtbaar**: verhoog `visibleMessages` van 6 naar 12 (of verwijder limiet, scroll-container handelt het)
- **Scroll-fixes**: voeg `pendingIntake` en `pendingPhaseSuggestion` toe aan scroll-effect dependencies
- **CollapsibleAnswer expand**: voeg `onToggle` callback toe die scroll triggert
- **Input verplaatst**: sticky bottom input met grotere hitbox op mobiel
- **Welcome bericht**: korter en met 3 fase-specifieke klikbare suggesties in plaats van platte tekst

### 4. ProfileTimeline → compact

De huidige ProfileTimeline (288 regels, 5 uitklapbare fasen met bullets) wordt vervangen door een compacte fase-indicator die samenwerkt met het TopicMenu:
- Op desktop: een smalle kaart met alleen fase-naam + voortgangs-dots
- Op mobiel: verborgen (informatie zit nu in PhaseProgress + TopicMenu)

### 5. Vorige DB iteratie meenemen (trusted_sources)

De `trusted_sources` tabel is aangemaakt maar heeft nog geen backoffice-UI. Dit plan voegt een "Bronnen" tab toe aan de Backoffice:
- Tabel met URL, label, categorie, actief-toggle
- Toevoegen/verwijderen formulier
- Alleen zichtbaar voor advisors/admins

## Bestanden

| Bestand | Actie |
|---------|-------|
| `src/components/dashboard/TopicMenu.tsx` | **NIEUW** — slim thema-menu op basis van fase + slots |
| `src/pages/Dashboard.tsx` | Layout omdraaien: chat-first, TopicMenu sidebar |
| `src/components/dashboard/DashboardChat.tsx` | Scroll-fixes, meer berichten, welcome-suggesties |
| `src/components/chat/CollapsibleAnswer.tsx` | `onToggle` callback voor scroll |
| `src/components/dashboard/PhaseProgress.tsx` | Compacter: altijd fasenamen tonen |
| `src/components/dashboard/DashboardCards.tsx` | ProfileCard compacter |
| `src/components/profile/ProfileTimeline.tsx` | Geen wijzigingen, maar niet meer op dashboard (wel op /profile) |
| `src/pages/Backoffice.tsx` | Nieuwe "Bronnen" tab voor trusted_sources beheer |
| `src/components/backoffice/TrustedSourcesTab.tsx` | **NIEUW** — CRUD UI voor bronnen-whitelist |

## Sequentie

1. TopicMenu component bouwen (data uit phaseData + route-questions + slots)
2. Dashboard layout herstructureren (chat-first, TopicMenu als sidebar/panel)
3. DashboardChat UX fixes (scroll, berichten, welcome)
4. CollapsibleAnswer onToggle
5. ProfileTimeline verwijderen van dashboard (blijft op /profile)
6. Backoffice Bronnen-tab

