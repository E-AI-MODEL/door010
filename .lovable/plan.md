

# Multi-stap orchestratie DoorAI — GEIMPLEMENTEERD

## Wat is gedaan

### 1. Context gehumaniseerd (assembleContext)
- Raw metadata (confidence, slotnamen, evidence-arrays) vervangen door `humanizeSituation()` die menselijk leesbare zinnen genereert
- LLM ontvangt nu: "De gebruiker verkent of het onderwijs iets is. Interesse in lesgeven in het basisonderwijs."
- In plaats van: "Fase: interesseren, Confidence: 0.45, school_type: PO, Signalen: match:interested"

### 2. Basiskennis toegevoegd (BASELINE_KNOWLEDGE)
- Compact kennisblok dat altijd beschikbaar is bij exploration/question-without-matches
- Inhoud: wat het Onderwijsloket doet, hoofdrichtingen (lesgeven, begeleiden, vakexpertise)

### 3. TONE_TABLE vereenvoudigd
- Van 2 zinnen per fase-moment naar 1 beknopte sfeerinstructie
- Voorbeeld: "Luchtig en nieuwsgierig." i.p.v. "Houd het luchtig. Maak nieuwsgierig. Vermijd jargon. Laat zien dat kleine stappen al tellen."

### 4. Multi-stap intent classificatie
- `classifyIntent()` functie toegevoegd (google/gemini-2.5-flash-lite, snel, geen streaming)
- Categorieën: greeting, question, exploration, followup
- Fallback bij falen: "question" (huidig gedrag)
- Intent-specifieke appendix vervangt generieke DASHBOARD_APPENDIX (ander woordenlimiet, andere instructie per intent)

### 5. Dode code opgeruimd
- Server-side `extractSlots()`, `chooseNextQuestion()`, `chooseActions()` verwijderd
- `mode === "public"` pad verwijderd (widget gebruikt homepage-coach)
- Stale comment r12 bijgewerkt
- Emoji verwijderd uit PublicChatWidget error-bericht

## Wat NIET is veranderd
- homepage-coach edge function (incl. Voorkeurszinnen)
- Phase detector engine (client-side)
- DOORAI_CORE prompt (toon, verboden zinnen, stijl)
- PublicChatWidget funnel-logica (alleen emoji-fix)
- DashboardChat.tsx / Chat.tsx logica
- Actions en links (SSE UI-payload)
- actionsForNextSlot() (SSOT-gestuurde acties)
- Knowledge blocks inhoud
