

# Plan: 300+ FAQ's als kennisbron voor DoorAI

## Probleem

De huidige kennisarchitectuur werkt met ~20 hardcoded `KNOWLEDGE_BLOCKS` die via regelgebaseerde logica (`resolveKnowledge`) worden geselecteerd op basis van fase, sector en rol. Dit schaalt niet naar 300+ FAQ's omdat:

1. **Selectielogica explodeert** -- je kunt geen 300 if/else-takken schrijven
2. **Context window limiet** -- alle 300 FAQ's meesturen kost ~15.000 tokens, ver boven de huidige cap van ~800 tokens
3. **Relevantie** -- de meeste FAQ's zijn irrelevant voor een specifieke vraag

## Wat is nodig: semantic search (lichtgewicht RAG)

De kern is: op basis van de gebruikersvraag de 3-5 meest relevante FAQ's ophalen en alleen die meesturen als context. Dit heet "retrieval-augmented generation" (RAG).

---

## Aanpak: 3 stappen

### Stap 1: FAQ-tabel met embeddings in de database

Een nieuwe tabel `faq_items` met:
- `id`, `question` (de FAQ-vraag), `answer` (het antwoord), `category` (salaris/route/subsidie/etc), `tags` (sector, fase), `peildatum` (voor tijdsgevoelige items), `source_url` (bronlink)
- `embedding` (vector kolom, 768 dimensies) -- dit is de numerieke representatie van de vraag+antwoord

Vereist: de `pgvector` extensie activeren (1 migratie).

### Stap 2: Ingest-functie (eenmalig + bij updates)

Een edge function `ingest-faqs` die:
1. FAQ-data ontvangt (JSON array van vraag/antwoord/categorie/tags)
2. Per FAQ een embedding genereert via Lovable AI (of een embedding-model)
3. De FAQ + embedding opslaat in `faq_items`

Dit draai je eenmalig om de 300+ FAQ's te laden, en opnieuw als content verandert.

**Probleem**: Lovable AI gateway biedt momenteel alleen chat completions, geen embedding endpoint. Alternatieven:
- **Optie A**: Keyword-based search (geen embeddings, gebruikt Postgres full-text search `tsvector`). Simpeler, geen extra API nodig, ~70% zo goed als semantic search.
- **Optie B**: Embedding via Gemini/OpenAI embedding model (vereist apart endpoint of creatief gebruik van de chat API voor similarity).

### Stap 3: resolveKnowledge aanpassen

In plaats van de huidige hardcoded selectie:
1. Neem de laatste gebruikersvraag
2. Zoek de 3-5 meest relevante FAQ's op (via vector similarity of full-text search)
3. Injecteer die als `### Achtergrondinformatie` in de context

De bestaande `KNOWLEDGE_BLOCKS` blijven als fallback voor wanneer geen FAQ's matchen.

---

## Twee opties: eenvoud vs kwaliteit

### Optie A: Full-text search (geen embeddings)

- 1 migratie: `faq_items` tabel met `tsvector` kolom + GIN index
- 1 edge function: `ingest-faqs` voor bulk import
- Aanpassing `doorai-chat`: query `faq_items` met `ts_rank` op basis van keywords uit het gebruikersbericht
- **Voordeel**: geen extra API-keys, geen vector-extensie, simpel
- **Nadeel**: mist synoniemen en semantische matches ("wat verdien ik" matcht niet op "salaris")

### Optie B: Vector search met pgvector

- 1 migratie: `pgvector` extensie + `faq_items` tabel met `vector(768)` kolom
- 1 edge function: `ingest-faqs` die embeddings genereert en opslaat
- Aanpassing `doorai-chat`: embed de gebruikersvraag, zoek top-5 via cosine similarity
- **Voordeel**: semantisch begrip, synoniemen werken, veel betere recall
- **Nadeel**: vereist embedding API (niet standaard in Lovable AI gateway)

### Optie C: Hybride (aanbevolen)

Combineer full-text search met een LLM-gestuurde "FAQ selector":
- Sla alle FAQ's op in een tabel met full-text index
- Bij een vraag: haal top-10 op via full-text search
- Stuur die 10 kandidaten + de gebruikersvraag naar een snelle LLM-call (gemini-2.5-flash-lite) die de 3 beste selecteert
- Injecteer die 3 in de context

**Voordeel**: semantisch begrip zonder embedding-infra, gebruikt bestaande Lovable AI gateway.

---

## Concrete implementatie (Optie C)

| Component | Wat | Omvang |
|-----------|-----|--------|
| Migratie | `faq_items` tabel + full-text index | 1 SQL migratie |
| Edge function | `ingest-faqs`: bulk FAQ import | 1 nieuw bestand (~80 regels) |
| Edge function | `doorai-chat` aanpassen: FAQ-retrieval stap | ~40 regels toevoegen |
| Data | 300+ FAQ's als JSON importeren (vanuit HALO Excel) | Eenmalige actie |
| Onderhoud | FAQ's updaten via `ingest-faqs` of direct in database | Lopend |

### Tijdsinschatting
- Tabel + ingest-functie: 1 implementatieronde
- doorai-chat integratie: 1 implementatieronde
- FAQ-data voorbereiden (Excel -> JSON): handmatig werk aan jouw kant
- Totaal: 2-3 implementatierondes + data-aanlevering

---

## Wat jij moet aanleveren

Een JSON-bestand (of Excel) met per FAQ:
```
{
  "question": "Wat verdien ik als leraar PO?",
  "answer": "Volgens CAO PO 2024, LB-schaal...",
  "category": "salaris",
  "tags": ["PO", "salaris", "CAO"],
  "peildatum": "2024-09",
  "source_url": "https://cao-po.nl/salaristabellen"
}
```

De HALO v30 Excel bevat al ~300 items in dit formaat. Die kan ik omzetten naar het juiste importformaat.

