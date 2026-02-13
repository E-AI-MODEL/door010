

## Fix: Loop-probleem bij ontbrekende slot-herkenning

### Probleem

Wanneer een gebruiker op de action-button "Vakexpertise" klikt, stuurt de app de tekst "Mijn vak inzetten in het onderwijs". De phase detector herkent dit niet als een waarde voor de `role_interest` slot, waardoor dezelfde vraag en dezelfde knoppen opnieuw worden getoond. De LLM krijgt steeds dezelfde context en geeft steeds hetzelfde antwoord.

Dit geldt potentieel voor elke action-button waarvan de tekst niet matcht met een regex in de slot-extractie.

### Oorzaak (2 lagen)

1. **Regex-gat**: De `extractSlots` functie in `phaseDetectorEngine.ts` herkent alleen "lesgeven/docent/leraar" en "begeleiden/mentor/coach" als `role_interest`. "Vakexpertise", "vak inzetten", "instructeur" worden niet herkend.

2. **Geen fallback**: Als een slot niet gevuld wordt, kiest het systeem steeds dezelfde slot als "volgende stap". Er is geen mechanisme om door te gaan naar de volgende slot of om de LLM extra context te geven.

### Oplossing

**A. Regex uitbreiden** (phaseDetectorEngine.ts)
- Voeg een derde match toe voor role_interest: `/(vak|expertise|instructeur|praktijk|specialist)/ -> "vakexpertise"`
- Dit zorgt dat "Mijn vak inzetten in het onderwijs" correct de slot vult

**B. Fallback bij herhaalde slot** (phaseDetectorEngine.ts)
- Detecteer wanneer dezelfde slot 2x achter elkaar als "next" wordt gekozen terwijl de gebruiker al een antwoord gaf
- In dat geval: markeer de slot als "acknowledged" (met de ruwe gebruikerstekst) en ga door naar de volgende ontbrekende slot
- Dit voorkomt loops voor elke toekomstige action-button die niet perfect matcht

**C. Actions afstemmen op slot-waarde** (doorai-chat/index.ts)
- Wanneer `role_interest` gevuld is als "vakexpertise": stuur relevante vervolgacties (bijv. "Instructeur in MBO", "Vakleerkracht in VO") in plaats van opnieuw dezelfde 3 keuzes
- Voeg een case toe in `actionsForNextSlot` voor de situatie dat role_interest al bekend is

**D. LLM-context verrijken bij bekende slots** (doorai-chat/index.ts)
- Wanneer role_interest = "vakexpertise": voeg een kort kennisblok toe aan de system prompt met informatie uit route-questions.json over instructeursrollen, vakleerkrachten en onderwijsondersteunende functies
- Dit geeft de LLM iets inhoudelijks om op te reageren in plaats van generiek te blijven

### Technische details

| Bestand | Wijziging |
|---------|-----------|
| `src/utils/phaseDetectorEngine.ts` | Regel 93-96: voeg derde regex-match toe voor role_interest. Voeg fallback-logica toe in `chooseNextSlot` om herhaalde slots te voorkomen. |
| `supabase/functions/doorai-chat/index.ts` | `actionsForNextSlot`: voeg case toe voor wanneer role_interest al gevuld is. Voeg kennisblok toe aan system prompt bij bekende role_interest waarden. |

### Verwacht resultaat

- Klik op "Vakexpertise" vult `role_interest = "vakexpertise"`
- Het systeem gaat door naar de volgende relevante vraag (bijv. sector-keuze)
- De LLM geeft een inhoudelijk antwoord over vakexpertise-rollen in het onderwijs
- Bij toekomstige action-buttons die niet exact matchen, voorkomt de fallback-logica een loop

