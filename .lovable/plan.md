

# Totaalplan: Guardrails, kennisverrijking, regionale routing en toegankelijkheid

Alle feedback (AB-test enquete, gespreksboom, HALO v30, en de 13 concrete verbeterpunten) samengevoegd in 1 implementatieplan. Drie bestanden, geen nieuwe bestanden, geen migraties.

---

## Bestand 1: `supabase/functions/doorai-chat/index.ts`

### 1A. DOORAI_CORE prompt aanscherpen (na r796)

Toevoegen aan "Veiligheid en grenzen":

```
ROLBEGRENZING:
- Schrijf NOOIT e-mails, brieven of gespreksscripts voor de gebruiker.
- Geef geen managementadvies of loopbaancoaching. Verwijs naar een adviseur.
- Bij arbeidsconflicten of salarisonvrede: blijf neutraal. Zeg niet "dit voelt oneerlijk". Verwijs naar CAO-informatie en het regioloket.
- Je bent een informatieve wegwijzer, geen coach of persoonlijk assistent.

BRONVERMELDING:
- Als de gebruiker vraagt om een officiële bron, regeling, CAO, voorwaarden of link: antwoord is alleen geldig als er een bronlink in je achtergrondinformatie staat. Anders: "Ik heb dit niet met een officiële bron in mijn kennisbank. Check het bij het regioloket of op onderwijsloket.com/kennisbank."
- Noem nooit regels of eisen als feit zonder bron. Formuleer als: "Volgens de informatie die ik heb..."

TIJDSGEVOELIGHEID:
- Noem nooit een datum, bedrag, deadline of openstelling zonder peildatum. Gebruik: "Volgens [bron] (peildatum najaar 2024)..."
- Gebruik nooit "gemiddelde" tenzij je de bron en berekeningswijze kent.
- Onderwerpen die per definitie verouderen (subsidies, CAO-schalen, openstellingen, vacatures, contactpersonen): ALTIJD naar een bronpagina verwijzen, nooit zelf de actuele stand noemen.

LIVE ONDERWERPEN:
- Bij vragen over vacatures of actuele openstellingen: zeg "Actuele vacatures kan ik niet live inzien" en verwijs naar de vacaturepagina.
- Als je niet kunt leveren wat gevraagd wordt, geef het best mogelijke alternatief (bijv. de vacaturepagina's van specifieke besturen).

VERWIJZINGEN:
- Verwijs niet naar "links onder ons gesprek". Zeg in plaats daarvan: "Klik op de knop hieronder" of verwijs naar de specifieke pagina.
- Gebruik voor regelingen altijd de officiële naam en de juiste uitvoerder. Mix geen termen (DUO vs DUS-I).
```

### 1B. KNOWLEDGE_BLOCKS verrijken (r383-399)

**Aanpassen:**

`salaris` (r396):
```
"Salaris (peildatum: CAO PO/VO 2024): PO/VO LB-schaal trede 1 ca. €3.622, trede 12 ca. €5.520 bruto/mnd. MBO LB-schaal trede 1 ca. €3.713, trede 12 ca. €5.495. Inschaling hangt af van werkervaring en schoolbeleid. Bron: salaristabellen via cao-po.nl / vo-raad.nl / mbo-raad.nl."
```

`kosten` (r397):
```
"Kosten (peildatum: studiejaar 2024-2025): Zij-instroom is kosteloos - de school vraagt subsidie aan. Regulier: wettelijk collegegeld ca. €2.530/jr. PDG: variëert per aanbieder. Let op: als je het zij-instroomtraject voortijdig stopt, kan je werkgever NIET opnieuw de zij-instroomsubsidie voor jou aanvragen."
```

`route_zij_instroom` (r395):
```
"Zij-instroom: versneld 2-jarig traject, leren en werken tegelijk. Je werkt minimaal 0,4 fte (2 dagen) en volgt 1 dag per week opleiding. Voorwaarden: relevant hbo/wo-diploma, geschiktheidsonderzoek, aanstelling bij een school, VOG. CAO-technisch voer je lerarentaken uit, maar de wet schrijft geen specifieke functienaam voor. Let op: bij afbreken kan je werkgever NIET opnieuw de zij-instroomsubsidie aanvragen."
```

