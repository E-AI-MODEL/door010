

# Compliance Check: PDF Spec vs Current Implementation

## What matches the spec

1. **Files created**: `responsePipeline.ts`, `IntakeSheet.tsx`, `CollapsibleAnswer.tsx`, `ResponseActions.tsx` -- all exist
2. **DashboardChat.tsx** and **Chat.tsx**: import and use `CollapsibleAnswer`, `ResponseActions`, `IntakeSheet`, SSE `event: ui` parsing
3. **doorai-chat**: max-2 actions cap, SSE `event: ui` payload
4. **homepage-coach**: server-side classify + meta before stream

## Gaps and deviations from spec

### A. `responsePipeline.ts` — Types diverge significantly

| Spec | Current |
|------|---------|
| `ResponseMode = "direct" \| "clarify_batch" \| "source_check" \| "handoff"` | `"public" \| "authenticated"` |
| `AnswerType` includes `"empathisch_steunend"`, `"bronplichtig"`, `"handoff_mens"` | Missing these three types |
| `StructuredResponse` has `mode`, `answer_type`, `collapse_recommended`, `verification_required`, `primary_followup`, `secondary_action` | Missing all of these fields |
| `IntakeQuestion` has `type: "choice" \| "open"` | Has `options[]` + `allowOpen` instead |
| `IntakeBatch` has `summary_template` | Missing |
| `ANSWER_TYPE_RULES` uses `maxSentences`, `requiresLink`, `allowsIntake`, `requiresVerifiedSource` | Uses `maxWords`, `maxLinks`, `maxActions` instead |
| `needsClarification` takes `(text, { missingSector, missingLevel, backendMode })` | Takes `{ userMessage, missingSlots, mode, turnCount }` — different signature |
| `buildIntakeQuestions` takes `{ missingSector, missingLevel }` | Takes `missingSlots: string[]` |
| `classifyAnswerType` includes patterns for `handoff_mens`, `empathisch_steunend`, `bronplichtig` | Missing these |
| `reflectOnDraft` takes `(draft, question, answerType, verifiedLinks)` and checks `requiresVerifiedSource` | Takes `(text, answerType)` only, simpler checks |

### B. `IntakeSheet.tsx` — Minor deviation
- Spec: `onSubmit` + no `onDismiss`; uses `type: "choice" | "open"` on questions
- Current: has `onDismiss` prop (fine addition), but `questions` type uses `label` + `options[]` + `allowOpen` instead of `question` + `type` + `options`

### C. `CollapsibleAnswer.tsx` — Correct concept, but spec says props should be `directAnswer` + `supportingDetail` + `verifiedLinks` directly, not `content` + `structured`
- Current wraps everything in a `structured?: StructuredResponse` prop which is fine as a pattern, but the spec expected `directAnswer` as a direct prop

### D. `ResponseActions.tsx` — Major deviation
- **Spec**: expects `response: Pick<StructuredResponse, "primary_followup" & "secondary_action">` with `onAskClick` and `onClose`
- **Current**: takes `actions: UiAction[]` + `links: UiLink[]` + `onActionClick` — completely different interface. Shows up to 2 action buttons + up to 6 link chips. Spec says max 2 total, no link chips row.

### E. `PublicChatWidget.tsx` — Not updated at all
- Spec says: import pipeline utilities, add `pendingIntake` state, use `IntakeSheet`, `CollapsibleAnswer`, `ResponseActions`
- **Current**: still uses its own `computeNextActions`, `inferSignalsFromUserText`, renders 3 action buttons via old tile system, no `CollapsibleAnswer`, no `IntakeSheet`, no pipeline imports. Completely untouched.

### F. `homepage-coach/index.ts` — Partially done
- Spec says: add STRUCTURED OUTPUT section to system prompt requesting the LLM to return meta with `mode`, `answer_type`, `direct_answer`, `supporting_detail`, etc.
- Current: server-side meta is built (good per the approved annotation), but `direct_answer` and `supporting_detail` are always `null` — defeating the purpose of CollapsibleAnswer

### G. Missing from `INTERNAL_URLS`
- Spec includes: `kennisbank`, `registreren`, `profiel`, `pabo`, `zij-instroom`, `zijinstroom`, `pdg`, `lerarenopleiding`
- Current: missing `kennisbank`, `registreren`, `pabo`, `zij-instroom`, `zijinstroom`, `pdg`, `lerarenopleiding`

---

## Plan: Align implementation with spec

### 1. Update `responsePipeline.ts`
- Change `ResponseMode` to `"direct" | "clarify_batch" | "source_check" | "handoff"`
- Add missing `AnswerType` values: `empathisch_steunend`, `bronplichtig`, `handoff_mens`
- Update `StructuredResponse` to include `mode`, `answer_type`, `collapse_recommended`, `verification_required`, `primary_followup`, `secondary_action`
- Update `IntakeQuestion` to use `question` (not `label`) and `type: "choice" | "open"`
- Add `summary_template` to `IntakeBatch`
- Update `ANSWER_TYPE_RULES` to use `maxSentences`, `requiresLink`, `allowsIntake`, `requiresVerifiedSource`
- Update `needsClarification` signature to `(text, { missingSector, missingLevel, backendMode })`
- Update `buildIntakeQuestions` to `({ missingSector, missingLevel })`
- Add missing patterns to `classifyAnswerType`
- Update `reflectOnDraft` to match spec (4 params, source checking)
- Add missing entries to `INTERNAL_URLS`

### 2. Update `IntakeSheet.tsx`
- Align props with updated `IntakeQuestion` type (use `question` field, `type` field)

### 3. Update `ResponseActions.tsx`
- Change interface to accept `response: Pick<StructuredResponse, "primary_followup" | "secondary_action">` + `onAskClick` + `onClose` + `compact`
- Remove link chips row — max 2 elements total (primary + secondary)

### 4. Update `CollapsibleAnswer.tsx`
- Keep current approach (it works well with fallback), but ensure it properly handles the new `StructuredResponse` fields

### 5. Update `PublicChatWidget.tsx`
- Import pipeline utilities
- Add `pendingIntake` + `intakeSummary` state
- Add intake trigger using `needsClarification` with signals
- Use `IntakeSheet` before input form
- Replace action tiles with `ResponseActions`
- Use `CollapsibleAnswer` for assistant bubbles
- Parse backend meta for structured fields

### 6. Update `DashboardChat.tsx` and `Chat.tsx`
- Align `ResponseActions` usage with new interface (build `{ primary_followup, secondary_action }` from latestActions/latestLinks)
- Update intake trigger to use new `needsClarification` signature

### 7. No edge function changes needed
- `doorai-chat` and `homepage-coach` are already close enough; the frontend alignment is the priority

