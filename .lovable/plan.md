

## Refactor: Orchestra/LLM scheiding + dynamische SSOT-kennis

### Drie problemen die we oplossen

**A. Links in prompt zorgen voor rommelige output**
De LLM krijgt links in de `DYNAMISCHE CONTEXT` (regel 222) en gaat ze herhalen, opsommen of als CTA gebruiken. Tegelijkertijd stuurt de server ook actions als knoppen. Resultaat: dubbel en niet-nuchter.

**B. Twee gedupliceerde mega-prompts**
`DOORAI_SYSTEM_PROMPT` (95 regels) en `DOORAI_SYSTEM_PROMPT_AUTH` (102 regels) delen 70% van hun inhoud. Wijzigingen moeten op twee plekken worden doorgevoerd en lopen uit de pas.

**C. SSOT-data wordt niet dynamisch gebruikt**
De `KNOWLEDGE_BLOCKS` zijn handmatig geschreven samenvattingen. De echte data in `route-steps.json` (3.440 regels met FAQ's, artikelen), `route-questions.json` (1.284 regels met functiebeschrijvingen) en `regional-education-desks.json` (16.728 regels met 20+ loketten) wordt niet gelezen. Bij updates van de SSOT verouderen de blokken.

### Wat we doen

#### Stap 1: Links uit de prompt, naar UI-payload

Verwijder `injectLinks()` uit `assembleContext()`. Maak een nieuwe `computeLinks()` functie die een array `{ label, href }` retourneert. Deze wordt als apart veld meegestuurd in het SSE actions-event:

```text
data: {"actions": [...], "links": [...]}
```

De frontend (DashboardChat.tsx en Chat.tsx) krijgt een `latestLinks` state en rendert link-chips onder de action-knoppen.

#### Stap 2: DRY prompt - core + appendix

Vervang de twee mega-prompts door:

- `DOORAI_CORE`: gedeelde regels (identiteit, gedragsregels, stijl, verboden/voorkeurszinnen, scope/veiligheid) -- ongeveer 50 regels
- `WIDGET_APPENDIX`: kort, wegwijzer, 1-3 zinnen, link-first -- ongeveer 8 regels
- `DASHBOARD_APPENDIX`: VORM A/B/C, geen vraagtekens, max 90 woorden, SSOT-vraag wordt apart toegevoegd -- ongeveer 15 regels

De prompt wordt `DOORAI_CORE + (mode === "authenticated" ? DASHBOARD_APPENDIX : WIDGET_APPENDIX) + dynamicContext`.

#### Stap 3: Dynamische SSOT-kennis uit de JSON-bestanden

Dit is het kernstuk dat in eerdere versies ontbrak. In plaats van alleen hardcoded `KNOWLEDGE_BLOCKS` te gebruiken, worden de JSON-bestanden bij opstart van de edge function ingelezen en als lookup-tabellen beschikbaar gemaakt.

**route-questions.json**: Functiebeschrijvingen worden geextraheerd per antwoord-titel (bijv. "Leraar", "Onderwijsondersteunend personeel", "Instructeur"). Wanneer een slot als `role_interest` matcht, wordt de originele beschrijving uit de SSOT gebruikt in plaats van een handmatige kopie.

**route-steps.json**: Routes worden geindexeerd op `slug` (bijv. "wo-f", "hbom"). Wanneer een `credential_goal` of specifieke route relevant is, wordt de `body.content[0].content[0].text` (de inleidende paragraaf) als kennisfragment meegegeven. FAQ-teksten worden niet meegestuurd (te lang), maar het bestaan van FAQ's wordt vermeld.

**regional-education-desks.json**: Loketten worden geindexeerd op `regions` en `cities_municipalities`. Wanneer `region_preference` een bekende regio of stad bevat, wordt het juiste loket gevonden met naam, email, website en consultdienst-URL. Dit vervangt het hardcoded "regio_rotterdam" blok en maakt alle 20+ loketten beschikbaar.

**Implementatie**: Drie lookup-functies bovenin de edge function:

- `findRoleDescription(roleName)`: zoekt in route-questions naar de beschrijving bij een antwoord-titel
- `findRouteStep(slug)`: haalt de inleidende tekst op voor een route uit route-steps
- `findRegionalDesk(regionOrCity)`: zoekt het juiste loket op basis van regio of stad

De `resolveKnowledge()` functie gebruikt deze lookups als primaire bron en valt terug op de bestaande `KNOWLEDGE_BLOCKS` als er geen match is.

De JSON-bestanden worden in de edge function als `const` geimporteerd (ze zijn statisch en veranderen niet tijdens runtime). Ze worden niet volledig in de prompt gestopt -- alleen het relevante fragment (max 80 woorden per blok, max 3 blokken).

#### Stap 4: Frontend aanpassen voor links-payload

DashboardChat.tsx en Chat.tsx:
- Nieuwe state: `latestLinks` (array van `{ label, href }`)
- SSE parse-blok: herken `parsed.links` naast `parsed.actions`
- Render: compacte link-chips onder de action-knoppen (Link component van react-router-dom)

### Wat er NIET verandert

| Onderdeel | Status |
|-----------|--------|
| Phase detector (client-side) | Ongewijzigd |
| SSOT-vragen selectie | Ongewijzigd |
| Loop-preventie | Ongewijzigd |
| homepage-coach edge function | Ongewijzigd |
| PublicChatWidget | Ongewijzigd |
| Backoffice AdvisorChatPanel | Ongewijzigd |
| Stream filter (emdash) | Ongewijzigd |
| SSOT-vraag server-side append | Ongewijzigd |
| Actions server-side selectie | Ongewijzigd |
| useChatConversation hook | Ongewijzigd |
| ChatSuggestions component | Ongewijzigd |
| Tone Selector | Behouden |
| Profile Interpreter | Behouden |

### Wat er WEL verandert

| Bestand | Wijziging |
|---------|-----------|
| `supabase/functions/doorai-chat/index.ts` | 1. Twee mega-prompts worden 1 core + 2 appendices. 2. `injectLinks()` verwijderd uit assembleContext, vervangen door `computeLinks()` die links als UI-payload stuurt. 3. Drie SSOT-lookup functies toegevoegd die de JSON-bestanden lezen. 4. `resolveKnowledge()` gebruikt SSOT-lookups als primaire bron. 5. SSE stream stuurt `links` mee in het actions-event. 6. Ongebruikte `PHASE_RULES` constante verwijderd. |
| `src/components/dashboard/DashboardChat.tsx` | `latestLinks` state. Parse `parsed.links` uit SSE. Render link-chips onder actions. |
| `src/pages/Chat.tsx` | Zelfde links-verwerking als DashboardChat. |

### Dataflow na refactor

```text
Edge function start
  |
  v
JSON bestanden inlezen (eenmalig als const)
  - route-questions.json -> functiebeschrijvingen index
  - route-steps.json -> route-paragrafen index  
  - regional-education-desks.json -> loket index per regio/stad
  |
  v
Per chat-beurt:
  |
  +-- resolveKnowledge(slots, phase)
  |     1. Zoek functiebeschrijving via findRoleDescription()
  |     2. Zoek route-info via findRouteStep()
  |     3. Zoek regionaal loket via findRegionalDesk()
  |     4. Fallback naar KNOWLEDGE_BLOCKS als geen match
  |     -> Max 3 fragmenten, max 80 woorden elk
  |
  +-- selectTone(phase, slotsCount) -> toonblok (ongewijzigd)
  |
  +-- interpretProfile(profileMeta) -> profielzin (ongewijzigd)
  |
  +-- computeLinks(mode, phase, slots)
  |     -> Array { label, href } voor UI (niet in prompt)
  |
  +-- assembleContext() -> dynamisch contextblok (zonder links)
  |
  v
DOORAI_CORE + APPENDIX + dynamicContext -> LLM call
  |
  v
Stream -> emdash filter -> SSOT-vraag append -> { actions, links } event
  |
  v
Frontend: chat tekst + action knoppen + link chips (gescheiden)
```

### Risico's en mitigatie

| Risico | Mitigatie |
|--------|----------|
| JSON-bestanden zijn groot (21.000+ regels totaal) | Worden als const geladen, niet in prompt. Alleen relevante fragmenten (max 240 woorden per beurt). |
| Edge function cold start iets trager | JSON parsing is eenmalig en snel (milliseconden). Geen merkbaar verschil. |
| Functiebeschrijvingen uit route-questions kunnen lang zijn | Truncatie op 80 woorden per fragment. |
| Niet elke regio heeft een loket | Fallback naar algemene tekst "Zoek een onderwijsloket in je regio via onderwijsloketten.nl". |

