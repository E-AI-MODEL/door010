

## Build Errors Fix

Two simple fixes needed:

### Fix 1: `doorai-chat/index.ts` line 1140
The variable `lastUserMsg` doesn't exist — it should be `lastUserMessage` (defined on line 861). This was introduced when the `buildConversationFollowups` function was updated to accept a `userMsg` parameter but the call site used the wrong variable name.

**Change line 1140:** `lastUserMsg` → `lastUserMessage`

### Fix 2: `scrape-events/index.ts` line 228
`error` is typed as `unknown` in the catch block. Need to cast it.

**Change line 228:** `error.message` → `(error as Error).message`

---

## Superuser Check: `vis@emmauscollege.nl`

The `seed-admin-users` edge function already includes `vis@emmauscollege.nl` with:
- Password: `admin010`
- Role: `admin`

This is correctly configured in the seed function (line 24 of `seed-admin-users/index.ts`). The account will work as superuser after the seed function has been executed. No changes needed for this.

---

## Summary

| File | Line | Fix |
|------|------|-----|
| `supabase/functions/doorai-chat/index.ts` | 1140 | `lastUserMsg` → `lastUserMessage` |
| `supabase/functions/scrape-events/index.ts` | 228 | Type assertion on `error` |

No other merge issues detected. Both are one-line fixes.

