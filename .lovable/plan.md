

## Analyse

### Probleem 1: "Externe updates niet zichtbaar"

De edge functions werken technisch (homepage-coach retourneert correct SSE met meta + actions). Maar er zijn twee problemen:

1. **Thematische acties herhalen de vraag van de gebruiker.** Wanneer iemand "Wat verdient een leraar?" vraagt, retourneert `publicThemes()` een actie met exact hetzelfde label ("Salaris en arbeidsvoorwaarden" → "Wat verdient een leraar?"). De gebruiker ziet dus geen *nieuwe* richting, maar een herhaling van de zojuist gestelde vraag.

2. **De conversation router blokkeert soms te agressief.** In `decideConversationMode`, als `assistantContentShort` true is en er geen links/actions zijn, wordt de mode `clarify` — wat alle chips en links blokkeert. Maar de homepage-coach stuurt altijd `verified_links` mee. Het probleem zit erin dat `genHasExternalResults` en `genOffersExternalSearch` nooit `true` worden (die velden bestaan niet in de homepage-coach response), waardoor de router het altijd als `internal_answer` classificeert. Dit is op zich correct, maar de acties worden soms als niet-relevant ervaren doordat ze de vraag herhalen.

3. **Persoonlijke pipeline**: `buildConversationFollowups` gebruikt `deriveThemes()` die phase+slots-driven is, maar filtert niet op wat de gebruiker *zojuist* vroeg. Dus ook hier kan de actie de huidige vraag herhalen.

### Probleem 2: Backoffice "wis gesprekken" knop

De `AdvisorChatPanel` heeft geen knop om gesprekken van een kandidaat te wissen. Dit is een eenvoudige toevoeging: een delete-knop die alle berichten + de conversatie verwijdert voor de geselecteerde gebruiker.

---

## Plan

### Stap 1: Fix thematische acties — filter "herhaling van huidige vraag"

**Bestanden:** `supabase/functions/_shared/themes.ts`

- Voeg aan `publicThemes()` een optionele parameter `excludeKeys?: string[]` toe.
- In `homepage-coach/index.ts`: detecteer welk thema de huidige vraag al beantwoordt, en sluit dat key uit van de acties.
- In `doorai-chat/index.ts` (`buildConversationFollowups`): filter themes die matchen met de huidige user-vraag (via simpele keyword check).

Dit zorgt ervoor dat follow-up acties altijd een *andere* richting suggereren.

### Stap 2: Verbeter `publicThemes()` exclude-logica

**Bestand:** `supabase/functions/homepage-coach/index.ts`

- Na het bepalen van themes, verwijder het theme waarvan de `chatPrompt` te veel overlapt met het user message.
- Voeg een fallback toe zodat er altijd minstens 1 bruikbare actie overblijft.

### Stap 3: Verbeter `buildConversationFollowups()` in doorai-chat

**Bestand:** `supabase/functions/doorai-chat/index.ts`

- Pass het laatste user message door.
- Filter themes die qua key overeenkomen met het onderwerp dat de gebruiker net behandelde.
- Zorg dat de acties altijd een *nieuwe* richting bieden.

### Stap 4: Backoffice "Wis gesprekken" knop

**Bestanden:** `src/components/backoffice/AdvisorChatPanel.tsx`, `src/pages/Backoffice.tsx`

- Voeg een "Wis gesprek" knop toe in de `AdvisorChatPanel` header (naast de X-knop).
- Bij klik: toon een bevestigingsdialoog.
- Bij bevestiging: verwijder alle `messages` voor de `conversationId`, verwijder de `conversation` zelf, reset de local state.
- De RLS policies staan dit al toe voor advisors (advisors can view all messages/conversations, en er zijn delete policies via conversation ownership — maar advisors missen een expliciete DELETE policy op messages/conversations).

**Database:** Er is een DELETE policy op `messages` via conversation ownership, maar advisors hebben geen directe DELETE rechten. Oplossing: gebruik de `service_role` via een kleine edge function, OF voeg RLS policies toe voor advisors. De eenvoudigste route: voeg DELETE policies toe voor advisors op `messages` en `conversations`.

---

## Samenvatting wijzigingen

| Bestand | Wijziging |
|---------|-----------|
| `supabase/functions/_shared/themes.ts` | `publicThemes()` en `deriveThemes()` krijgen exclude-parameter |
| `supabase/functions/homepage-coach/index.ts` | Filter acties die huidige vraag herhalen |
| `supabase/functions/doorai-chat/index.ts` | Filter follow-ups die huidige vraag herhalen |
| `src/components/backoffice/AdvisorChatPanel.tsx` | "Wis gesprek" knop + bevestigingsdialoog |
| Database migratie | DELETE policies voor advisors op `messages` en `conversations` |

