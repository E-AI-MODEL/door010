# Check dit Voordat je uitvoert:,

# Goed plan van Lovable — de structuur klopt en de volgorde is logisch. Een paar dingen om op te letten voordat je akkoord geeft:

Wat goed is:

	∙	De sequentie is correct: responsePipeline.ts eerst, dan components, dan de consumers

	∙	Chat.tsx is terecht apart benoemd — die hadden we nog niet expliciet in de spec staan maar die heeft dezelfde CollapsibleAnswer nodig

	∙	Het onderscheid tussen event: ui (doorai-chat) en de meta SSE vóór streaming (homepage-coach) is correct opgepikt

Eén risico om te benoemen:

De backend-instructie voor homepage-coach vraagt de LLM een meta-event te sturen vóór de streaming tekst. Dat is fragiel — LLMs houden zich niet altijd aan volgorde-instructies in streaming context. De doorai-chat functie doet dit al correct via een expliciete event: ui payload vanuit de Deno-code zelf, niet via de LLM. Lovable moet hetzelfde patroon toepassen voor homepage-coach: de meta bouwen in Deno op basis van een eerste pass classify-call, en pas daarna streamen. Voeg dit toe aan de instructie:

In homepage-coach/index.ts: bouw het meta-object niet via de LLM zelf maar via een synchrone classify-stap vóór de stream. Stuur het als data: {"meta":{...}}\n\n vanuit Deno direct vóór je de upstream stream doorstuurt. Gebruik classifyAnswerType() logica (of een identieke server-side variant) op de laatste user-message om mode en answer_type te bepalen. direct_answer en supporting_detail kun je pas na de volledige response splitsen — doe dat in een non-streaming classify-call als de stream klaar is, of accepteer dat die velden leeg zijn bij de widget en alleen de fallback render gebruikt wordt.

Tweede punt: Lovable noemt event: ui als SSE event type voor doorai-chat maar de spec gebruikt data: regels. Check of de frontend parser in beide chatcomponenten consistent event: ui afhandelt — in DashboardChat.tsx staat nu parsed.actions en parsed.links als losse checks, niet een event-type check. Dat moet consistent worden.

Verder ziet het er solide uit. Geef groen licht met die twee annotaties mee.​​​​​​​​​​​​​​​​

Plan: Response Pipeline Upgrade (P0)

Based on the uploaded spec, this is a layered upgrade adding structured responses, intake flow, and collapsible answers across both chat interfaces.

## New Files

### 1. `src/utils/responsePipeline.ts`

Shared module with types and logic used by both widget and dashboard chat:

- Types: `ResponseMode`, `AnswerType`, `StructuredResponse`, `IntakeQuestion`, `IntakeBatch`
- `ANSWER_TYPE_RULES` — output constraints per answer type
- `INTERNAL_URLS` — keyword-to-route mapping
- `resolveInternalUrl()` — match text to internal route
- `needsClarification()` — triggers on 3 signals: broad question, missing slots, backend mode
- `buildIntakeQuestions()` — generates up to 3 intake questions based on missing slots
- `classifyAnswerType()` — regex-based classification (reproductie, wegwijs, verkenning, etc.)
- `reflectOnDraft()` — post-generation quality checks (length, links, forbidden phrases)

### 2. `src/components/chat/IntakeSheet.tsx`

Compact intake form with choice chips and optional open field. Submits all answers in one batch. Supports `compact` prop for widget vs dashboard sizing.

### 3. `src/components/chat/CollapsibleAnswer.tsx`

Two-layer answer display:

- `directAnswer` always visible (1-2 sentences)
- `supportingDetail` behind "Meer achtergrond" toggle
- `verifiedLinks` shown inside the expanded detail section
- Fallback: if only `content` exists (streaming/legacy), renders plain markdown without collapse

### 4. `src/components/chat/ResponseActions.tsx`

Max 2 action buttons (primary + secondary). Primary can be an ask-action or internal link; secondary is always a link. No wrap, no fallback tiles.

## Modified Files

### 5. `src/components/chat/PublicChatWidget.tsx`

- Import new pipeline utilities and components
- Add `pendingIntake` and `intakeSummary` state
- Insert intake trigger in `sendMessageWithText` using `needsClarification()` with current signals
- Render `IntakeSheet` before the input form when pending
- Replace action rendering with `ResponseActions` (max 2 tiles)
- Use `CollapsibleAnswer` for assistant message bubbles (with streaming fallback)
- Parse backend `meta` event for `direct_answer`, `supporting_detail`, `verified_links`

### 6. `src/components/dashboard/DashboardChat.tsx`

- Same imports and intake flow as widget
- Intake trigger uses `knownSlots` for missing sector/level detection
- Replace action buttons with `ResponseActions`
- Replace assistant text bubbles with `CollapsibleAnswer`
- Handle SSE `event: ui` for structured meta

### 7. `supabase/functions/homepage-coach/index.ts`

- Add structured output instruction to system prompt requesting a `meta` SSE event before streaming
- Meta fields: `mode`, `answer_type`, `direct_answer`, `supporting_detail`, `verified_links`, `primary_followup`, `secondary_action`

### 8. `supabase/functions/doorai-chat/index.ts`

- Add reflection layer after UI payload construction: check bronplichtigheid, add fallback link if claims without sources
- Cap actions to max 2 (`uiPayload.actions.slice(0, 2)`)

### 9. `src/pages/Chat.tsx`

- Extend Message type with `directAnswer?`, `supportingDetail?`, `verifiedLinks?`
- Parse `event: ui` meta to populate structured fields on last message
- Use `CollapsibleAnswer` for assistant bubbles

## What stays untouched

- `useChatConversation.ts`, `phaseDetectorEngine.ts`, `ChatSuggestions.tsx`
- Auth flow, backoffice, events, kennisbank pages
- Existing Supabase schema and migrations

## Sequence

1. Create `responsePipeline.ts` (foundation)
2. Create `IntakeSheet`, `CollapsibleAnswer`, `ResponseActions` components
3. Update `PublicChatWidget.tsx` and `DashboardChat.tsx` with new pipeline
4. Update `Chat.tsx` for structured message display
5. Update `doorai-chat/index.ts` (reflection + max-2 actions)
6. Update `homepage-coach/index.ts` (structured meta prompt)
7. Deploy edge functions