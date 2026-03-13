

# Plan: Betere kennisbenutting, snellere fase-doorstroom, whitelist-webfallback

## Analyse van de kernproblemen

### 1. Fase-overgang werkt niet
De `pickPhase` functie in `phaseDetectorEngine.ts` heeft een +1.5 bias naar de huidige fase (regel 125). Dit maakt het bijna onmogelijk om door te faseren — je hebt een keyword-score van >2.0 nodig om de bias te overwinnen. Bovendien controleert niemand de `exit_criteria` uit het SSOT (`phase-detector-rules.json`). De SSOT definieert duidelijke exit-criteria per fase (bijv. "orientatie" vereist `school_type` gevuld), maar die worden compleet genegeerd.

### 2. Kennis wordt nauwelijks benut
`resolveKnowledge` in de backend selecteert slechts 1-3 hardcoded fragmenten uit `KNOWLEDGE`. Er zijn maar ~15 entries. De 9500+ regels in `phase-detector-questions.json` (met 600+ echte FAQ's) worden alleen gebruikt voor de "volgende vraag" suggestie, niet als kennisbron. De FAQ-retrieval via FTS werkt, maar dekt alleen de `faq_items` tabel.

### 3. Geen webfallback
Als de interne kennis niets oplevert, krijgt de gebruiker een generiek LLM-antwoord zonder bronnen.

---

## Plan van aanpak

### Stap 1: Database — Whitelist-tabel voor vertrouwde bronnen

Nieuwe tabel `trusted_sources` met kolommen:
- `id uuid`, `url text`, `label text`, `category text` (bijv. "CAO", "DUO", "Onderwijsloket"), `active boolean default true`
- `created_by uuid`, `created_at`, `updated_at`
- RLS: advisors/admins kunnen CRUD, candidates kunnen SELECT
- Seed met de bestaande bronnen (voraad.nl, duo.nl, onderwijsloket.com, etc.)

### Stap 2: Backoffice — Bronbeheer-tab

Nieuwe tab in `/backoffice` voor het beheren van vertrouwde bronnen:
- Tabel met URL, label, categorie, actief/inactief toggle
- Toevoegen/verwijderen van bronnen
- Eenvoudig formulier

### Stap 3: Backend — Fase-overgang met bevestiging + webfallback

**`doorai-chat/index.ts` wijzigingen:**

a) **Exit-criteria checker**: Nieuwe functie `checkExitCriteria(phase, slots)` die de SSOT exit_criteria evalueert. Als alle exit-criteria voor de huidige fase zijn voldaan, stuur een `phase_suggestion` mee in het `event: ui` payload:
```
phase_suggestion: { from: "orienteren", to: "beslissen", message: "Je hebt nu een sector gekozen. Wil je door naar de beslissingsfase?" }
```

b) **Webfallback**: Als `resolveKnowledge` + FAQ-retrieval samen <2 fragmenten opleveren, doe een Perplexity/web search beperkt tot de `trusted_sources` whitelist:
- Laad actieve URLs uit `trusted_sources` tabel
- Bouw een `site:url1 OR site:url2` filter
- Gebruik de Lovable AI gateway voor een snelle search-en-samenvatting
- Injecteer het resultaat als extra kennisfragment

c) **Verlaag fase-bias**: Verlaag de huidige-fase-bias van +1.5 naar +0.8 in `phaseDetectorEngine.ts`. Voeg een bonus toe (+1.5) als alle exit-criteria van de huidige fase voldaan zijn voor de `next_phase_default`.

d) **Meer kennis uit SSOT**: Breid `resolveKnowledge` uit om ook de `question_catalog` en `slot_to_questions` uit `phase-detector-questions.json` te doorzoeken op relevante Q&A paren die matchen met de huidige vraag.

### Stap 4: Frontend — Fase-bevestigingsdialoog

**`DashboardChat.tsx` en `Chat.tsx`:**

Bij ontvangst van `phase_suggestion` in het `event: ui` payload, toon een bevestigingskaart in de chat:
```
"Je hebt nu een sector gekozen. Wil je door naar de beslissingsfase?"
[Ja, door naar beslissen] [Nee, nog even oriënteren]
```

Bij "Ja": update `current_phase` in profiel, stuur een bericht naar de backend dat de fase is gewijzigd.
Bij "Nee": blijf in huidige fase, sla keuze op zodat de suggestie niet direct herhaalt.

### Stap 5: Phase Detector Engine — SSOT exit-criteria respecteren

**`phaseDetectorEngine.ts`:**

- Nieuwe functie `evaluateExitCriteria(phase, knownSlots)` die de `exit_criteria` uit de SSOT checkt
- Bij `type: "slots_present"`: check of alle genoemde slots gevuld zijn
- Bij `type: "intent"`: check of het intent matcht (bijv. "wants_orientation_info")
- Als exit-criteria voldaan zijn, verhoog score van `next_phase_default` met +2.0
- Verlaag huidige-fase-bias van +1.5 naar +0.8

---

## Bestanden

| Bestand | Actie |
|---------|-------|
| `trusted_sources` tabel | Nieuwe tabel + RLS + seed data |
| `src/pages/Backoffice.tsx` | Nieuwe "Bronnen" tab |
| `supabase/functions/doorai-chat/index.ts` | Exit-criteria check, webfallback, meer SSOT kennis |
| `src/utils/phaseDetectorEngine.ts` | Exit-criteria evaluatie, bias-verlaging |
| `src/components/dashboard/DashboardChat.tsx` | Phase suggestion UI |
| `src/pages/Chat.tsx` | Phase suggestion UI |

## Sequentie

1. Database migratie (trusted_sources)
2. Seed data (bekende bronnen)
3. Phase detector engine: exit-criteria + bias
4. Backend: exit-criteria check, webfallback, SSOT kennis
5. Frontend: fase-bevestigingsdialoog
6. Backoffice: bronbeheer-tab

