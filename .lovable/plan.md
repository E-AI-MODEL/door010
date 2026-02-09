

# Plan: DOORai upgraden naar coach-niveau

## Samenvatting
De ingelogde chatbot (DOORai) wordt omgebouwd van een "vraag-antwoordmachine" naar een digitale begeleider die meeleeft met waar iemand mentaal staat. Dit raakt twee bestanden: de backend-functie en de ingelogde chatpagina.

## Wat er nu mis is

1. **System prompt is te rigide** -- "max 2-3 zinnen" en "nooit samenvatten" blokkeren empathische begeleiding
2. **Slots worden niet bijgehouden** -- de edge function ontvangt `userPhase` maar doet er niets determiners mee
3. **Geen doorvraag-sturing** -- het LLM kiest zelf een willekeurige vraag i.p.v. de meest progressieve
4. **Geen knoppen** -- de ingelogde chat heeft geen guided actions (de publieke widget wel)
5. **Geen gesprekspersistentie** -- conversations/messages tabellen bestaan maar worden niet gebruikt

## Aanpak in 3 stappen

### Stap 1: Edge function `doorai-chat` upgraden

**A. Coach Output Format (vervangt de huidige "output regels")**

Het huidige blok met "Maximaal 2-3 zinnen / Nooit samenvatten / Geen voor- en nadelen" wordt vervangen door:

```
1. Begin met 1 zin: empathie/normaliseren (zachte laag)
2. Geef max 2 zinnen: feitelijke info of duiding (objectief, kort)
3. Eindig met exact 1 gerichte vervolgvraag (progressie)
4. Links alleen als relevant en alleen uit whitelist
5. Als je moet kiezen: vraag door > link dumpen
```

**B. Slot extraction (server-side, deterministisch)**

Eenvoudige regex-extractie van `school_type` uit de laatste user-message:

```text
PO  <-- als tekst "po", "basisonderwijs", "primair" bevat
VO  <-- als tekst "vo", "voortgezet", "middelbare" bevat
MBO <-- als tekst "mbo", "beroepsonderwijs" bevat
```

**C. Deterministische vraagkeuze (`chooseNextQuestion`)**

Op basis van fase + ontbrekende slots wordt 1 concrete vervolgvraag gekozen:

| Fase | Ontbrekend | Vraag |
|------|-----------|-------|
| interesse | -- | "Wat trekt je het meest aan: lesgeven, begeleiding, of vakexpertise?" |
| orientatie+ | school_type | "In welke sector wil je je orienteren: PO, VO of MBO?" |
| orientatie | school_type bekend | "Wil je vooral weten welke route bij je past, of eerst welke diploma's je nodig hebt?" |
| beslissing | -- | "Wat zou jou helpen om een keuze te maken: kosten, duur, salaris of een gesprek?" |
| matching | -- | "In welke regio of wijk wil je vooral zoeken naar scholen?" |
| voorbereiding | -- | "Wat is voor jou de prettigste volgende stap?" |

Deze vraag wordt als harde instructie in het system prompt geinjecteerd:

```
## Detector output (server-side, leidend)
- Extracted school_type: PO | VO | MBO | onbekend
- Next question (must ask): [de gekozen vraag]
```

**D. Actions via HTML-comment in stream**

Het system prompt krijgt een instructie om aan het einde van elk antwoord een verborgen comment te plaatsen:

```
<!--ACTIONS:[{"label":"PO","value":"Ik wil PO"},...]-->
```

De actions worden bepaald op basis van fase en slots, bv.:
- Sector onbekend: PO / VO / MBO knoppen
- Sector bekend, fase beslissing: "Kosten bekijken" / "Vacatures" / "Gesprek plannen"

### Stap 2: Chat.tsx upgraden (ingelogde chat)

**A. Actions parser**

Na het streamen van een bericht wordt de `<!--ACTIONS:[...]-->` comment geparsed, uit de zichtbare tekst verwijderd, en als knoppen gerenderd -- exact dezelfde stijl als de publieke widget (pill buttons, h-10, truncate).

**B. Knoppen rendering**

Onder het berichtengebied (boven het invoerveld) komen de guided action buttons:

```text
[Ik wil PO]  [Ik wil VO]  [Ik wil MBO]
```

Klikken stuurt de `value` als user-bericht.

**C. Gesprekspersistentie**

Bij eerste bericht: maak een `conversations` record aan.
Bij elk bericht: sla op in `messages` tabel (role, content, metadata met slot_state).
Bij terugkeer: laad de laatste conversatie uit de database i.p.v. een hardcoded welkomstbericht.

**D. Welkomstbericht verbeteren**

Het huidige statische welkomstbericht met bullet-list wordt vervangen door een coachend bericht:

```
Welkom terug! Fijn dat je er bent.
Je zit nu in de [fase]-fase. [1 zin context over deze fase].
Waar kan ik je vandaag mee helpen?
```

Plus guided action buttons passend bij de fase.

### Stap 3: Fase-specifieke toon in prompt

Per fase wordt een "begeleidingsintentie" meegegeven:

| Fase | Intentie | Voorbeeld toon |
|------|----------|---------------|
| interesse | verhelderen | "Logisch dat je benieuwd bent!" |
| orientatie | geruststellen | "Die twijfel hoor ik vaker, heel normaal." |
| beslissing | structureren | "Laten we het overzichtelijk maken." |
| matching | activeren | "Goed dat je concrete stappen wilt zetten!" |
| voorbereiding | borgen | "Je bent er bijna, even de puntjes op de i." |

---

## Bestanden die wijzigen

| Bestand | Wat |
|---------|-----|
| `supabase/functions/doorai-chat/index.ts` | System prompt herschrijven, slot extraction, vraagkeuze, actions-instructie |
| `src/pages/Chat.tsx` | Actions parser, knoppen, gesprekspersistentie, welkomstbericht |

## Wat NIET wijzigt

- `PublicChatWidget.tsx` -- de publieke widget blijft ongewijzigd
- `homepage-coach` edge function -- die heeft een andere rol
- Database schema -- `conversations` en `messages` tabellen bestaan al

