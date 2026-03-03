

# Plan: 300+ FAQ's als kennisbron voor DoorAI — GEÏMPLEMENTEERD

## Status: ✅ Infrastructuur klaar

### Wat is gebouwd

1. **`faq_items` tabel** met full-text search (Dutch tsvector, GIN index)
   - Kolommen: question, answer, category, tags[], peildatum, source_url
   - RLS: publiek leesbaar, alleen admins kunnen beheren
   - `search_faqs()` database functie voor gerankte FTS-queries

2. **`ingest-faqs` edge function** — bulk import
   - POST JSON array van FAQ's
   - Modes: `upsert` (toevoegen) of `replace` (alles vervangen + opnieuw laden)
   - Batched inserts (50 per batch)

3. **Hybride retrieval in `doorai-chat`**
   - Bij question/followup/exploration: zoek top-10 FAQ's via FTS
   - LLM-selector (gemini-2.5-flash-lite) kiest de 3 meest relevante
   - Geïnjecteerd in de `### Achtergrondinformatie` context

### Wat jij moet aanleveren

Een JSON-bestand met per FAQ:
```json
{
  "question": "Wat verdien ik als leraar PO?",
  "answer": "Volgens CAO PO 2024, LB-schaal...",
  "category": "salaris",
  "tags": ["PO", "salaris", "CAO"],
  "peildatum": "2024-09",
  "source_url": "https://cao-po.nl/salaristabellen"
}
```

### Hoe te importeren

Stuur de FAQ's als JSON array naar de `ingest-faqs` edge function:
```
POST /functions/v1/ingest-faqs
Body: { "faqs": [...], "mode": "replace" }
```