`lesgeven_mbo` (r386):
```
"Docent MBO: je geeft theorie/praktijklessen in beroepsopleidingen. PDG (1-2 jr) vereist, of een eerste/tweedegraads bevoegdheid. Vakkennis aantoonbaar via diploma of minimaal 3 jaar relevante werkervaring. In het MBO is 'bevoegd' geen wettelijke term."
```

**Nieuwe blokken toevoegen:**

```
verwantschap_zij_instroom: "Bij zij-instroom tweedegraads VO moet je hbo/wo-diploma vakinhoudelijk verwant zijn aan het schoolvak. Bij eerstegraads: wo-bachelor + master met minimaal 120 ECTS verwant aan het vak. De verwantschapstabel geeft slechts een indicatie - de lerarenopleiding beslist zelf over toelating. Check altijd bij de beoogde opleiding."

sool_subsidie: "De SOOL-subsidie (Subsidieregeling Opleiding Leraren) kan beschikbaar zijn voor scholen die medewerkers laten opleiden tot leraar. Dit is ook relevant als je start als onderwijsondersteuner. Check bij het regioloket of je werkgever hiervoor in aanmerking komt."

bevoegdheden_mbo: "In het MBO is 'bevoegd' geen wettelijke term. Je kunt lesgeven met een eerste- of tweedegraads bevoegdheid, of met een geschiktheidsverklaring plus PDG."

externe_bronnen: "Nuttige bronnen: Routetool (onderwijsloket.com/routes), Onderwijsnavigator (onderwijsloket.com/onderwijsnavigator), Kennisbank (onderwijsloket.com/kennisbank), werkeninhetonderwijs.nl, CAO-tabellen (cao-po.nl / vo-raad.nl / mbo-raad.nl)."
```

### 1C. ROUTE_SUMMARIES correctie (r107, sl-a)

```
"sl-a": { title: "Schoolleiding PO", summary: "Schoolleiders PO moeten geregistreerd staan in het Schoolleidersregister PO. Een zij-instromende schoolleideropleiding voor het register is voldoende - een lesbevoegdheid is niet verplicht. De specifieke zij-instroomsubsidie voor schoolleiders bestaat niet meer.", hasFaqs: false },
```

### 1D. BASELINE_KNOWLEDGE uitbreiden (r402)

```
"Het landelijke Onderwijsloket (onderwijsloket.com) biedt algemene informatie over routes en bevoegdheden. Regionale onderwijsloketten bieden persoonlijke begeleiding. Het Onderwijsloket Rotterdam (onderwijsloketrotterdam.nl) helpt gratis in de regio Rotterdam-Rijnmond. Er zijn verschillende richtingen: lesgeven, begeleiden, ondersteunende functies, of vakexpertise inzetten. Routes lopen via reguliere opleidingen of via zij-instroom. Handige tools: Routetool (onderwijsloket.com/routes), Onderwijsnavigator (onderwijsloket.com/onderwijsnavigator)."
```

### 1E. resolveKnowledge uitbreiden (r504-557)

Na het credential_goal-blok (r522): als sector === "MBO" en PDG nog niet in landelijk staat, altijd `route_pdg` injecteren.

Na de sector-check: als VO en credential_goal bevat "zij", verwantschapsblok injecteren.

Als intent === "question" en knowledge array leeg is (r684): naast BASELINE_KNOWLEDGE ook `externe_bronnen` toevoegen.

### 1F. findRegionalDesk + findDeskObject: multi-match (r357-378)

Beide functies aanpassen om ALLE matches te retourneren (max 3) in plaats van alleen de eerste. Zodat Rotterdam zowel "Onderwijsloket Rotterdam" als "Leraar van Buiten" toont.

`findRegionalDesk` retourneert `string[]` i.p.v. `string | null`.
`findDeskObject` retourneert `DeskInfo[]` i.p.v. `DeskInfo | null`.

