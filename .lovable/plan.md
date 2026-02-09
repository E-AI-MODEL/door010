

# Plan: PublicChatWidget upgraden met funnel-logica

Vervang de huidige keyword-detectie + random pool selectie door een deterministische funnel-aanpak met conversation signals.

---

## Wat verandert

### 1. Nieuw type-systeem voor acties
De huidige `quickReplies: string[]` wordt vervangen door typed actions:
- **ask**: stuurt een vraag in de chat (doorvraag)
- **nav**: navigeert naar een pagina (sluit chat)
- **cta**: conversie-actie zoals "Maak gratis profiel"

### 2. Conversation Signals (state machine)
Bijhouden wat de bezoeker al heeft aangegeven:
- **intent**: route / toelating / vacatures / events / account / general
- **sector**: PO / VO / MBO / onbekend
- **studyLevel**: MBO / HBO / WO / onbekend
- **hasEnoughContext**: true wanneer sector + studieniveau bekend zijn

Dit zorgt ervoor dat vervolgknoppen steeds specifieker worden naarmate het gesprek vordert.

### 3. Deterministische knoppen (geen Math.random meer)
De functie `computeNextActions()` kiest altijd 3 knoppen:
1. Beste doorvraag op basis van ontbrekende info
2. Relevante pagina-link op basis van intent
3. Conversie-CTA zodra er genoeg context is

### 4. Contextual conversion strip
De statische "Log in voor persoonlijke begeleiding" wordt vervangen door een dynamische tip die verandert op basis van hoe ver de bezoeker is in het gesprek.

### 5. Link-validatie
Alle links worden gevalideerd voordat ze gerenderd worden. Geen lege href's, geen kapotte knoppen.

### 6. Toekomstbestendig: backend meta support
Optionele ondersteuning voor structured follow-ups vanuit de Edge Function. Werkt nu zonder, maar kan later aangestuurd worden door het backend.

---

## Route-correcties
De voorgestelde versie verwijst naar `/routes` en `/contact` die niet bestaan in de app. Deze worden gecorrigeerd:
- `/routes` wordt `/opleidingen`
- `/contact` wordt verwijderd uit de ROUTES map

---

## Bestanden die wijzigen

| Bestand | Actie |
|---------|-------|
| `src/components/chat/PublicChatWidget.tsx` | Volledig herschreven met funnel-logica |

Geen database-wijzigingen. Geen nieuwe bestanden. Geen Edge Function wijzigingen nodig.

---

## Technische details

### Nieuwe interfaces
```text
QuickAction { kind: "ask" | "nav" | "cta", label: string, text?: string, href?: string }
ConversationSignals { intent, sector, studyLevel, region, hasEnoughContext }
```

### Kernfuncties
- `inferSignalsFromUserText()` — regex-gebaseerd, update signals na elke user message
- `computeNextActions()` — deterministische 3-knop selectie op basis van signals
- `isValidHref()` / `isInternalHref()` — link-validatie helpers
- `parseBackendMeta()` / `actionsFromMeta()` — optionele backend structured output

### Visuele wijzigingen
- Knoppen krijgen visueel onderscheid: ask = outline, nav = outline, cta = filled green
- Conversion strip toont dynamische tip in plaats van statische login-link
- Bestaande styling (kleuren, border-radius, animaties) blijft behouden

