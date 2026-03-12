# Doe de fix maar houdt dit in de gaten : 

Goed — Lovable heeft de drie fixes correct geïdentificeerd en de juiste bestanden benoemd. De sequentie klopt ook: migratie eerst, dan backend, dan frontend.

Één ding om scherp op te letten bij de implementatie:

De migratie en de TypeScript types moeten synchroon lopen. Als known_slots jsonb in de database zit maar supabase/integrations/supabase/types.ts nog niet is geregenereerd, krijg je type-errors of silently-wrong nulls bij het uitlezen. Lovable moet na de migratie de Supabase types regenereren of handmatig de profiles row-type uitbreiden met known_slots: Json | null.

Het corrected_slots terugsturen vanuit de backend is slim maar heeft één subtiliteit: de backend normaliseert via normalizeSlots en dat kan waarden veranderen (bijv. “mbo” → “MBO”). Als de frontend die correctie merget in knownSlots state én tegelijk maybePersistProfile al heeft geschreven, kan er een write-conflict ontstaan. Zorg dat de merge na de persist plaatsvindt, niet ervoor.

De needsClarification pre-flight verwijderen is de juiste call — maar zorg dat Chat.tsx en DashboardChat.tsx allebei worden aangepast, niet alleen één van de twee. Ze hebben momenteel allebei die check.

Laat weten hoe het loopt na de implementatie.​​​​​​​​​​​​​​​​

# Fix: Drie structurele scheuren in de ingelogde chat flow

## 1. Known slots persisteren (database + frontend)

**Probleem**: `knownSlots` leeft alleen in sessie-state, reset bij refresh.

**Fix**:

- Migratie: voeg `known_slots jsonb default '{}'` toe aan `profiles` tabel
- `DashboardChat.tsx`: initialiseer `knownSlots` uit `profile.known_slots` (niet alleen `preferredSector`)
- `maybePersistProfile`: schrijf `known_slots` mee terug naar `profiles` bij elke update
- `Dashboard.tsx`: lees `known_slots` uit profiel en geef door als prop

## 2. Slot-chips en gespreksacties scheiden

**Probleem**: `ssotActions` (slot-chips) en `ResponseActions` (gespreksvervolg) delen hetzelfde `actions` veld in `event: ui`.

**Fix**:

- `doorai-chat/index.ts`: splits het UI payload in twee velden:
  - `slot_chips: UiAction[]` — voor ontbrekende slots (PO/VO/MBO keuzes)
  - `actions: UiAction[]` — voor gespreksvervolg (max 2)
  - Voeg `intake_needed: boolean` toe aan het payload
- `DashboardChat.tsx`: 
  - Als `intake_needed` true is in `event: ui`, toon `IntakeSheet` met de `slot_chips`
  - Toon `ResponseActions` alleen voor `actions`
- Verwijder de client-side `needsClarification` pre-flight check — de backend beslist

## 3. Feedback loop: backend → client slot correcties

**Probleem**: backend normaliseert slots maar stuurt geen correcties terug.

**Fix**:

- `doorai-chat/index.ts`: voeg `corrected_slots: Record<string, string>` toe aan `event: ui` payload met de genormaliseerde waarden
- `DashboardChat.tsx`: bij ontvangst van `corrected_slots`, merge in `knownSlots` state

## Sequentie

1. Database migratie (`known_slots` kolom)
2. Backend: split UI payload + `intake_needed` + `corrected_slots`
3. Frontend: lees `known_slots` uit profiel, verwerk nieuwe payload structuur
4. Verwijder `needsClarification` pre-flight uit frontend

## Bestanden


| Bestand                                      | Actie                                                 |
| -------------------------------------------- | ----------------------------------------------------- |
| `profiles` tabel                             | Migratie: `known_slots jsonb`                         |
| `supabase/functions/doorai-chat/index.ts`    | Split payload, add `intake_needed`, `corrected_slots` |
| `src/components/dashboard/DashboardChat.tsx` | Init from DB, remove pre-flight, handle new payload   |
| `src/pages/Dashboard.tsx`                    | Pass `known_slots` prop                               |
| `src/pages/Chat.tsx`                         | Same payload handling as DashboardChat                |
