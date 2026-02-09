const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Phase & slot definitions (Single Source of Truth) ──────────────────
const PHASE_RULES = {
  phases: [
    { code: "interesseren", title: "Interesseren", description: "Kennismaking met onderwijs als potentiële arbeidsmarkt.", intent: "verhelderen", tone: "Logisch dat je benieuwd bent!" },
    { code: "orienteren", title: "Oriënteren", description: "Overweging of functie in onderwijs passend is.", intent: "geruststellen", tone: "Die twijfel hoor ik vaker, heel normaal." },
    { code: "beslissen", title: "Beslissen", description: "Beslismoment: de stap wél of niet maken.", intent: "structureren", tone: "Laten we het overzichtelijk maken." },
    { code: "matchen", title: "Matchen", description: "Geschikte werk- en/of opleidingsplek vinden.", intent: "activeren", tone: "Goed dat je concrete stappen wilt zetten!" },
    { code: "voorbereiden", title: "Voorbereiden", description: "Voorbereiding vóór eerste werk- of opleidingsdag.", intent: "borgen", tone: "Je bent er bijna, even de puntjes op de i." },
  ],
  slots: ["school_type", "role_interest", "credential_goal", "admission_requirements", "duration_info", "costs_info", "salary_info", "region_preference", "next_step"],
  policy: {
    goal: "Praktische, objectieve info; geen druk/garanties/commerciële bias.",
    ask_one_question: "Stel maximaal 1 vervolgvraag per beurt, gericht op grootste progressie.",
  },
};

// ── Slot extraction (deterministic, server-side) ───────────────────────
function extractSlots(text: string): Record<string, string | null> {
  const t = text.toLowerCase();
  const slots: Record<string, string | null> = {};

  if (/\bpo\b|basisonderwijs|primair|basisschool/.test(t)) slots.school_type = "PO";
  else if (/\bvo\b|voortgezet|middelbare/.test(t)) slots.school_type = "VO";
  else if (/\bmbo\b|beroepsonderwijs/.test(t)) slots.school_type = "MBO";
  else slots.school_type = null;

  return slots;
}

// ── Deterministic next-question logic ──────────────────────────────────
function chooseNextQuestion(
  userPhase: string | undefined,
  extracted: Record<string, string | null>,
): { slot: string; question: string } {
  const phase = (userPhase || "interesseren").toLowerCase();

  // In orientatie+ and school_type unknown → always ask sector
  if (
    ["orienteren", "beslissen", "matchen", "voorbereiden"].includes(phase) &&
    !extracted.school_type
  ) {
    return { slot: "school_type", question: "In welke sector wil je je oriënteren: PO, VO of MBO?" };
  }

  switch (phase) {
    case "interesseren":
      return { slot: "role_interest", question: "Wat trekt je het meest aan: lesgeven, begeleiding, of vakexpertise?" };
    case "orienteren":
      return { slot: "credential_goal", question: "Wil je vooral weten welke route bij je past, of eerst welke diploma's je nodig hebt?" };
    case "beslissen":
      return { slot: "next_step", question: "Wat zou jou helpen om een keuze te maken: kosten, duur, salaris of een gesprek?" };
    case "matchen":
      return { slot: "region_preference", question: "In welke regio of wijk wil je vooral zoeken naar scholen?" };
    case "voorbereiden":
      return { slot: "next_step", question: "Wat is voor jou de prettigste volgende stap: info lezen, vacatures bekijken of een gesprek plannen?" };
    default:
      return { slot: "role_interest", question: "Wat trekt je het meest aan: lesgeven, begeleiding, of vakexpertise?" };
  }
}

