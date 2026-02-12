

# Dashboard herontwerp: rustiger, logischer, connected

## Wat er nu mis is

1. **Tips en Snelle Links** nemen elk een volledig kaartblok in beslag, terwijl de inhoud minimaal is (3 bullets / 4 links)
2. **DOORai-kaart** is een dode link-kaart die naar /chat stuurt - voelt niet connected
3. **Oriëntatietraject** (tijdlijn) staat op de profielpagina, terwijl dat het hart is van het dashboard
4. **Fase-overgang wordt niet meegegeven aan de LLM** als de phase detector een verschuiving detecteert

## Nieuwe dashboard-indeling

```text
+------------------------------------------------------+
| Header                                                |
+------------------------------------------------------+
| Welkom, Frans!                          [Uitloggen]   |
| Interesse: vo                                         |
+------------------------------------------------------+
| Fase-stappen balk (bestaand)                         |
+------------------------------------------------------+
|                          |                            |
|  ORIËNTATIETRAJECT       |  INLINE DOORai CHAT        |
|  (tijdlijn, verplaatst   |  (mini chatvenster met     |
|   vanuit profiel)        |   laatste paar berichten,  |
|                          |   invoerveld, suggesties)  |
|  FASE-KAART (compact)    |                            |
|  (header + acties,       |                            |
|   geen apart tips-blok)  |                            |
|                          |                            |
|  PROFIEL (compact)       |                            |
|  + Rotterdam info        |                            |
|  (samengevoegd, klein)   |                            |
|                          |                            |
+------------------------------------------------------+
| Footer                                                |
+------------------------------------------------------+
```

### Wat verdwijnt / krimpt

- **PhaseTips**: wordt opgenomen als subtiele regel onder de PhaseCard acties (niet apart kaartblok)
- **QuickLinksCard**: verdwijnt als apart blok. De links zitten al in de fase-acties en de header-navigatie
- **DOORaiCard** (link-kaart): vervangen door inline chat
- **RotterdamInfoCard**: wordt compact onderdeel van het profielblok

### Wat wordt verplaatst

- **ProfileTimeline**: van `/profile` naar het dashboard (linkerkolom, bovenaan)
- **ProfileTimeline** blijft ook beschikbaar op de profielpagina (herbruikbaar component)

### Wat nieuw is

- **Inline DOORai mini-chat** in de rechterkolom: toont de laatste berichten, een invoerveld en suggestieknoppen. Gebruikt dezelfde `useChatConversation` hook en dezelfde edge function. Link naar /chat voor volledige weergave.

## Fase-overgang meegeven aan LLM

Wanneer de phase detector een fase-verschuiving detecteert (confidence >= 0.75 en nieuwe fase != huidige fase), wordt dit als extra context meegegeven:

### In `src/pages/Chat.tsx` (en straks ook dashboard mini-chat)

Bij het verzenden naar de edge function wordt een extra veld `phase_transition` toegevoegd aan de detector payload als er een verschuiving is gedetecteerd.

### In `supabase/functions/doorai-chat/index.ts`

De system prompt krijgt een extra contextblok als `phase_transition` aanwezig is:

```
- Fase-verschuiving: van [oude fase] naar [nieuwe fase]. 
  Erken dit kort en positief (bijv. "Je bent een stap verder"). 
  Pas je begeleiding aan op de nieuwe fase.
```

## Technische wijzigingen per bestand

### `src/pages/Dashboard.tsx`
- Verwijder imports: `PhaseTips`, `DOORaiCard`, `QuickLinksCard`, `RotterdamInfoCard`
- Voeg imports toe: `ProfileTimeline`, nieuwe `DashboardChat` component
- Haal extra profielvelden op (test_completed, preferred_sector)
- Layout: 2-koloms grid. Links: tijdlijn + compacte fase-kaart + compact profiel. Rechts: inline chat

### `src/components/dashboard/DashboardCards.tsx`
- Verwijder `DOORaiCard`, `QuickLinksCard`, `RotterdamInfoCard`
- `ProfileCard` uitbreiden met Rotterdam-info (compacte link onderaan)
- Behoud `WelcomeHeader`

### `src/components/dashboard/PhaseCard.tsx`
- Integreer tips als subtiele tekst onder de acties (1 regel, geen apart blok)
- Verwijder `PhaseTips` export

### `src/components/dashboard/DashboardChat.tsx` (nieuw)
- Mini-chatvenster: toont laatste 5-6 berichten
- Invoerveld + suggestieknoppen
- Gebruikt `useChatConversation` hook
- "Bekijk volledig gesprek" link naar /chat
- Zelfde streaming logica als Chat.tsx maar compacter
- Phase detector draait ook hier, zodat fase-overgangen live gedetecteerd worden

### `src/pages/Chat.tsx`
- Voeg `phase_transition` veld toe aan de request body wanneer detector een verschuiving detecteert

### `supabase/functions/doorai-chat/index.ts`
- Accepteer `phase_transition` veld in RequestBody
- Voeg fase-overgang context toe aan de system prompt als dit veld aanwezig is

### `src/pages/Profile.tsx`
- ProfileTimeline blijft ook hier staan (component is herbruikbaar)

