

# Analyse: Pipeline status + ontbrekende widget-switch

## Wat werkt

| Feature | Status |
|---------|--------|
| AuthenticatedChatOverlay (unified popup) | Aanwezig, correct gerenderd in App.tsx |
| Phase-update alleen na bevestiging | Correct — `maybePersistProfile` schrijft geen `current_phase` |
| Backend intake contextbewust (doorai-chat) | Correct — `intake_question` + `slot_chips`, `role_interest` verwijderd |
| Intent-based links (geen 1-op-3 regel meer) | Correct — `shouldIncludeLinks` op basis van intent/keywords |
| Post-stream reflectie (SSOT forbidden phrases, zinslengte, em-dash) | Correct — server-side `event: reflection` |
| Frontend reflectie-waarschuwing | Correct — `reflectionWarning` state + banner |
| Link-chips rendering | Correct — interne `<Link>` + externe `<a>` met ExternalLink icoon |
| Dashboard TopicMenu → overlay event dispatch | Correct — `doorai-send-message` CustomEvent |
| Conversation persistence (save/load) | Correct — via `useChatConversation` |
| CollapsibleAnswer + ResponseActions | Correct — compact mode in overlay |

## Wat ontbreekt: widget-switch voor ingelogde gebruikers

**Het plan vermeldde**: "De ingelogde gebruiker kan op 1 plek switchen tussen beide chatbots: algemeen / persoonlijk."

**Huidige situatie**: `PublicChatWidget` retourneert `null` als `user` bestaat (regel 336). Ingelogde gebruikers hebben dus **geen toegang** tot de homepage-coach (algemene/publieke assistent). De `AuthenticatedChatOverlay` praat alleen met `doorai-chat`.

## Plan

### 1. Voeg mode-switch toe aan AuthenticatedChatOverlay

In de header van het overlay, voeg een toggle/tab toe: **"Persoonlijk"** (doorai-chat) en **"Algemeen"** (homepage-coach). Dit is de eenvoudigste aanpak — geen tweede widget nodig.

**Werking:**
- State `chatMode: "personal" | "general"` (default: `"personal"`)
- Bij `"general"`: stuur berichten naar `homepage-coach` endpoint i.p.v. `doorai-chat`
- Bij `"general"`: verberg fase-detectie, intake, phase-confirmation (niet relevant voor publieke widget)
- Bij switch: behoud elk gesprek apart (twee message-arrays of reset bij switch)
- Header toont twee kleine knoppen/tabs, visueel compact

### 2. Verwijder de `if (user) return null` in PublicChatWidget

De `PublicChatWidget` hoeft niet meer te renderen voor ingelogde gebruikers — de switch zit nu in het overlay. Maar de huidige `return null` is correct; hier verandert niets.

### 3. Kleine fixes gevonden tijdens analyse

- **`sendMessage` in event listener** (regel 124): `sendMessage` wordt gecalled in een `useEffect` maar is niet in de dependency array. Dit kan stale closures veroorzaken. Fix: wrap `sendMessage` in `useCallback` of gebruik een ref.
- **`message.role === "advisor"` check** (regel 511): het type `ChatMessageExt` definieert `role: string`, maar adviseur-berichten worden nergens toegevoegd in het overlay. Dode code — kan blijven maar is onschadelijk.

## Bestanden

| Bestand | Actie |
|---------|-------|
| `src/components/chat/AuthenticatedChatOverlay.tsx` | Mode-switch (personal/general) + dual endpoint logica + useCallback fix |

## Technische details

- Mode-switch als twee kleine pills in de header: `Persoonlijk | Algemeen`
- Bij `"general"` mode: `CHAT_URL` wordt `homepage-coach`, request body bevat `{ messages, mode: "public", context: { signals, site: "door010" } }`
- Bij switch: berichten worden gereset (of optioneel: twee gescheiden message-histories via een `Map`)
- Alle DoorAI-specifieke UI (intake, phase-confirmation, link-chips, reflection) wordt conditioneel verborgen in general mode
- Actions in general mode komen uit de `meta.actions` payload van homepage-coach (bestaande parsing werkt al)

