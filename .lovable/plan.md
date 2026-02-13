

## Meta Chat Coordinator: Volledige contextorkestratie voor de ingelogde chat

### Wat het is

Een serverside orchestratielaag in de `doorai-chat` edge function die per beurt dynamisch de juiste context, toon, kennisblokken en links assembleert. Dit vervangt het huidige systeem van hardcoded kennisblokken en statische prompt-opbouw.

### Huidige situatie - wat er nu staat

De chatinfrastructuur bestaat uit meerdere lagen die met elkaar verbonden zijn:

```text
PUBLIEKE STROOM                          INGELOGDE STROOM
homepage-coach (edge fn)                 doorai-chat (edge fn)
  - Statische system prompt                - Dubbele system prompt (widget / auth)
  - Geen slots/fase-detectie               - Ontvangt detector payload van client
  - 2-zins antwoorden + link               - SSOT-vraag wordt server-side toegevoegd
  - Funnel-state in PublicChatWidget       - Actions worden server-side bepaald
                                           - Vakexpertise kennisblok (hardcoded)
                                           - ProfileMeta (naam, bio, testresultaten)
                                           - Fase-verschuiving erkenning
                                           - Realtime sync met backoffice
```

**Wat er al goed werkt:**
- Phase detector (client-side) met slots, confidence, loop-preventie
- SSOT-vragen uit `phase-detector-questions.json` (9.564 regels, honderden echte kandidaatvragen)
- Persona-regels: VORM A/B/C, max 90 woorden, geen vraagtekens in auth-modus
- Profiel-personalisatie: voornaam, bio, testresultaten
- Backoffice advisor-berichten via realtime
- Emdash-filter op de stream
- NormalizeMarkdown voor rendering

**Wat er ontbreekt of suboptimaal is:**
1. De rijke SSOT-data (1.284 vragen, 3.440 regels route-steps, 16.728 regels regioloketten) wordt NIET gebruikt door de LLM
2. Toon per fase is 1 generieke regel (regel 285-290) i.p.v. fase-specifieke micro-instructies
3. Interne links (/vacatures, /events, /opleidingen) worden niet contextueel meegegeven
4. Het vakexpertise-kennisblok is het enige dynamische blok; er is geen mechanisme voor andere combinaties
5. De system prompt groeit ongecontroleerd; er is geen tokenlimiet
6. Route-informatie (PDG, zij-instroom, Pabo, etc.) met FAQ's en artikelen is onbereikbaar voor de LLM
7. Regionale loket-informatie (contactgegevens, consultdiensten) wordt niet ingezet
8. Testresultaten worden als ruwe data meegegeven zonder interpretatie

### Ontwerp: Meta Chat Coordinator

```text
Client: Chat.tsx / DashboardChat.tsx
  |
  | detector payload + profileMeta + messages
  v
Edge Function: doorai-chat/index.ts
  |
  v
+----------------------------------------------+
| META CHAT COORDINATOR                        |
|                                              |
| 1. Knowledge Resolver                        |
|    Input: known_slots, phase, profileMeta    |
|    Bron: compacte lookups uit SSOT JSON      |
|    Output: 1-3 kennisfragmenten (max 300 tk) |
|                                              |
| 2. Tone Selector                             |
|    Input: phase, known_slots count           |
|    Output: fase-specifiek micro-instructie   |
|    blok (vervangt regel 285-290)             |
|                                              |
| 3. Link Injector                             |
|    Input: phase, known_slots                 |
|    Output: 2-3 relevante interne links       |
|    met korte beschrijving                    |
|                                              |
| 4. Profile Interpreter                       |
|    Input: profileMeta (testresultaten, bio)  |
|    Output: 1-2 zinnen interpretatie          |
|                                              |
| 5. Context Assembler                         |
|    Combineert 1-4, limiteert tot ~800 tokens |
|    Plakt onder bestaande system prompt       |
+----------------------------------------------+
  |
  v
LLM Call (met verrijkte prompt)
  |
  v
Stream + SSOT-vraag + Actions (ongewijzigd)
```

### Onderdeel A: Knowledge Resolver

Selecteert relevante kennisfragmenten op basis van de bekende slots.

**Regels voor selectie:**

