
# Plan: DOORai antwoorden drastisch inkorten

## Probleem
De chatbot geeft te lange antwoorden (4-6 zinnen info + een lange vervolgvraag met 3 opties inline). Het "Coach Output Format" in het system prompt wordt genegeerd door het LLM.

## Oorzaak
Het huidige prompt zegt "max 2 zinnen" maar:
- Er staan geen harde woordlimieten
- Er is geen expliciet verbod op uitweidingen
- De voorbeelden in het prompt zijn zelf al te lang
- Het LLM vult graag context aan als het niet hard wordt begrensd

## Oplossing: prompt aanscherpen in `supabase/functions/doorai-chat/index.ts`

### 1. Coach Output Format verscherpen (regel 121-126)

Huidige instructie:
```
1. Begin met 1 zin: empathie/normaliseren
2. Geef max 2 zinnen: feitelijke info
3. Eindig met exact 1 gerichte vervolgvraag
```

Nieuwe instructie (veel strikter):
```
### LENGTE-LIMIET (HARD, GEEN UITZONDERINGEN):
- Je volledige antwoord is MAXIMAAL 4 zinnen (inclusief de vervolgvraag)
- Zin 1: empathie/normaliseren (kort, max 10 woorden)
- Zin 2-3: feitelijke info (objectief, geen uitweidingen)
- Zin 4: exact 1 korte vervolgvraag (GEEN opsomming van 3 opties in de vraagtekst)
- NOOIT meer dan 4 zinnen. Tel ze. Als het er meer zijn, schrap.
- Opsommingen en lijstjes zijn VERBODEN in je antwoord
- De vervolgvraag bevat GEEN "of... of... of..." constructie -- die opties staan in de ACTIONS knoppen
```

### 2. Voorbeelden in prompt inkorten (rond regel 160-175)

Huidige voorbeelden zijn te lang. Vervangen door:

```
User: "Ik twijfel of zij-instroom wel haalbaar is"
-> "Die twijfel hoor ik vaker, heel normaal. Zij-instroom is juist ontworpen om naast werk te doen, in 2 jaar. Waar twijfel je het meest over?"
<!--ACTIONS:[{"label":"Studielast","value":"Ik twijfel over de studielast"},{"label":"Toelatingseisen","value":"Ik wil meer weten over toelatingseisen"},{"label":"Combineren met werk","value":"Kan ik dit combineren met mijn baan?"}]-->

User: "Wat verdien ik als leraar?"
-> "Goed dat je daar naar kijkt! Leraren verdienen tussen 2.900 - 5.800 bruto, afhankelijk van sector en ervaring. In welke sector denk je aan lesgeven?"
<!--ACTIONS:[{"label":"PO","value":"Ik denk aan basisonderwijs"},{"label":"VO","value":"Ik denk aan voortgezet onderwijs"},{"label":"MBO","value":"Ik denk aan MBO"}]-->
```

### 3. Anti-uitweiding regel toevoegen

Na de "Verdere regels" sectie, toevoegen:
```
- NOOIT de sector of route uitleggen tenzij de gebruiker er expliciet om vraagt
- NOOIT herhalen wat de gebruiker al zei
- Keuze-opties horen in de ACTIONS knoppen, NIET in je antwoord-tekst
```

## Resultaat
- Antwoorden worden max 4 zinnen (was 6-8)
- Geen inline "of X, of Y, of Z" meer in de vraagtekst (die staan in de knoppen)
- Strakke, coachende toon zonder informatiedumps

## Bestand dat wijzigt
- `supabase/functions/doorai-chat/index.ts` -- alleen het system prompt blok
