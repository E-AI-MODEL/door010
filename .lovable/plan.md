

# Root-Cause Analyse: Intake, Circulatie, Tegels en Burgermenu

---

## 1. Intakevragen — Waarom altijd PO/VO/MBO of MBO/HBO/WO?

### B. Bewezen oorzaak

**Er zijn twee onafhankelijke bronnen van intakevragen, en beide zijn hardcoded:**

**Bron 1: Backend (`doorai-chat/index.ts`, regels 1082-1096)**
```typescript
const INTAKE_TRIGGER_SLOTS: SlotKey[] = ["school_type", "admission_requirements"];
const INTAKE_QUESTIONS: Record<string, string> = {
  school_type: "Naar welke sector gaat je interesse uit?",
  admission_requirements: "Wat is je hoogst afgeronde vooropleiding?",
};
```
De backend triggert intake alleen voor `school_type` en `admission_requirements`. De chip-opties komen uit `actionsForNextSlot()` (regels 362-415):
- `school_type` → hardcoded `["PO", "VO", "MBO"]`
- `admission_requirements` → hardcoded `["MBO", "HBO", "WO", "Anders"]`

Dit is bewezen oorzaak #1: er bestaan exact 2 intakevragen, en de opties zijn vaste arrays. De SSOT (`phase-detector-questions.json`) met honderden rijke vragen wordt hier niet geconsulteerd.

**Bron 2: Frontend publieke widget (`PublicChatWidget.tsx`, regels 136-149)**
```typescript
const missingSector = nextSignals.sector === "UNK";
const missingLevel = nextSignals.studyLevel === "UNK";
if (needsClarification(text, { missingSector, missingLevel, backendMode: "direct" })) {
  const intakeQs = buildIntakeQuestions({ missingSector, missingLevel });
```
`buildIntakeQuestions()` in `responsePipeline.ts` (regels 145-167) is ook hardcoded:
- `school_type` → `["Basisonderwijs (PO)", "Voortgezet onderwijs (VO)", "MBO"]`
- `admission_requirements` → `["MBO", "HBO", "WO"]`

Bewezen oorzaak #2: de publieke widget dupliceert de logica client-side met dezelfde vaste opties.

**Conclusie**: De SSOT-vragen (`phase-detector-questions.json`) worden nergens gebruikt voor intakeweergave. Alleen het `slot_to_questions`-bestand bepaalt `next_question` in de detector output, maar die output wordt niet als intakevraag aan de gebruiker getoond.

---

## 2. Circulatie / Herhaling

### B. Bewezen oorzaak

**`chooseNextSlot()` in `phaseDetectorEngine.ts` (regels 244-266):**
```typescript
const allSlots = [...required, ...optional];
const missing = allSlots.filter((s) => !known[s]);
if (missing.length > 0) {
  if (previousNextSlot && missing[0] === previousNextSlot && missing.length > 1) {
    return { missing, nextSlot: missing[1] };
  }
  return { missing, nextSlot: missing[0] };
}
```

De `previousNextSlot` parameter zou herhaling moeten voorkomen, maar wordt **niet doorgegeven vanuit de overlay**. In `AuthenticatedChatOverlay.tsx` regel 215:
```typescript
const detector = runPhaseDetector({
  conversation: conversationTurns,
  known_slots: knownSlots,
  current_phase_ui: currentPhase,
  // previous_next_slot is NIET meegegeven
});
```

Bewezen oorzaak: `previous_next_slot` wordt nooit gevuld. Daardoor valt `chooseNextSlot` altijd terug op `missing[0]`, wat bijna altijd `school_type` is (staat als eerste in `required_slots` voor orientatie t/m voorbereiding, en als eerste in `optional_slots` voor interesse).

Bovendien: als de gebruiker "Overslaan" klikt op de intake, wordt de slot via `dismissedIntakeSlots` geblokkeerd in de UI, maar de detector blijft dezelfde slot als `next_slot_key` teruggeven. De backend ziet de slot nog steeds als leeg en stuurt opnieuw `intake_needed: true`. De frontend blokkeert het visueel, maar de cyclus draait intern door.

---

## 3. Dynamische tegels — "meer over voortgezet onderwijs"

### B. Bewezen oorzaak

**`buildConversationFollowups()` in `doorai-chat/index.ts` (regels 1048-1079):**
```typescript
if (sector) return [
  { label: `Meer over ${sectorLabel}`, value: `Vertel me meer over werken in ${sectorLabel}.` },
];
```

Dit is de fallback wanneer de fase niet `orienteren`, `beslissen`, `matchen` of `voorbereiden` is. Zodra `school_type` is ingevuld (bijv. "VO"), genereert de backend altijd `Meer over voortgezet onderwijs` als actieknop in de `interesseren`-fase.

Bewezen oorzaak: de fallback in regel 1075-1077 is te generiek en wordt bijna altijd getriggerd zodra er een sector bekend is.