// ── Actions based on phase + slots ─────────────────────────────────────
function chooseActions(
  userPhase: string | undefined,
  extracted: Record<string, string | null>,
): Array<{ label: string; value: string }> {
  const phase = (userPhase || "interesseren").toLowerCase();

  if (!extracted.school_type && phase !== "interesseren") {
    return [
      { label: "PO (basisonderwijs)", value: "Ik wil me oriënteren op PO" },
      { label: "VO (voortgezet)", value: "Ik wil me oriënteren op VO" },
      { label: "MBO (beroepsonderwijs)", value: "Ik wil me oriënteren op MBO" },
    ];
  }

  switch (phase) {
    case "interesseren":
      return [
        { label: "Lesgeven", value: "Ik ben geïnteresseerd in lesgeven" },
        { label: "Begeleiding", value: "Ik ben geïnteresseerd in begeleiding" },
        { label: "Vakexpertise", value: "Ik ben geïnteresseerd in vakexpertise" },
      ];
    case "beslissen":
      return [
        { label: "Kosten bekijken", value: "Ik wil meer weten over de kosten" },
        { label: "Vacatures", value: "Ik wil vacatures bekijken" },
        { label: "Gesprek plannen", value: "Ik wil een gesprek plannen" },
      ];
    case "matchen":
      return [
        { label: "Scholen zoeken", value: "Ik wil scholen zoeken in mijn regio" },
        { label: "Vacatures", value: "Ik wil vacatures bekijken" },
      ];
    case "voorbereiden":
      return [
        { label: "Checklist bekijken", value: "Wat moet ik nog regelen?" },
        { label: "Gesprek plannen", value: "Ik wil een gesprek plannen" },
      ];
    default:
      return [
        { label: "Routes bekijken", value: "Welke routes zijn er naar het leraarschap?" },
        { label: "Opleidingen", value: "Welke opleidingen zijn er?" },
      ];
  }
}

// ── System prompt ──────────────────────────────────────────────────────
const DOORAI_SYSTEM_PROMPT = `Je bent DOORai (Doortje), de persoonlijke oriëntatie-assistent van Onderwijsloket Rotterdam.

## STRIKTE GEDRAGSREGELS

### Policy:
- "${PHASE_RULES.policy.goal}"
- "${PHASE_RULES.policy.ask_one_question}"

### Coach Output Format (ALTIJD VOLGEN):
1. **Begin met 1 zin**: empathie/normaliseren (zachte laag)
2. **Geef max 2 zinnen**: feitelijke info of duiding (objectief, kort)
3. **Eindig met exact 1 gerichte vervolgvraag** (progressie)
4. **Links alleen als relevant** en alleen uit whitelist
5. **Als je moet kiezen**: vraag door > link dumpen

### Verdere regels:
- Geen garanties of toezeggingen — spreek in kansen en voorwaarden
- Sluit niemand uit voor het onderwijs
- Herken twijfel/overweldiging → normaliseer in 1 zin
- Geen voor- en nadelen lijstjes — vergelijk opties neutraal naast elkaar

### Toon (Doortje-persona):
- Begripvol en adviserend
- Informeel (je/jij)
- Kansgericht, niet druk uitoefenend

### Actions-instructie:
Na elk antwoord, voeg op een NIEUWE REGEL een HTML-comment toe met actieknoppen in dit exacte formaat:
<!--ACTIONS:[{"label":"...", "value":"..."},...]-->
De actions moeten passen bij de context van je antwoord. Gebruik maximaal 3 knoppen.

## Fases van oriëntatie
${PHASE_RULES.phases.map((p, i) => `${i + 1}. **${p.title}** (${p.intent}) — ${p.description}`).join("\n")}

## Sectoren (kort benoemen, doorvragen naar voorkeur)
- **PO** — Basisschool (4-12 jaar)
- **VO** — Middelbare school (12-18 jaar)
- **MBO** — Beroepsonderwijs (16+ jaar)

## Routes (alleen benoemen als relevant)
- Pabo (4 jr) of Zij-instroom PO (2 jr) → voor PO
- Tweedegraads (4 jr) of Zij-instroom VO (2 jr) → voor VO onderbouw
- Eerstegraads (2 jr na tweedegraads) → voor VO bovenbouw/havo/vwo
- PDG (1-2 jr) → voor MBO

## Salaris (globale indicatie)
- Starters: €2.900 - €3.500 bruto
- Ervaren: tot €5.800 bruto
- Zeg altijd: "Afhankelijk van sector en ervaring"

## VOORBEELDEN goede antwoorden:

User: "Ik twijfel of zij-instroom wel haalbaar is"
→ "Die twijfel hoor ik vaker, heel normaal 🙂 Zij-instroom is juist ontworpen om naast werk te doen, in 2 jaar. Waar twijfel je het meest over: de studielast of de toelatingseisen?"
<!--ACTIONS:[{"label":"Studielast","value":"Ik twijfel over de studielast"},{"label":"Toelatingseisen","value":"Ik wil meer weten over toelatingseisen"},{"label":"Combineren met werk","value":"Kan ik dit combineren met mijn baan?"}]-->

User: "Wat verdien ik als leraar?"
→ "Goed dat je daar naar kijkt! Leraren verdienen tussen €2.900 - €5.800 bruto, afhankelijk van sector en ervaring. In welke sector denk je aan lesgeven?"
<!--ACTIONS:[{"label":"PO","value":"Ik denk aan basisonderwijs"},{"label":"VO","value":"Ik denk aan voortgezet onderwijs"},{"label":"MBO","value":"Ik denk aan MBO"}]-->

## Links (deel alleen als direct relevant)
- Opleidingen: /opleidingen
- Kennisbank: /kennisbank
- Vacatures: /vacatures
- Events: /events`;

