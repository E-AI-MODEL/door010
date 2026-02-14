

## Fix: Naam-unificatie, toon en opruimen dode code

### Wat er nu mis is

1. **Drie namen**: homepage-coach zegt "Doortje", doorai-chat zegt "DoorAI", UI zegt "DOORai"
2. **Toon te zakelijk**: DOORAI_CORE zegt "begripvol, adviserend, neutraal" terwijl de oorspronkelijke visie "warme, nuchtere wegwijzer" is (die al in homepage-coach staat)
3. **Emoji's in welkomstberichten** terwijl prompts "geen emojis" zeggen
4. **Dode code**: `mode: "public"` pad in doorai-chat wordt nooit bereikt (widget gebruikt homepage-coach)

### Wat we doen

**1. Naam overal "DoorAI"**
- `homepage-coach/index.ts` regel 7: "Doortje" naar "DoorAI"
- `homepage-coach/index.ts` regels 72-82: "Doortje:" naar "DoorAI:" in voorbeelden
- UI headers zijn al "DOORai" - dat is visueel en kan zo blijven (merk-stijl)

**2. DOORAI_CORE toon warmer maken**
- `doorai-chat/index.ts` regels 663-666 wijzigen van:
  - "Begripvol, adviserend en neutraal; je spreekt in kansen en voorwaarden."
  - "Gereserveerd enthousiast: positief, maar niet overdreven."
- Naar:
  - "Je bent een warme, nuchtere wegwijzer: menselijk, direct, vriendelijk."
  - "Je helpt mensen orienteren op werken in het onderwijs."
  - "Positief en bemoedigend, maar zonder overdrijving of valse beloftes."
  - "Je zet opties naast elkaar en helpt de gebruiker zelf kiezen."

Dit brengt DOORAI_CORE in lijn met de homepage-coach definitie.

**3. Welkomstberichten zonder emoji**
- `PublicChatWidget.tsx` regel 234: "Hoi! (emoji) Ik ben DOORai..." naar "Welkom bij het Onderwijsloket Rotterdam. Heb je een vraag over werken in het onderwijs? Ik help je graag verder."
- `DashboardChat.tsx` regel 72-75: "Welkom terug! Fijn dat je er bent (emoji)..." naar "Welkom terug, goed dat je er bent.\n\nJe zit in de **${phase}**-fase. ${info}\n\nKies een suggestie hieronder of typ je vraag."
- `Chat.tsx` reset-bericht: zelfde aanpassing

**4. Dode public-mode code opruimen in doorai-chat**
- De `WIDGET_APPENDIX` constante verwijderen (wordt nooit gebruikt - widget roept homepage-coach aan)
- Regel 794: de `mode === "authenticated" ? DASHBOARD_APPENDIX : WIDGET_APPENDIX` vereenvoudigen - altijd DASHBOARD_APPENDIX gebruiken
- Regel 800: het `else` blok (`mode !== authenticated`) vereenvoudigen
- Optioneel: `mode` parameter in RequestBody kan weg, maar we houden het als vangnet

### Wat er NIET verandert

| Onderdeel | Status |
|-----------|--------|
| homepage-coach edge function (functionaliteit) | Ongewijzigd (alleen naam) |
| doorai-chat orchestratie (SSOT, actions, links, knowledge, tone, profile) | Ongewijzigd |
| Phase detector (client-side) | Ongewijzigd |
| SSOT-vraag server-side append | Ongewijzigd |
| PublicChatWidget funnel-logica | Ongewijzigd |
| DashboardChat/Chat.tsx logica | Ongewijzigd (alleen welkomsttekst) |

### Technische details

| Bestand | Wijziging |
|---------|-----------|
| `supabase/functions/homepage-coach/index.ts` | Regel 7: "Doortje" naar "DoorAI". Regels 72-82: "Doortje:" naar "DoorAI:" |
| `supabase/functions/doorai-chat/index.ts` | Regels 663-666: toon warmer. Regels 700-706: WIDGET_APPENDIX verwijderen. Regel 794: vereenvoudigen. |
| `src/components/chat/PublicChatWidget.tsx` | Regel 234: welkomstbericht zonder emoji |
| `src/components/dashboard/DashboardChat.tsx` | Regels 72-75: welkomstbericht zonder emoji, zonder vraagteken |
| `src/pages/Chat.tsx` | Reset-welkomstbericht aanpassen (zelfde als DashboardChat) |

Vijf bestanden, alleen tekst/string-wijzigingen plus verwijderen van ongebruikte constante. Geen logica-wijzigingen.