| Bekende slots | Bron | Wat wordt geinjacteerd |
|---------------|------|----------------------|
| `role_interest=lesgeven` + `school_type=PO` | route-questions.json | "Leraar: draagt verantwoordelijkheid voor een klas. Bevoegdheid vereist." |
| `role_interest=lesgeven` + `school_type=VO` | route-questions.json | Leraar VO + bevoegdheidsniveaus (eerste/tweedegraads) |
| `role_interest=vakexpertise` + `school_type=MBO` | route-questions.json | Instructeur MBO beschrijving + PDG info |
| `role_interest=begeleiding` | route-questions.json | Leerlingenzorg/onderwijsondersteuner beschrijving |
| `credential_goal=asked` | route-steps.json | Compacte samenvatting van relevante route (bijv. zij-instroom, PDG, Pabo) |
| `region_preference=Regio Rotterdam` | regional-education-desks.json | Onderwijsloket Rotterdam contactgegevens + consultdienst |
| `salary_info=asked` | Bestaand kennisblok | CAO-verwijzing + globale ranges |
| `costs_info=asked` | route-steps.json | Kosten-info uit relevante route FAQ's |

De resolver werkt als een lookup-tabel, niet als een LLM-call. De SSOT JSON-bestanden zijn te groot om volledig mee te sturen. In plaats daarvan worden compacte samenvattingen opgenomen als constanten in de edge function (max 50-80 woorden per blok).

**Implementatie:** Een `resolveKnowledge(slots, phase)` functie die een array van strings retourneert. De functie bevat een mapping van slot-combinaties naar compacte kennisblokken. De blokken worden geschreven op basis van de inhoud uit de SSOT-bestanden maar zijn samengevat voor de prompt.

### Onderdeel B: Tone Selector

Vervangt het huidige FASE-GEDRAG blok (regel 285-290) met fase-specifieke micro-instructies die ook rekening houden met hoeveel slots al gevuld zijn (begin vs. eind van een fase).

| Fase | Weinig slots bekend | Meeste slots bekend |
|------|--------------------|--------------------|
| Interesseren | "Houd het luchtig. Maak nieuwsgierig. Vermijd jargon. Laat zien dat kleine stappen al tellen." | "De gebruiker heeft al een richting. Bevestig kort en bied een concrete vervolgstap." |
| Orienteren | "Zet opties naast elkaar. Noem randvoorwaarden (sector, niveau). Vermijd keuzestress." | "Focus op de gekozen route. Geef concrete info over duur, eisen, kosten." |
| Beslissen | "Normaliseer twijfel. Bied 2 routes, niet meer. Geen druk." | "De keuze wordt concreet. Verwijs naar actie: aanmelden, gesprek, event." |
| Matchen | "Help zoeken: regio, sector, type school. Concreet en praktisch." | "Verwijs naar vacatures en events. Bied contact met loket of school." |
| Voorbereiden | "Checklist-stijl. Kort en zakelijk. Wat moet nog geregeld." | "Sluit af met aanmoediging. Verwijs naar praktische resources." |

**Implementatie:** Een `selectTone(phase, slotsFilledCount, totalSlotsCount)` functie die een string retourneert van max 2 zinnen.

### Onderdeel C: Link Injector

Bepaalt per beurt welke interne links relevant zijn en geeft ze mee als context zodat de LLM ze kan noemen zonder ze te hoeven verzinnen.

| Conditie | Links |
|----------|-------|
| Altijd | `/opleidingen` - Routes naar het leraarschap |
| `phase=matchen` of `next_step=vacatures` | `/vacatures` - Actuele vacatures |
| `phase=interesseren` of `next_step=event` | `/events` - Meelopen en infosessies |
| `region_preference` bekend | Link naar regionaal loket website |
| `salary_info=asked` | CAO-tabel link (extern) |
| `role_interest` + `school_type` bekend | `/opleidingen` met specifieke route-hint |

**Implementatie:** Een `injectLinks(phase, slots)` functie die een string retourneert met 2-3 relevante links als "Relevante pagina's: ..." blok.

### Onderdeel D: Profile Interpreter

Vertaalt ruwe profieldata naar korte, bruikbare context voor de LLM. Nu worden testresultaten als `recommendedSector` en `ranking` meegestuurd zonder interpretatie. De coordinator vertaalt dit naar iets als:

- "Maria heeft de interessetest gedaan. Uitkomst: PO past het best bij haar (score 8), gevolgd door VO (score 5). Ze heeft een voorkeur voor werken met jonge kinderen en creatief onderwijs."

**Implementatie:** Een `interpretProfile(profileMeta)` functie die max 2 zinnen retourneert.

### Onderdeel E: Context Assembler

Combineert alle onderdelen tot een dynamisch contextblok met een harde tokenlimiet.

