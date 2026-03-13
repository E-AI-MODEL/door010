

# Server-side Draft Validatie (Optie A) + Link Rendering + 1-op-3 Regel

## Huidige situatie

1. **`reflectOnDraft()`** bestaat in `responsePipeline.ts` met checks op verboden termen, zinslengte, em-dashes en bronplicht — maar wordt **nergens aangeroepen**.
2. **Links**: `computeLinks()` berekent links, frontend ontvangt ze in `latestLinks` state, maar **er is geen JSX die ze rendert**.
3. **1-op-3 regel**: niet geimplementeerd — links worden altijd meegestuurd.
4. De stream-loop in `doorai-chat/index.ts` verwerkt content-deltas (met `replaceDashes`) maar **accumuleert het volledige antwoord niet** server-side.

## Wijzigingen

### 1. Backend: buffer + reflectie (doorai-chat/index.ts)

In de stream-loop (regel 910-950):
- Voeg een `fullResponse` accumulator toe die alle content-deltas verzamelt
- Na de stream (`[DONE]`), voer server-side reflectie uit:
  - **Verboden termen**: check tegen `FORBIDDEN_PHRASES` lijst (peildatum, kennisbank, als ai, etc.)
  - **Zinslengte**: tel zinnen, vergelijk met intent-specifieke limieten (greeting: 2, question: 4, exploration: 3)
  - **Em-dash check**: al afgevangen door `replaceDashes`, maar dubbel-check het resultaat
- Bij issues: voeg een `event: reflection` SSE-event toe met `{ issues: string[], pass: boolean }`
- De stream blijft intact (gebruiker ziet het antwoord real-time), reflectie is een post-check

### 2. Backend: 1-op-3 link regel (doorai-chat/index.ts)

Voordat `uiLinks` in het `event: ui` payload gaat:
- Tel assistant-berichten in de `messages` array
- Stuur `links` alleen mee wanneer:
  - `assistantCount % 3 === 0` (elk 3e bericht), OF
  - Gebruiker vraagt expliciet om een link (regex: `/link|bron|website|url|waar vind/i`), OF
  - Intent is `question` met bronplichtige content (salary/cost/route regex)
- Bij greetings: nooit links

### 3. Frontend: link-chips renderen (DashboardChat.tsx)

Onder de `ResponseActions` blok (regel 476-490), voeg een `LinkChips` sectie toe:
- Render `latestLinks` als klikbare chips
- Interne links (`/opleidingen`, `/events`) via `<Link>`
- Externe links via `<a target="_blank">` met ExternalLink icoon
- Styling: kleine rounded-full chips, consistent met bestaande `VerifiedLinkChips` in `CollapsibleAnswer.tsx`

### 4. Frontend: reflectie-waarschuwing (DashboardChat.tsx)

- Parse het `event: reflection` SSE-event in de stream-loop
- Als `pass === false`: toon een subtiele gele banner onder het bericht ("Dit antwoord is mogelijk onvolledig")
- Niet-blokkerend: gebruiker ziet het antwoord gewoon

## SSOT-gebruik in reflectie

De reflectie-checks gebruiken dezelfde constanten als `responsePipeline.ts`:
- `FORBIDDEN_PHRASES` array (9 termen)
- Zinslimiet per intent-type (mapping van intent naar maxSentences)
- Em-dash/en-dash regex

Deze worden als constanten in de edge function gedupliceerd (edge functions kunnen niet uit `src/` importeren).

## Bestanden

| Bestand | Actie |
|---------|-------|
| `supabase/functions/doorai-chat/index.ts` | Buffer stream, post-reflectie, 1-op-3 link regel, `event: reflection` |
| `src/components/dashboard/DashboardChat.tsx` | Link-chips JSX, reflectie-event parsing + waarschuwing |

## Sequentie

1. Backend: stream-buffer + reflectie-check + reflection event
2. Backend: 1-op-3 link frequentie
3. Frontend: link-chips rendering
4. Frontend: reflectie-waarschuwing
5. Deploy edge function

