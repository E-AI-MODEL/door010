

## Fix: Chat.tsx stuurt geen profielgegevens mee naar de LLM

### Probleem

De volledige chatpagina (`/chat`) stuurt geen `profileMeta` (voornaam, bio, testresultaten) mee naar de edge function. De LLM weet daardoor niet wie de gebruiker is en geeft generieke, herhalende antwoorden.

De Dashboard-chat (`DashboardChat.tsx`) doet dit wel correct (regels 173-178), maar `Chat.tsx` mist dit volledig (regels 185-192).

### Oorzaak

In `Chat.tsx` wordt het profiel opgehaald met alleen `current_phase` en `preferred_sector` (regel 64). De velden `first_name`, `bio`, `test_completed` en `test_results` worden niet opgehaald en dus ook niet meegestuurd in de fetch-body naar `doorai-chat`.

### Oplossing

**Bestand: `src/pages/Chat.tsx`**

1. Breid de `Profile` interface uit met `first_name`, `bio`, `test_completed` en `test_results`
2. Voeg deze velden toe aan de `.select()` query (regel 64)
3. Stuur `profileMeta` mee in de fetch body (na regel 191), identiek aan DashboardChat.tsx

### Technische details

Wijzigingen in `src/pages/Chat.tsx`:

| Regel | Wat | Wijziging |
|-------|-----|-----------|
| 15-18 | Profile interface | Voeg `first_name`, `bio`, `test_completed`, `test_results` toe |
| 64 | select query | Voeg extra kolommen toe aan de select |
| 185-192 | fetch body | Voeg `profileMeta` object toe met naam, bio en testresultaten |

Dit is een kleine, gerichte fix in 1 bestand die het gedrag gelijktrekt met de Dashboard-chat.

