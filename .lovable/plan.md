

## Fix: Dashboard auto-scroll en gesprek wissen

### Probleem 1: Dashboard scrollt naar beneden bij laden

De DashboardChat component scrollt automatisch naar het laatste bericht wanneer berichten laden. Omdat `scrollIntoView` wordt gebruikt, scrollt dit de **hele pagina** mee naar beneden, niet alleen het chatvenster.

**Oorzaak**: In `DashboardChat.tsx` regel 89-91 wordt `messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })` aangeroepen bij elke berichtwijziging. Dit beweegt de hele viewport.

**Oplossing**: Vervang `scrollIntoView` door een scroll binnen het chat-container element zelf. Gebruik een ref op de scroll-container (de `div` met `overflow-y-auto` op regel 279) en stel `scrollTop = scrollHeight` in. Hierdoor scrollt alleen de chat-inhoud, niet de hele pagina.

### Probleem 2: Gesprek wissen werkt alleen tijdelijk

De "wis gesprek" functie (prullenbak-icoon) reset alleen de lokale React state, maar verwijdert niets uit de database. Bij navigatie naar `/chat` of bij een page refresh laadt `loadConversation` de oude berichten gewoon opnieuw uit de database.

**Oorzaak**: `resetConversation` in `useChatConversation.ts` doet alleen:
- `setConversationId(null)`
- `setMessages([])`
- `setLatestActions([])`

Er wordt geen `DELETE` uitgevoerd op de `messages` of `conversations` tabel.

**Oplossing**: Pas `resetConversation` aan zodat het ook de database opschoont:
1. Verwijder alle berichten van de huidige conversatie (`DELETE FROM messages WHERE conversation_id = ...`)
2. Verwijder de conversatie zelf (`DELETE FROM conversations WHERE id = ...`)
3. Reset daarna pas de lokale state

### Technische details

| Bestand | Wijziging |
|---------|-----------|
| `src/components/dashboard/DashboardChat.tsx` | Vervang `scrollIntoView` door container-gebaseerde scroll met een ref op de overflow-div |
| `src/hooks/useChatConversation.ts` | Voeg database deletes toe aan `resetConversation`: verwijder messages en conversation uit Supabase voordat lokale state wordt gereset |
| `src/pages/Chat.tsx` | Zelfde scroll-fix als DashboardChat (regel 94-100): scroll alleen binnen de chat-container |

### RLS check

De `messages` tabel heeft **geen DELETE policy** voor gebruikers. Er moet een RLS policy worden toegevoegd:
- "Users can delete messages in own conversations" met conditie: `EXISTS (SELECT 1 FROM conversations WHERE conversations.id = messages.conversation_id AND conversations.user_id = auth.uid())`

De `conversations` tabel heeft al een DELETE policy voor eigen conversations.

### Database migratie nodig

Een nieuwe RLS policy op de `messages` tabel zodat gebruikers hun eigen berichten kunnen verwijderen.

