

# Audit en multi-stap orchestratie DoorAI

## Audit-bevindingen

### Wat goed werkt (niet aanraken)
- Phase detector engine (client-side): solide, deterministische slot-extractie en fase-scoring
- Actions en links (server-side UI-payload via SSE): correct gescheiden van LLM-output
- Knowledge resolver: goede fase-filtering, landelijk/regionaal labeling
- PublicChatWidget funnel-logica: eigen state machine, eigen edge function (homepage-coach)
- Welkomstberichten: correct, zonder emoji
- DOORAI_CORE prompt: warme toon, verboden zinnen, stijlregels - alles consistent

### Problemen gevonden

| # | Probleem | Locatie | Impact |
|---|----------|---------|--------|
| 1 | Raw metadata naar LLM (confidence, slotnamen, evidence-arrays) | `assembleContext()` r619-654 | LLM gedraagt zich als "fase-analist" |
| 2 | TONE_TABLE te prescriptief (meerdere zinnen per fase) | r402-423 | Beperkt LLM's natuurlijke variatie |
| 3 | Emoji in error-bericht widget | PublicChatWidget r376 | Inconsistent met "geen emojis" regel |
| 4 | Dode code: `extractSlots()` + `chooseNextQuestion()` + `chooseActions()` server-side | doorai-chat r660-741 | Wordt nooit bereikt (widget gebruikt homepage-coach) |
| 5 | Dode code: `mode === "public"` pad | doorai-chat r933 | Nooit bereikt |
| 6 | Stale comment regel 12 | doorai-chat r12 | Zegt "LLM stelt geen vraag" maar dat is nu wel zo |
| 7 | Geen basiskennis bij lege slots | `resolveKnowledge()` r465-551 | Bij vage openers heeft LLM nul context |
| 8 | Geen multi-stap: alles in een prompt | Handler r928-946 | Informatiedumps bij vage input |

### Tone of voice per kanaal (behouden en bewaken)

| Kanaal | Prompt | Toon | Verschil |
|--------|--------|------|----------|
| Homepage widget | `SITE_GUIDE_PROMPT` (homepage-coach) | Kort, max 2 zinnen, altijd een link, site-gids | Puur navigatie, geen persoonlijke begeleiding |
| Dashboard chat | `DOORAI_CORE` + `DASHBOARD_APPENDIX` (doorai-chat) | Warm, conversationeel, max 120 woorden, wedervragen | Persoonlijke oriëntatie-begeleiding |

De "Voorkeurszinnen" in homepage-coach ("Helder.", "Even scherp zetten.") blijven staan - die passen bij het korte, bondige karakter van de site-gids. Ze zijn eerder verwijderd uit doorai-chat waar ze niet pasten.

## Plan van aanpak

### Stap 1: Context humaniseren (assembleContext)

De functie `assembleContext()` wordt herschreven zodat de LLM menselijk leesbare context krijgt in plaats van raw metadata.

**Van**:
```
### Situatie
- Fase: interesseren
- Confidence: 0.45
- Bekende info: school_type: PO, role_interest: lesgeven
- Signalen: match:interested | keyword:po
```

**Naar**:
```
### Situatie
De gebruiker verkent of het onderwijs iets is. Ze hebben interesse in lesgeven in het basisonderwijs.
```

Confidence, evidence en slotnamen worden niet meer meegegeven - die worden intern al gebruikt door de orchestrator voor actions en links.

### Stap 2: Basiskennis toevoegen (resolveKnowledge)

Een compact kennisblok (3-4 zinnen) dat altijd beschikbaar is als er geen specifieke kennis matcht. Inhoud: wat het Onderwijsloket doet en de hoofdrichtingen. Zodat het LLM bij "hoi" of "ik twijfel" iets kan bieden.

### Stap 3: TONE_TABLE vereenvoudigen

Van 2 zinnen per fase-moment naar 1 beknopte sfeerinstructie. Geeft het LLM meer ruimte voor eigen formulering.

### Stap 4: Multi-stap intent classificatie

Een snelle eerste LLM-call (geen streaming, klein antwoord) die het intent classificeert als `greeting`, `question`, `exploration` of `followup`. Op basis daarvan wordt de context voor de tweede (hoofd)call samengesteld:

- **greeting**: geen kennisblokken, alleen profiel + warm welkom + wedervraag
- **question**: volledige kennis, gericht antwoord
- **exploration**: alleen basiskennis, wedervraag om richting te vinden
- **followup**: kennis alleen als relevant voor het onderwerp

Bij falen van de intent-call: fallback naar huidig gedrag (alles meesturen).

### Stap 5: Opruimen dode code en stale comments

- Verwijder server-side `extractSlots()`, `chooseNextQuestion()`, `chooseActions()` (r660-741) - worden nooit bereikt
- Verwijder `mode === "public"` pad (r933)
- Update stale comment r12
- Fix emoji in PublicChatWidget error-bericht (r376)

## Wat er NIET verandert

| Onderdeel | Status |
|-----------|--------|
| homepage-coach edge function (incl. Voorkeurszinnen) | Ongewijzigd |
| Phase detector engine (client-side) | Ongewijzigd |
| DOORAI_CORE prompt (toon, verboden zinnen, stijl) | Ongewijzigd |
| PublicChatWidget funnel-logica | Ongewijzigd (alleen emoji-fix) |
| DashboardChat.tsx / Chat.tsx logica | Ongewijzigd |
| Actions en links (SSE UI-payload) | Ongewijzigd |
| actionsForNextSlot() (SSOT-gestuurde acties) | Ongewijzigd |
| Knowledge blocks inhoud | Ongewijzigd |

## Technische details

### Bestanden en wijzigingen

| Bestand | Wijziging |
|---------|-----------|
| `supabase/functions/doorai-chat/index.ts` | assembleContext() herschrijven, resolveKnowledge() basiskennis toevoegen, TONE_TABLE vereenvoudigen, classifyIntent() toevoegen, handler aanpassen voor 2-staps flow, dode code verwijderen, comments updaten |
| `src/components/chat/PublicChatWidget.tsx` | Emoji verwijderen uit error-bericht (r376) |

### classifyIntent() specificatie

```text
Input:  laatste gebruikersbericht + 2 voorgaande turns (voor context)
Model:  google/gemini-3-flash-preview (zelfde als hoofd-call)
Stream: false
Output: { "intent": "greeting|question|exploration|followup" }
Timeout/fallback: bij falen -> default "question" (huidig gedrag)
Verwachte latentie: 200-400ms extra
```

### Tegenstrijdigheden die worden opgelost

1. Comment "LLM stelt geen vraag" vs. daadwerkelijk gedrag (LLM stelt nu wel vragen) - comment wordt bijgewerkt
2. Raw metadata in prompt vs. instructie "verwerk feiten natuurlijk" - metadata wordt gehumaniseerd
3. "Geen emojis" regel vs. emoji in error-bericht widget - emoji wordt verwijderd

### Geen nieuwe tegenstrijdigheden

De intent-classificatie voegt geen nieuwe regels toe aan de LLM-prompt. Het bepaalt alleen welke bestaande context wordt meegegeven. De DOORAI_CORE en DASHBOARD_APPENDIX blijven de enige instructies die het LLM ontvangt.