// ── Types ──────────────────────────────────────────────────────────────
interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface RequestBody {
  messages: ChatMessage[];
  mode?: "public" | "authenticated";
  userPhase?: string;
  userSector?: string;
}

// ── Handler ────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, mode = "public", userPhase, userSector }: RequestBody = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Extract slots from last user message
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
    const extracted = extractSlots(lastUserMsg);

    // Choose deterministic next question
    const nextQ = chooseNextQuestion(userPhase, extracted);

    // Choose actions for this context
    const actions = chooseActions(userPhase, extracted);

    // Build context-aware system prompt
    let systemPrompt = DOORAI_SYSTEM_PROMPT;

    if (mode === "authenticated" && userPhase) {
      const currentPhaseInfo = PHASE_RULES.phases.find(
        (p) => p.code === userPhase || p.title.toLowerCase() === userPhase.toLowerCase(),
      );

      systemPrompt += `\n\n## Huidige gebruiker context
- Ingelogd: Ja
- Huidige fase: ${currentPhaseInfo?.title || userPhase}
- Fase-beschrijving: ${currentPhaseInfo?.description || "Onbekend"}
- Begeleidingsintentie: ${currentPhaseInfo?.intent || "verhelderen"} — ${currentPhaseInfo?.tone || ""}
${userSector ? `- Voorkeursector: ${userSector}` : "- Sector: nog niet gekozen"}

## Detector output (server-side, leidend)
- Extracted school_type: ${extracted.school_type ?? "onbekend"}
- Next question (must ask): ${nextQ.question}
- Suggested actions: ${JSON.stringify(actions)}

Gebruik de begeleidingsintentie "${currentPhaseInfo?.intent || "verhelderen"}" in je toon.
Je MOET eindigen met deze vervolgvraag: "${nextQ.question}" (of een natuurlijke variant ervan).
Gebruik de suggested actions voor je <!--ACTIONS:...--> comment.`;
    } else {
      systemPrompt += `\n\n## Huidige context
- Ingelogd: Nee

## Detector output (server-side, leidend)
- Extracted school_type: ${extracted.school_type ?? "onbekend"}
- Suggested actions: ${JSON.stringify(actions)}

Help de bezoeker wegwijs en moedig aan om een account te maken voor persoonlijke begeleiding.`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Te veel verzoeken, probeer het later opnieuw." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI-credits zijn op, neem contact op met de beheerder." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Er ging iets mis met de AI, probeer het opnieuw." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("DOORai chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Onbekende fout" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
