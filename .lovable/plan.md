

# Plan: FAQ-data verrijken en importeren

## Wat ik ga doen

De geüploade `ingest_faqs_payload_DOORTJE_ZIB_MVP_v2_deduped.json` (17 FAQ's) bevat goede vragen maar heeft twee problemen:

1. **Dunne antwoorden** — items 5, 6, 7, 8 bevatten alleen "Vervolgvragen" zonder inhoudelijk antwoord
2. **Gemixte antwoorden** — item 1 en 2 bevatten antwoorden die niet bij de vraag passen (salaris-info bij "intensiteit", buitenland-info bij "wat is zij-instroom")

Ik ga:

### Stap 1: FAQ-data opschonen en verrijken

Een verbeterde versie van het JSON-bestand aanmaken als `src/data/faq-seed.json` met:

- **17 bestaande items opschonen**: antwoorden koppelen aan de juiste vraag, dunne items aanvullen met kennis uit `KNOWLEDGE_BLOCKS` en `ROUTE_SUMMARIES`
- **~15 nieuwe items toevoegen** op basis van de hardcoded `KNOWLEDGE_BLOCKS` die nu in `doorai-chat` staan (salaris, kosten, bevoegdheden, PDG, verwantschap, SOOL-subsidie, etc.)
- **Categorieën standaardiseren**: `route`, `salaris`, `toelating`, `bevoegdheid`, `subsidie`, `algemeen`, `duur`, `vacature`
- **Alias-tags behouden** — deze zijn waardevol voor full-text search

### Stap 2: Importeren via `ingest-faqs`

De opgeschoonde dataset importeren met `mode: "replace"` zodat de 3 test-items worden vervangen.

### Concreet resultaat

~32 FAQ-items in de database die dekken:

| Bron | Items |
|------|-------|
| Geüploade ZIB-data (opgeschoond) | 17 |
| KNOWLEDGE_BLOCKS → FAQ conversie | ~15 |

### Wat NIET verandert

- De `KNOWLEDGE_BLOCKS` in `doorai-chat` blijven als fallback
- De `ingest-faqs` edge function blijft ongewijzigd
- De hybride retrieval-logica blijft ongewijzigd

