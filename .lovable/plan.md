
# Wisknop verplaatsen en fixen

## Twee problemen

1. **Knop staat boven** (header, regel 314-324) — moet naar de invoerbalk onderaan
2. **Reset werkt niet** — `setInitialized(false)` triggert `loadConversation` opnieuw, die het oude gesprek uit de database terughaalt

## Wijzigingen

### `src/hooks/useChatConversation.ts`
- `resetConversation`: verander `setInitialized(false)` naar `setInitialized(true)` zodat `loadConversation` niet opnieuw triggert

### `src/pages/Chat.tsx`
- **Verwijder** de wis-knop uit de header (regels 314-324)
- **Voeg toe** een icon-only Trash2-knop in de invoerbalk, links van het tekstveld
- Knop verschijnt alleen als er meer dan 1 bericht is
- Zelfde `handleClearConversation` handler

Resultaat invoerbalk:

```text
[ Trash2 ] [ Stel je vraag...          ] [ Verstuur ]
```
