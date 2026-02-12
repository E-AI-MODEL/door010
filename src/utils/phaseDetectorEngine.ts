/**
 * Phase Detector Engine (Zij-instroom)
 *
 * Doel:
 * - deterministisch (geen LLM nodig)
 * - kiest phase_current + next_question (SSOT)
 * - stelt maximaal 1 vervolgvraag per beurt (via SSOT mapping)
 */
import { loadPhaseDetectorConfig, DetectorPhaseCode, SlotKey } from "./phaseDetectorParser";

export type UiPhaseCode =
  | "interesseren"
  | "orienteren"
  | "beslissen"
  | "matchen"
  | "voorbereiden";

export interface ConversationTurn {
  role: "user" | "assistant";
  text: string;
}

export type KnownSlots = Partial<Record<SlotKey, string>>;

export interface PhaseDetectorOutput {
  audience: string;
  phase_current: DetectorPhaseCode;
  phase_current_ui: UiPhaseCode;
  phase_confidence: number; // 0..1
  evidence: string[];
  known_slots: KnownSlots;
  missing_slots: SlotKey[];
  next_slot_key: SlotKey;
  next_question_id: string;
  next_question: string;
  next_phase_target?: DetectorPhaseCode;
}

const UI_TO_DETECTOR: Record<UiPhaseCode, DetectorPhaseCode> = {
  interesseren: "interesse",
  orienteren: "orientatie",
  beslissen: "beslissing",
  matchen: "matching",
  voorbereiden: "voorbereiding",
};

const DETECTOR_TO_UI: Record<DetectorPhaseCode, UiPhaseCode> = {
  interesse: "interesseren",
  orientatie: "orienteren",
  beslissing: "beslissen",
  matching: "matchen",
  voorbereiding: "voorbereiden",
};

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function lastUserText(conversation: ConversationTurn[]) {
  for (let i = conversation.length - 1; i >= 0; i--) {
    if (conversation[i].role === "user") return conversation[i].text || "";
  }
  return "";
}

function normalize(s: string) {
  return (s || "").toLowerCase().trim();
}

function extractSlots(text: string, base: KnownSlots): KnownSlots {
  const t = normalize(text);
  const next: KnownSlots = { ...base };

  // Sector
  if (!next.school_type) {
    if (/\bpo\b|basisonderwijs|primair|pabo|basisschool/.test(t)) next.school_type = "PO";
    else if (/\bvo\b|voortgezet|middelbare|tweedegraads|eerstegraads/.test(t)) next.school_type = "VO";
    else if (/\bmbo\b|beroepsonderwijs|pdg/.test(t)) next.school_type = "MBO";
  }

  // Regio (heel licht; voorkom privacy, geen adres)
  if (!next.region_preference) {
    if (/rotterdam|rijnmond|zuid-holland/.test(t)) next.region_preference = "Regio Rotterdam";
  }

  // Thema signalen (geen echte waarden, maar we kunnen wel "gevraagd" herkennen)
  if (!next.salary_info && /(salaris|verdien|inschaling|cao)/.test(t)) next.salary_info = "asked";
  if (!next.costs_info && /(kosten|studiekosten|financiering|subsidie|vergoeding)/.test(t)) next.costs_info = "asked";
  if (!next.duration_info && /(duur|hoe lang|tijd|looptijd|2 jaar|4 jaar)/.test(t)) next.duration_info = "asked";
  if (!next.admission_requirements && /(toelating|eisen|vooropleiding|diploma|geschiktheid)/.test(t)) next.admission_requirements = "asked";

  // Interesse rol
  if (!next.role_interest) {
    if (/(lesgeven|voor de klas|docent|leraar)/.test(t)) next.role_interest = "lesgeven";
    else if (/(begeleiden|mentor|coach|ondersteunen)/.test(t)) next.role_interest = "begeleiding";
  }

  // Next step
  if (!next.next_step) {
    if (/(vacature|solliciteren|baan|scholen zoeken)/.test(t)) next.next_step = "vacatures";
    else if (/(gesprek|intake|contact|bellen|afspraak)/.test(t)) next.next_step = "gesprek";
    else if (/(event|open dag|meeloop|proefles)/.test(t)) next.next_step = "event";
  }

  return next;
}