Aanroepers in `resolveKnowledge` (r534, r548) en `computeLinks` (r588) aanpassen om over arrays te itereren.

### 1G. computeLinks uitbreiden (r562-597)

- Max links van 3 naar 5 (r596)
- Kennisbank-fallback: link naar `/kennisbank` als geen andere links matchen
- Live-topic: als laatste bericht "vacature"/"openstelling"/"deadline" bevat, altijd `/vacatures` linken
- Routetool-link bij route-gerelateerde vragen: `{ label: "Routetool", href: "https://onderwijsloket.com/routes/" }`
- Meerdere regionale desk-links (loop over array uit findDeskObject)

### 1H. Handler: live_topic flag (r964-990)

Detecteer in het laatste gebruikersbericht keywords "vacature", "openstelling", "deadline", "budget", "salaris" en stuur als parameter naar computeLinks. Bij match op vacature/openstelling wordt `/vacatures` altijd gelinkt.

---

## Bestand 2: `src/components/chat/PublicChatWidget.tsx`

### 2A. Aria-labels (r601-616)

- Input (r602): toevoegen `aria-label="Stel je vraag"`
- Send-knop (r609): toevoegen `aria-label="Verstuur bericht"`

### 2B. Aria-live voor berichten (r469)

Berichtencontainer: toevoegen `aria-live="polite"` zodat schermlezers nieuwe berichten aankondigen.

### 2C. Focus management

- Bij openen (`setIsOpen(true)`): auto-focus naar het invoerveld via een ref + useEffect
- Escape-toets: sluit widget (keydown handler op de widget container)

---

## Bestand 3: `src/components/dashboard/DashboardChat.tsx`

### 3A. Aria-labels (r388-397)

- Input (r388): toevoegen `aria-label="Stel je vraag"`
- Send-knop (r395): toevoegen `aria-label="Verstuur bericht"`
- Trash-knop (r379): toevoegen `aria-label="Gesprek wissen"`

### 3B. Aria-live voor berichten (r290)

Berichtencontainer: toevoegen `aria-live="polite"`.

---

## Overzicht

| Bestand | Wat | Omvang |
|---------|-----|--------|
| `doorai-chat/index.ts` | DOORAI_CORE: rolbegrenzing, bronvermelding, peildatum, live-topics | +25 regels |
| `doorai-chat/index.ts` | KNOWLEDGE_BLOCKS: 4 aanpassingen + 4 nieuwe blokken | ~20 regels |
| `doorai-chat/index.ts` | ROUTE_SUMMARIES sl-a correctie | 1 entry |
| `doorai-chat/index.ts` | BASELINE_KNOWLEDGE uitbreiden | 1 blok |
| `doorai-chat/index.ts` | resolveKnowledge: PDG-fallback, verwantschap, bronnen-fallback | +8 regels |
| `doorai-chat/index.ts` | findRegionalDesk/findDeskObject: multi-match | ~15 regels |
| `doorai-chat/index.ts` | computeLinks: max 5, fallbacks, live-topic, routetool | ~12 regels |
| `doorai-chat/index.ts` | Handler: live_topic detectie | +4 regels |
| `PublicChatWidget.tsx` | aria-labels, aria-live, focus, Escape | ~12 regels |
| `DashboardChat.tsx` | aria-labels, aria-live | ~5 regels |

## Wat NIET in deze ronde

| Punt | Reden |
|------|-------|
| Engelstalig antwoorden | Taaldetectie + Engelse kennisblokken apart traject |
| Meerdere AI-agents (job alert, route expert) | Architecturele keuze |
| Canonical cards per regeling met status | Vereist CMS of database-tabel |
| Logging per foutcategorie (punt 10) | Vereist apart analytics-systeem |
| Templates top 20 vragen | Content-inventarisatie apart traject |
| Certificaat groepsleerkracht onderbouw vmbo | Ontbreekt in SSOT data |
| 300+ FAQ's als volledige kennisbron | Vereist RAG of grotere refactor |