**Aanvullend**: `getSlotTopics()` in `TopicMenu.tsx` (regels 138-176) doet hetzelfde client-side:
```typescript
if (st === "VO") {
  items.push({
    label: "Voortgezet onderwijs (VO)",
    subTopics: [...]
  });
}
```
Dit is hardcoded en altijd zichtbaar zodra `school_type === "VO"`.

---

## 4. Burgermenu versus SSOT

### B. Bewezen oorzaak

**`TopicMenu.tsx` is volledig hardcoded.** De functies `getPhaseTopics()` (regels 28-136) en `getSlotTopics()` (regels 138-176) bevatten handmatig samengestelde arrays per fase en per sector. Ze raadplegen de SSOT niet.

De SSOT (`phase-detector-questions.json`) bevat honderden vragen over onderwerpen als:
- Geschiktheidsonderzoek, buitenlandse diploma's, specifieke vakken, meeloopdagen, VOG, regio-specifiek advies, PDG vs. zij-instroom, etc.

Het menu toont per fase typisch 3-5 top-level items met elk 2-4 subonderwerpen. Dat is ~15 vragen. De SSOT heeft 600+ vragen verdeeld over 9 slots.

Bewezen oorzaak: het menu is een handmatige selectie die niet gekoppeld is aan de SSOT of de detectoroutput.

---

## 5. Conclusies

### A. Hypothesen (niet hard bewezen)
- De publieke widget zou ook circulatiegedrag kunnen vertonen als gebruikers meerdere berichten sturen zonder sector te noemen (hypothese - niet getest in live flow).

### B. Hard bewezen oorzaken

| # | Oorzaak | Bestand | Regel(s) |
|---|---------|---------|----------|
| 1 | Intakeopties zijn hardcoded, SSOT wordt niet gebruikt | `doorai-chat/index.ts` | 362-415, 1082-1096 |
| 2 | `buildIntakeQuestions()` in publieke widget is ook hardcoded | `responsePipeline.ts` | 145-167 |
| 3 | `previous_next_slot` wordt niet doorgegeven → altijd slot[0] | `AuthenticatedChatOverlay.tsx` | 215-219 |
| 4 | Dismissed slots blokkeren alleen UI, niet de detector | `AuthenticatedChatOverlay.tsx` | 302-317, 509-518 |
| 5 | Fallback-actie "Meer over [sector]" is altijd actief bij bekende sector | `doorai-chat/index.ts` | 1075-1077 |
| 6 | TopicMenu is volledig hardcoded, geen SSOT-koppeling | `TopicMenu.tsx` | 28-176 |

### C. Kleinste structurele verbeteringen

**Fix 1: `previous_next_slot` doorgeven aan detector**
- In `AuthenticatedChatOverlay.tsx`: state bijhouden van het laatst aangeboden slot en doorgeven als `previous_next_slot`.
- Lost op: herhalend aanbieden van dezelfde intakevraag.
- Lost niet op: beperkt aantal intakevragen, geen SSOT-gebruik.
- Type: structurele reparatie.

**Fix 2: Dismissed slots doorgeven aan detector zodat die ze als "gevuld" beschouwt**
- In `chooseNextSlot`: dismissed slots toevoegen aan de `known` map (als placeholder "dismissed").
- Lost op: circulatie na "Overslaan" klik.
- Lost niet op: backend stuurt nog steeds `intake_needed`.
- Type: structurele reparatie.

**Fix 3: `buildConversationFollowups()` minder generiek maken**
- Verwijder de catch-all `if (sector)` fallback. Geef lege acties als er geen fase-specifieke match is.
- Lost op: repetitieve "Meer over VO" knoppen.
- Lost niet op: het menu blijft statisch.
- Type: symptoombestrijding (maar effectief).

**Fix 4: TopicMenu uitbreiden met SSOT-gedreven items**
- `phase_to_questions` uit de SSOT laden en als extra groep tonen, naast de bestaande handmatige items.
- Lost op: het menu toont meer thema's die de backend daadwerkelijk kan beantwoorden.
- Lost niet op: de handmatige items blijven bestaan (en dat is ok als curated selectie).
- Type: structurele verbetering, middelgroot.

**Fix 5: SSOT-vragen gebruiken voor intake in plaats van hardcoded opties**
- `actionsForNextSlot()` en `buildIntakeQuestions()` laten lezen uit de SSOT (`slot_to_questions`).
- Lost op: meer variatie in intakevragen.
- Lost niet op: de opties/chips zelf (die moeten apart gedefinieerd worden, want de SSOT bevat open vragen, geen meerkeuzeopties).
- Type: structurele verbetering, maar de SSOT bevat geen chips/opties - alleen vraagteksten. De chips moeten apart gedefinieerd.

**Aanbevolen volgorde**: Fix 1 + Fix 2 eerst (circulatie stoppen), dan Fix 3 (visuele herhaling verminderen), dan Fix 4 (menu verrijken).

