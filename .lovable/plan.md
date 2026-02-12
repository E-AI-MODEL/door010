

# Plan: Tone of Voice + Phase Detector update (v2)

## Samenvatting

De ingelogde chat wordt professioneler en minder "chatbot-achtig":
- De AI stelt zelf geen vragen meer - de server voegt exact 1 SSOT-vervolgvraag toe
- Geen standaard bevestigingen ("Goed dat je dit vraagt!") of samenvattingen
- Deterministische fase-detectie op basis van wat de gebruiker typt
- Fase en sector worden automatisch in het profiel bijgewerkt bij voldoende zekerheid

De publieke widget op de homepage blijft ongewijzigd.

---

## Stap 1: SSOT vragen-bestand vervangen

Het bestand `src/data/phase-detector-questions.json` wordt vervangen met de nieuwe versie. Belangrijkste verschil: neutrale vervolgvragen staan bovenaan per slot (S00001 t/m S00009), zodat "beste route" formuleringen niet meer als default terugkomen.

## Stap 2: Nieuwe utils toevoegen

Twee nieuwe bestanden in een nieuwe `src/utils/` map:

| Bestand | Doel |
|---------|------|
| `src/utils/phaseDetectorParser.ts` | Laadt en valideert de 2 SSOT JSON bestanden, cached het resultaat |
| `src/utils/phaseDetectorEngine.ts` | Deterministische fase-detectie + slot-extractie + SSOT vervolgvraag kiezen |

De engine bevat:
- Mapping tussen UI-fasenamen (interesseren/orienteren/...) en SSOT-fasenamen (interesse/orientatie/...)
- Keyword-gebaseerde slot-extractie (sector, regio, salaris, kosten, etc.)
- Fase-scoring met bias naar huidige fase voor stabiliteit
- Confidence-drempel (0.75) voor profielupdates

## Stap 3: Chat pagina patchen

`src/pages/Chat.tsx` wordt vervangen met de nieuwe versie. Belangrijke wijzigingen:
- Importeert en draait de Phase Detector bij elk bericht
- Stuurt detector-output (fase, slots, SSOT vraag) mee naar de edge function
- Updatet het profiel automatisch (fase bij confidence >= 0.75, sector als po/vo/mbo)
- Houdt knownSlots bij als state tussen berichten

## Stap 4: Edge function patchen

`supabase/functions/doorai-chat/index.ts` wordt vervangen. Wijzigingen:
- Nieuwe `DOORAI_SYSTEM_PROMPT_AUTH`: directe toon, geen bevestigingen, geen vraagtekens, max 110 woorden
- Server voegt SSOT-vraag als apart tekst-chunk toe aan het einde van de AI-stream
- Actieknoppen worden gekozen op basis van de next_slot_key uit de detector
- Em-dash/en-dash filter op de stream (vervangt -- en - door gewone streep)
- Public mode blijft exact hetzelfde als nu

## Stap 5: Deploy

Alleen de `doorai-chat` edge function wordt gedeployed.

---

## Technische details

### Bestanden

| Actie | Bestand |
|-------|---------|
| Vervangen | `src/data/phase-detector-questions.json` |
| Nieuw | `src/utils/phaseDetectorParser.ts` |
| Nieuw | `src/utils/phaseDetectorEngine.ts` |
| Vervangen | `src/pages/Chat.tsx` |
| Vervangen | `supabase/functions/doorai-chat/index.ts` |

### Parser importeert JSON met `?raw`

De parser gebruikt `import rulesRaw from "@/data/phase-detector-rules.json?raw"` om de JSON als string te laden en daarna te parsen + valideren. Dit voorkomt problemen met Vite's JSON handling.

### Profielupdates

De Chat pagina bevat een `maybePersistProfile` functie die:
- current_phase update als confidence >= 0.75 EN de fase veranderd is
- preferred_sector update als school_type gedetecteerd is (po/vo/mbo in lowercase)

### Edge function: twee prompt-paden

- **Public mode**: gebruikt bestaande `DOORAI_SYSTEM_PROMPT` (4-zinnen format, ongewijzigd)
- **Authenticated mode**: gebruikt nieuwe `DOORAI_SYSTEM_PROMPT_AUTH` (vrijer format, geen vragen, server voegt SSOT vraag toe)