function scorePhases(
  currentUi: UiPhaseCode,
  conversation: ConversationTurn[],
): { scores: Record<DetectorPhaseCode, number>; evidence: string[] } {
  const text = normalize(lastUserText(conversation));
  const evidence: string[] = [];

  const base: Record<DetectorPhaseCode, number> = {
    interesse: 1,
    orientatie: 1,
    beslissing: 1,
    matching: 1,
    voorbereiding: 1,
  };

  // Kleine bias richting huidige fase, zodat je niet heen en weer springt
  base[UI_TO_DETECTOR[currentUi]] += 1.5;
  evidence.push(`Startpunt: huidige fase is ${currentUi}.`);

  // Keywords die echt iets zeggen over de stap in de reis
  if (/(vacature|solliciteren|scholen|werkplek|regio|rotterdam)/.test(text)) {
    base.matching += 2.5;
    evidence.push("Signaal: matchen (vacatures of regio).");
  }
  if (/(aanmelden|inschrijven|starten|intake|gesprek plannen|gesprek|vog|contract|eerste dag|voorbereiden)/.test(text)) {
    base.voorbereiding += 2.5;
    evidence.push("Signaal: voorbereiden (start, intake of praktische stappen).");
  }
  if (/(welke route|zij-instroom|pabo|tweedegraads|eerstegraads|pdg|toelating|eisen|diploma)/.test(text)) {
    base.orientatie += 2.0;
    evidence.push("Signaal: oriënteren (routes of eisen).");
  }
  if (/(twijfel|keuze maken|past dit|wel of niet|switch|overstap)/.test(text)) {
    base.beslissing += 1.8;
    evidence.push("Signaal: beslissen (twijfel of keuze).");
  }

  return { scores: base, evidence };
}

function pickPhase(
  currentUi: UiPhaseCode,
  conversation: ConversationTurn[],
): { phase: DetectorPhaseCode; confidence: number; evidence: string[] } {
  const { scores, evidence } = scorePhases(currentUi, conversation);
  const ordered = (Object.keys(scores) as DetectorPhaseCode[])
    .map((k) => ({ k, v: scores[k] }))
    .sort((a, b) => b.v - a.v);

  const top = ordered[0];
  const second = ordered[1];

  // Confidence: verschil tussen top en nummer 2, genormaliseerd
  const diff = top.v - second.v;
  const confidence = clamp01(0.35 + diff / 5);

  // Bij lage confidence: houd huidige fase aan (stabieler gedrag)
  if (confidence < 0.45) {
    evidence.push("Confidence laag, houd huidige fase aan voor stabiliteit.");
    return { phase: UI_TO_DETECTOR[currentUi], confidence, evidence };
  }

  return { phase: top.k, confidence, evidence };
}

function chooseNextSlot(
  phase: DetectorPhaseCode,
  known: KnownSlots,
): { missing: SlotKey[]; nextSlot: SlotKey } {
  const { rules } = loadPhaseDetectorConfig();
  const phaseRule = rules.phases.find((p) => p.code === phase);

  const required = (phaseRule?.required_slots || []) as SlotKey[];
  const optional = (phaseRule?.optional_slots || []) as SlotKey[];

  const missingRequired = required.filter((s) => !known[s]);
  if (missingRequired.length > 0) {
    return { missing: missingRequired, nextSlot: missingRequired[0] };
  }

  // Als required compleet is, kies de eerste ontbrekende optional in de SSOT volgorde (zoals in rules)
  const missingOptional = optional.filter((s) => !known[s]);
  if (missingOptional.length > 0) {
    return { missing: missingOptional, nextSlot: missingOptional[0] };
  }

  // Fallback: altijd een volgende stap slot
  return { missing: [], nextSlot: "next_step" };
}

function pickQuestionForSlot(slot: SlotKey): { id: string; text: string } {
  const { questions } = loadPhaseDetectorConfig();
  const qList = questions.slot_to_questions[slot];

  if (qList && qList.length > 0) {
    return { id: qList[0].question_id, text: qList[0].question_text };
  }

  // Laatste fallback (zou zelden gebeuren)
  return {
    id: "S00000",
    text: "Waar wil je nu mee beginnen: route, eisen, duur, kosten, salaris of vacatures?",
  };
}

export function runPhaseDetector(args: {
  conversation: ConversationTurn[];
  known_slots?: KnownSlots;
  current_phase_ui?: UiPhaseCode;
}): PhaseDetectorOutput {
  const { rules } = loadPhaseDetectorConfig();

  const currentUi: UiPhaseCode = args.current_phase_ui || "interesseren";
  const baseKnown = args.known_slots || {};

  const latestText = lastUserText(args.conversation);
  const known = extractSlots(latestText, baseKnown);

  const picked = pickPhase(currentUi, args.conversation);

  const nextPhaseTarget =
    rules.phases.find((p) => p.code === picked.phase)?.next_phase_default;

  const slotChoice = chooseNextSlot(picked.phase, known);
  const q = pickQuestionForSlot(slotChoice.nextSlot);

  return {
    audience: rules.audience?.label || "Zij-instromer",
    phase_current: picked.phase,
    phase_current_ui: DETECTOR_TO_UI[picked.phase],
    phase_confidence: picked.confidence,
    evidence: picked.evidence,
    known_slots: known,
    missing_slots: slotChoice.missing,
    next_slot_key: slotChoice.nextSlot,
    next_question_id: q.id,
    next_question: q.text,
    next_phase_target: nextPhaseTarget,
  };
}
