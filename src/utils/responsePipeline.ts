// ═══════════════════════════════════════════════════════════════════
// Response Pipeline — shared types & logic for chat consumers
// ═══════════════════════════════════════════════════════════════════

// ── Types ────────────────────────────────────────────────────────

export type ResponseMode = "public" | "authenticated";

export type AnswerType =
  | "reproductie"   // factual recall (salary, duration, costs)
  | "wegwijs"       // navigation / link-heavy
  | "verkenning"    // exploration, options side-by-side
  | "intake"        // needs clarification first
  | "begroeting";   // greeting

export interface StructuredResponse {
  directAnswer?: string;        // 1-2 sentences, always visible
  supportingDetail?: string;    // collapsible "Meer achtergrond"
  verifiedLinks?: VerifiedLink[];
}

export interface VerifiedLink {
  label: string;
  href: string;
  external?: boolean;
}

export interface IntakeQuestion {
  id: string;
  label: string;
  options: string[];
  allowOpen?: boolean;
}

export interface IntakeBatch {
  questions: IntakeQuestion[];
  context: string;
}

// ── Answer Type Rules ────────────────────────────────────────────

export const ANSWER_TYPE_RULES: Record<AnswerType, { maxWords: number; maxLinks: number; maxActions: number }> = {
  reproductie:  { maxWords: 120, maxLinks: 4, maxActions: 2 },
  wegwijs:      { maxWords: 80,  maxLinks: 4, maxActions: 2 },
  verkenning:   { maxWords: 100, maxLinks: 3, maxActions: 2 },
  intake:       { maxWords: 60,  maxLinks: 1, maxActions: 2 },
  begroeting:   { maxWords: 60,  maxLinks: 1, maxActions: 2 },
};

// ── Internal URL Mapping ─────────────────────────────────────────

export const INTERNAL_URLS: Record<string, string> = {
  opleidingen: "/opleidingen",
  routes: "/opleidingen",
  vacatures: "/vacatures",
  events: "/events",
  evenementen: "/events",
  profiel: "/profiel",
  dashboard: "/dashboard",
  account: "/auth",
  inloggen: "/auth",
};

export function resolveInternalUrl(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [keyword, url] of Object.entries(INTERNAL_URLS)) {
    if (lower.includes(keyword)) return url;
  }
  return null;
}

// ── Classify Answer Type ─────────────────────────────────────────

const GREETING_RE = /^(hoi|hey|hallo|hi|goedemorgen|goedemiddag|goedenavond|welkom|dag)\b/i;
const FACT_RE = /\b(salaris|verdien|loon|kosten|collegegeld|duur|hoe lang|jaar)\b/i;
const NAV_RE = /\b(waar vind|pagina|bekijk|link|website|url)\b/i;

export function classifyAnswerType(userMessage: string, hasSlotGaps: boolean): AnswerType {
  const trimmed = userMessage.trim();
  if (trimmed.length < 15 && GREETING_RE.test(trimmed)) return "begroeting";
  if (hasSlotGaps && trimmed.length < 40) return "intake";
  if (NAV_RE.test(trimmed)) return "wegwijs";
  if (FACT_RE.test(trimmed)) return "reproductie";
  return "verkenning";
}

// ── Needs Clarification ──────────────────────────────────────────

interface ClarificationSignals {
  userMessage: string;
  missingSlots: string[];
  mode: ResponseMode;
  turnCount: number;
}

export function needsClarification(signals: ClarificationSignals): boolean {
  // Don't trigger intake on first message or in public mode frequently
  if (signals.turnCount < 2) return false;
  // Broad question with many missing slots
  if (signals.missingSlots.length >= 3 && signals.userMessage.length < 50) return true;
  // Authenticated mode with key slots missing
  if (signals.mode === "authenticated" && signals.missingSlots.length >= 2) return true;
  return false;
}

// ── Build Intake Questions ───────────────────────────────────────

export function buildIntakeQuestions(missingSlots: string[]): IntakeQuestion[] {
  const questions: IntakeQuestion[] = [];

  if (missingSlots.includes("school_type")) {
    questions.push({
      id: "school_type",
      label: "Naar welke sector gaat je interesse uit?",
      options: ["Basisonderwijs (PO)", "Voortgezet onderwijs (VO)", "MBO"],
      allowOpen: true,
    });
  }

  if (missingSlots.includes("role_interest")) {
    questions.push({
      id: "role_interest",
      label: "Wat voor rol spreekt je aan?",
      options: ["Lesgeven", "Begeleiden", "Vakexpertise / instructeur"],
      allowOpen: true,
    });
  }

  if (missingSlots.includes("admission_requirements")) {
    questions.push({
      id: "admission_requirements",
      label: "Wat is je hoogste opleiding?",
      options: ["MBO", "HBO", "WO"],
      allowOpen: true,
    });
  }

  return questions.slice(0, 3);
}

// ── Reflect on Draft ─────────────────────────────────────────────

const FORBIDDEN_PHRASES = [
  "peildatum",
  "kennisbank",
  "als ai",
  "goed dat je dit vraagt",
  "ik begrijp je helemaal",
  "je moet",
  "scenario",
  "achtergrondinformatie",
  "dynamische context",
];

export interface ReflectionResult {
  pass: boolean;
  issues: string[];
}

export function reflectOnDraft(text: string, answerType: AnswerType): ReflectionResult {
  const issues: string[] = [];
  const lower = text.toLowerCase();
  const rules = ANSWER_TYPE_RULES[answerType];

  // Check forbidden phrases
  for (const phrase of FORBIDDEN_PHRASES) {
    if (lower.includes(phrase)) {
      issues.push(`Bevat verboden term: "${phrase}"`);
    }
  }

  // Check word count
  const wordCount = text.split(/\s+/).length;
  if (wordCount > rules.maxWords * 1.5) {
    issues.push(`Te lang: ${wordCount} woorden (max ~${rules.maxWords})`);
  }

  // Check em/en dashes
  if (/[\u2014\u2013]/.test(text)) {
    issues.push("Bevat em-dash of en-dash");
  }

  // Check link count
  const linkCount = (text.match(/\[.*?\]\(.*?\)/g) || []).length;
  if (linkCount > rules.maxLinks) {
    issues.push(`Te veel links: ${linkCount} (max ${rules.maxLinks})`);
  }

  // Check question count (max 1)
  const questions = text.split(/[.!]\s/).filter(s => s.trim().endsWith("?"));
  if (questions.length > 1) {
    issues.push(`Meer dan 1 vervolgvraag (${questions.length})`);
  }

  return { pass: issues.length === 0, issues };
}

// ── Parse Structured Meta from SSE ───────────────────────────────

export function parseStructuredMeta(data: Record<string, unknown>): StructuredResponse | null {
  const meta = (data.meta ?? data) as Record<string, unknown>;
  if (!meta || typeof meta !== "object") return null;

  const result: StructuredResponse = {};
  if (typeof meta.direct_answer === "string") result.directAnswer = meta.direct_answer;
  if (typeof meta.supporting_detail === "string") result.supportingDetail = meta.supporting_detail;
  if (Array.isArray(meta.verified_links)) {
    result.verifiedLinks = meta.verified_links
      .filter((l: unknown): l is Record<string, string> => typeof l === "object" && l !== null && "href" in l)
      .map((l) => ({
        label: l.label || "Meer info",
        href: l.href,
        external: !l.href.startsWith("/"),
      }));
  }

  if (!result.directAnswer && !result.supportingDetail && !result.verifiedLinks) return null;
  return result;
}