**Prioriteitsvolgorde bij overschrijding (~800 tokens):**
1. Toon-instructie (altijd, max 50 tokens)
2. Kennisblokken (max 300 tokens)
3. Profiel-interpretatie (max 100 tokens)
4. Links (max 50 tokens)
5. Fase-verschuiving erkenning (bestaand, max 50 tokens)

**Implementatie:** Een `assembleContext(knowledge, tone, links, profileInterpretation)` functie die alle delen samenvoegt en indien nodig afkapt op prioriteit.

### Wat er NIET verandert

| Onderdeel | Status |
|-----------|--------|
| Client-side phase detector (`phaseDetectorEngine.ts`) | Blijft ongewijzigd |
| SSOT-vragen selectie (`phase-detector-questions.json`) | Blijft ongewijzigd |
| Loop-preventie in `chooseNextSlot` | Blijft ongewijzigd |
| Chat.tsx / DashboardChat.tsx fetch-logica | Blijft ongewijzigd |
| PublicChatWidget + homepage-coach | Blijft ongewijzigd (apart systeem) |
| Backoffice AdvisorChatPanel + realtime | Blijft ongewijzigd |
| Stream-filter (emdash vervanging) | Blijft ongewijzigd |
| SSOT-vraag append aan stream | Blijft ongewijzigd |
| Actions server-side selectie | Blijft ongewijzigd |
| useChatConversation hook | Blijft ongewijzigd |
| normalizeMarkdown | Blijft ongewijzigd |
| ChatSuggestions component | Blijft ongewijzigd |

### Wat er WEL verandert

**1 bestand: `supabase/functions/doorai-chat/index.ts`**

| Sectie | Wijziging |
|--------|-----------|
| Regels 285-290 (FASE-GEDRAG) | Vervangen door dynamische toon via `selectTone()` |
| Regels 496-533 (context opbouw) | Refactored naar `assembleContext()` aanroep |
| Regels 504-511 (vakexpertise blok) | Verplaatst naar `resolveKnowledge()` als een van meerdere mogelijke blokken |
| Regels 512-526 (profileMeta) | Aangevuld met `interpretProfile()` |
| Nieuw: 4 coordinator functies | `resolveKnowledge`, `selectTone`, `injectLinks`, `interpretProfile`, `assembleContext` |
| Nieuw: compacte kennisbank constanten | Samengevatte blokken uit route-questions, route-steps, regional-education-desks |

### Voorbeeld: voor en na

**Huidige context (bij Maria, PO, interesseren, vakexpertise):**
```
Context
- Ingelogd: ja
- Fase: interesseren
- Confidence: 0.65
- Bekende info: role_interest: vakexpertise
- Naam gebruiker: Maria
- Interessetest resultaat: po
- Sector ranking: po(8), vo(5), mbo(3)

## KENNISBLOK: VAKEXPERTISE-ROLLEN
(hardcoded 4 bullets)
```

**Na coordinator (zelfde situatie):**
```
## DYNAMISCHE CONTEXT

### Toon
Houd het luchtig. Maak nieuwsgierig. Laat zien dat kleine stappen al tellen.

### Kennis
- Vakexpertise in PO: Als vakspecialist (bijv. muziek, techniek, beweging) kun je op basisscholen werken zonder volledige bevoegdheid. Een hbo-diploma in je vakgebied is vaak voldoende. Voor een vaste aanstelling is een bevoegdheid aanbevolen.
- Relevante routes: Pabo (4 jr voltijd), zij-instroom PO (2 jr met hbo/wo-diploma), of vakleerkracht via ongegradeerde bevoegdheid (bijv. ALO, kunstacademie).

### Over de gebruiker
Maria heeft de interessetest gedaan. PO past het best bij haar (score 8). Ze heeft een voorkeur voor werken met jonge kinderen en creatief onderwijs.

### Relevante pagina's
- /opleidingen - Routes naar het leraarschap, inclusief zij-instroom en Pabo
- /events - Meeloopdagen en open dagen bij basisscholen
```

### Risico's en mitigatie

| Risico | Mitigatie |
|--------|----------|
| System prompt wordt te lang | Harde limiet van ~800 tokens op dynamisch blok. Prioriteitsvolgorde voor afkappen. |
| Kennisblokken verouderen | Blokken zijn samengevat uit bestaande SSOT. Bij update van SSOT moeten samenvattingen ook bijgewerkt. |
| Extra latency | Geen extra LLM-calls. Coordinator is puur deterministisch (if/else + string concatenatie). |
| Edge function wordt te groot | Coordinator functies zijn compact (elk ~30-50 regels). Totaal ~200 regels extra. |

