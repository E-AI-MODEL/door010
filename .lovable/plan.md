

# Mini-chat wisknop + Volledig gesprek herontwerp

## Drie onderdelen

### 1. Wisknop in de mini-chat (DashboardChat)

De mini-chat op het dashboard mist een "wis gesprek" knop. Toevoegen als klein Trash2-icoon naast het invoerveld (links), identiek aan hoe het in Chat.tsx werkt. Gebruikt `resetConversation` uit de `useChatConversation` hook (die al beschikbaar is maar niet geimporteerd).

### 2. Volledig gesprek (/chat) visueel gelijktrekken met mini-chat

De `/chat` pagina gebruikt nu:
- Solid green header balk
- `rounded-lg` bubbles
- Geen card-container
- Platte layout zonder shadow

Dit wordt visueel consistent gemaakt met de mini-chat:
- Groene header wordt een compacte bar met DOORai label + terugknop (binnen een card-achtige container)
- Bubbles worden `rounded-2xl` (zelfde als mini)
- De hele chat zit in een `rounded-3xl border bg-card shadow-door` container (zelfde styling)
- Suggestieknoppen (`ChatActions`) krijgen dezelfde compacte pill-styling als de mini-chat
- Input area styling wordt consistent

### 3. Gesprekssuggesties als interactieve timeline-feed

Na elk assistant-antwoord worden de server-side `actions` al ontvangen. Deze worden nu alleen als tekst-pills getoond. Het plan is om deze suggesties te verrijken met visuele context:

- **Link-suggesties**: als een actie een pad bevat (bijv. `/vacatures`, `/opleidingen`, `/events`), toon dit als een klikbare kaart met icoon en korte beschrijving
- **Tool-suggesties**: als een actie verwijst naar de interessetest of CV-upload, toon een compact kaartje met een actie-icoon
- **Gewone suggesties**: blijven als pill-knoppen (huidige vorm)

Dit wordt gedaan door een nieuw component `ChatSuggestions` dat de `actions` array parseert en de juiste weergave kiest op basis van het type.

## Technische wijzigingen per bestand

### `src/components/dashboard/DashboardChat.tsx`
- Import `Trash2` van lucide-react
- Import `resetConversation` uit de hook (al beschikbaar, niet gebruikt)
- Voeg Trash2 knop toe links van het invoerveld (alleen zichtbaar als messages.length > 1)
- Reset ook `knownSlots` bij wissen

### `src/pages/Chat.tsx`
- Verwijder de solid green header balk
- Wrap de hele chat in een `rounded-3xl border bg-card shadow-door` container binnen een `container max-w-3xl mx-auto`
- Compacte header: DOORai label + terugknop + wisknop (in de card header, niet apart)
- Bubbles: `rounded-2xl` i.p.v. `rounded-lg`
- Vervang `ChatActions` door het nieuwe `ChatSuggestions` component
- Input styling consistent met mini-chat (`rounded-xl`, `h-9`)

### `src/components/chat/ChatSuggestions.tsx` (nieuw)
- Vervangt `ChatActions` voor de volledige chatpagina
- Parseert de actions array:
  - Als `value` een intern pad bevat (`/vacatures`, `/opleidingen`, `/events`, `/kennisbank`): toon als link-kaart met route-icoon (Briefcase, GraduationCap, Calendar, BookOpen) en korte beschrijving
  - Als `value` verwijst naar test/CV: toon als actie-kaart met icoon
  - Anders: toon als pill-knop (bestaande styling)
- Link-kaarten zijn klikbaar en navigeren direct (geen chat-bericht)
- Pill-knoppen sturen het bericht zoals nu

### `src/components/chat/ChatActions.tsx`
- Blijft bestaan voor de mini-chat (compactere variant)
- Geen wijzigingen

## Bestanden

| Bestand | Wijziging |
|---------|-----------|
| `src/components/dashboard/DashboardChat.tsx` | Wisknop toevoegen |
| `src/pages/Chat.tsx` | Layout herontwerp, consistent met mini-chat |
| `src/components/chat/ChatSuggestions.tsx` | Nieuw: verrijkte suggesties met link-kaarten |

