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

  if (
    ["orienteren", "beslissen", "matchen", "voorbereiden"].includes(phase) &&
    !extracted.school_type
  ) {
    return { slot: "school_type", question: "In welke sector wil je je oriënteren: PO, VO of MBO?" };
  }

  switch (phase) {
    case "interesseren":
      return { slot: "role_interest", question: "Wat trekt je het meest aan?" };
    case "orienteren":
      return { slot: "credential_goal", question: "Wil je weten welke route bij je past, of welke diploma's je nodig hebt?" };
    case "beslissen":
      return { slot: "next_step", question: "Wat zou jou helpen om een keuze te maken?" };
    case "matchen":
      return { slot: "region_preference", question: "In welke regio wil je zoeken?" };
    case "voorbereiden":
      return { slot: "next_step", question: "Wat is voor jou de prettigste volgende stap?" };
    default:
      return { slot: "role_interest", question: "Wat trekt je het meest aan?" };
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
      { label: "PO (basisonderwijs)", value: "Basisonderwijs lijkt me wat" },
      { label: "VO (voortgezet)", value: "Voortgezet onderwijs, denk ik" },
      { label: "MBO (beroepsonderwijs)", value: "MBO spreekt me aan" },
    ];
  }

  switch (phase) {
    case "interesseren":
      return [
        { label: "Lesgeven", value: "Lesgeven trekt me" },
        { label: "Begeleiding", value: "Leerlingen begeleiden lijkt me wat" },
        { label: "Vakexpertise", value: "Mijn vak inzetten in het onderwijs" },
      ];
    case "beslissen":
      return [
        { label: "Kosten bekijken", value: "Wat kost het eigenlijk" },
        { label: "Vacatures", value: "Laat me vacatures zien" },
        { label: "Gesprek plannen", value: "Kan ik ergens terecht voor een gesprek" },
      ];
    case "matchen":
      return [
        { label: "Scholen zoeken", value: "Welke scholen zitten in mijn buurt" },
        { label: "Vacatures", value: "Laat me vacatures zien" },
      ];
    case "voorbereiden":
      return [
        { label: "Checklist bekijken", value: "Wat moet ik nog regelen" },
        { label: "Gesprek plannen", value: "Kan ik ergens terecht voor een gesprek" },
      ];
    default:
      return [
        { label: "Routes bekijken", value: "Hoe word je eigenlijk leraar" },
        { label: "Opleidingen", value: "Welke opleidingen zijn er" },
      ];
  }
}

// ── System prompt (NO actions instructions — actions are server-side) ──
const DOORAI_SYSTEM_PROMPT = `Je bent DOORai (Doortje), de persoonlijke oriëntatie-assistent van Onderwijsloket Rotterdam.

## STRIKTE LENGTE-LIMIET (HARD, GEEN UITZONDERINGEN)

Je volledige antwoord is MAXIMAAL 4 zinnen. Tel ze. Meer = FOUT.
- Zin 1: empathie of normaliseren (max 10 woorden)
- Zin 2-3: feitelijke info (objectief, geen uitweidingen)
- Zin 4: exact 1 korte vervolgvraag

## VERBODEN
- Opsommingen, lijstjes, bullet points
- "Of... of... of..." constructies in je tekst (keuze-opties worden apart aangeboden als knoppen)
- Herhalen wat de gebruiker al zei
- Sector of route uitleggen tenzij expliciet gevraagd
- Garanties of toezeggingen — spreek in kansen en voorwaarden
- Samenvattingen van wat je net hebt gezegd
- Meer dan 4 zinnen

## VERPLICHT
- ${PHASE_RULES.policy.goal}
- ${PHASE_RULES.policy.ask_one_question}
- Eindig ALTIJD met precies 1 vervolgvraag
- Informeel (je/jij), begripvol, kansgericht

## VOORBEELDEN (exacte lengte en stijl):

User: "Ik twijfel of zij-instroom wel haalbaar is"
Doortje: "Die twijfel hoor ik vaker, heel normaal. Zij-instroom is juist ontworpen om naast werk te doen, in 2 jaar. Waar twijfel je het meest over?"

User: "Wat verdien ik als leraar?"
Doortje: "Goed dat je daar naar kijkt! Leraren verdienen tussen €2.900 en €5.800 bruto, afhankelijk van sector en ervaring. In welke sector denk je aan lesgeven?"

User: "Ik wil voor de klas in het voortgezet onderwijs"
Doortje: "Mooi, VO is een mooie keuze! Er zijn meerdere routes, afhankelijk van je achtergrond. Heb je al een hbo- of wo-diploma?"

## Fases
${PHASE_RULES.phases.map((p, i) => `${i + 1}. **${p.title}** (${p.intent}) — ${p.description}`).join("\n")}

## Sectoren
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

## Links (deel alleen als direct relevant)
- Opleidingen: /opleidingen
- Kennisbank: /kennisbank
- Vacatures: /vacatures
- Events: /events`;

// ── Auth system prompt (higher level, only for ingelogde chat) ─────────
const DOORAI_SYSTEM_PROMPT_AUTH = `Je bent Doortje, de nuchtere en warme gids van DOOR.

Schrijfstijl
- Direct, menselijk, zonder verkooppraat.
- Geen automatische bevestigingen (zoals "goed dat je dit vraagt") en geen standaard samenvattingen.
- Geen vragen stellen in je antwoord. Gebruik geen vraagteken.
- Maximaal 110 woorden. Korte alinea's. Geen lange uitleg.
- Geen emdash (— of –). Gebruik punt of een gewone streep (-).

Inhoud
- Geef objectieve info. Maak het concreet met 2 routes of 2 scenario's als dat helpt.
- Als details afhangen van sector, regio of school: zeg dat erbij.
- Als het maatwerk wordt: benoem dat een gesprek met het loket handig is.

Je sluit NIET af met een vraag. Wij voegen exact 1 SSOT vervolgvraag toe.`;

// ── Types ──────────────────────────────────────────────────────────────
interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

type SlotKey =
  | "school_type"
  | "role_interest"
  | "credential_goal"
  | "admission_requirements"
  | "duration_info"
  | "costs_info"
  | "salary_info"
  | "region_preference"
  | "next_step";

interface DetectorPayload {
  audience: string;
  phase_current: string;
  phase_current_ui: string;
  phase_confidence: number;
  evidence: string[];
  known_slots: Partial<Record<SlotKey, string>>;
  missing_slots: SlotKey[];
  next_slot_key: SlotKey;
  next_question_id: string;
  next_question: string;
  next_phase_target?: string;
}

interface RequestBody {
  messages: ChatMessage[];
  mode?: "public" | "authenticated";
  userPhase?: string;
  userSector?: string;
  detector?: DetectorPayload;
}

// ── Actions based on next slot (for authenticated flow) ────────────────
function actionsForNextSlot(
  slot: SlotKey,
): Array<{ label: string; value: string }> {
  if (slot === "school_type") {
    return [
      { label: "PO (basisonderwijs)", value: "Basisonderwijs lijkt me wat" },
      { label: "VO (voortgezet)", value: "Voortgezet onderwijs, denk ik" },
      { label: "MBO (beroepsonderwijs)", value: "MBO spreekt me aan" },
    ];
  }
  if (slot === "role_interest") {
    return [
      { label: "Lesgeven", value: "Lesgeven trekt me" },
      { label: "Begeleiden", value: "Leerlingen begeleiden, dat lijkt me wat" },
      { label: "Vakexpertise", value: "Mijn vak inzetten in het onderwijs" },
    ];
  }
  if (slot === "credential_goal") {
    return [
      { label: "Route naar bevoegdheid", value: "Hoe krijg ik een bevoegdheid" },
      { label: "Eerst verkennen", value: "Ik wil eerst verkennen" },
    ];
  }
  if (slot === "admission_requirements") {
    return [
      { label: "MBO", value: "Mijn achtergrond is mbo" },
      { label: "HBO", value: "Mijn achtergrond is hbo" },
      { label: "WO", value: "Mijn achtergrond is wo" },
      { label: "Anders", value: "Mijn achtergrond is anders" },
    ];
  }
  if (slot === "region_preference") {
    return [
      { label: "Regio Rotterdam", value: "Rotterdam en omgeving" },
      { label: "Andere regio", value: "Ergens anders in Nederland" },
    ];
  }
  if (slot === "next_step") {
    return [
      { label: "Vacatures", value: "Laat me vacatures zien" },
      { label: "Gesprek plannen", value: "Kan ik ergens terecht voor een gesprek" },
      { label: "Events", value: "Zijn er events binnenkort" },
    ];
  }
  return [];
}

// ── Stream filter: replace emdash/en-dash in SSE chunks ─────────────────
function streamReplaceDashes(input: ReadableStream<Uint8Array>) {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    start(controller) {
      const reader = input.getReader();

      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunkText = decoder.decode(value, { stream: true });
            const replaced = chunkText.replace(/[—–]/g, "-");
            controller.enqueue(encoder.encode(replaced));
          }

          const tail = decoder.decode();
          if (tail) controller.enqueue(encoder.encode(tail.replace(/[—–]/g, "-")));
          controller.close();
        } catch (e) {
          console.error("Stream transform error:", e);
          controller.close();
        }
      };

      pump();
    },
  });
}

// ── Handler ────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, mode = "public", userPhase, userSector, detector }: RequestBody = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
    const extracted = extractSlots(lastUserMsg);

    // Public / legacy next question + actions (blijft zoals het nu is)
    const legacyNextQ = chooseNextQuestion(userPhase, extracted);
    const legacyActions = chooseActions(userPhase, extracted);

    // Auth SSOT next question + actions
    const authNextQ = detector?.next_question && detector?.next_slot_key
      ? { slot: detector.next_slot_key, question: detector.next_question }
      : legacyNextQ;

    const authActions = detector?.next_slot_key
      ? actionsForNextSlot(detector.next_slot_key)
      : legacyActions;

    // System prompt
    let systemPrompt = mode === "authenticated" ? DOORAI_SYSTEM_PROMPT_AUTH : DOORAI_SYSTEM_PROMPT;

    if (mode === "authenticated") {
      const knownSlotsInfo = detector?.known_slots
        ? Object.entries(detector.known_slots).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(", ")
        : "";
      systemPrompt += `\n\nContext\n- Ingelogd: ja\n- Fase: ${detector?.phase_current_ui || userPhase || "interesseren"}\n- Confidence: ${detector?.phase_confidence ?? "n.v.t."}\n${knownSlotsInfo ? `- Bekende info: ${knownSlotsInfo}\n` : ""}`;
      if (userSector) systemPrompt += `- Voorkeursector: ${userSector}\n`;
      if (detector?.evidence?.length) systemPrompt += `- Evidence: ${detector.evidence.slice(0, 3).join(" | ")}\n`;
    } else {
      // Public context blijft kort
      systemPrompt += `\n\n## Huidige context\n- Ingelogd: Nee\n`;
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

    const aiBody = response.body!;
    const filtered = streamReplaceDashes(aiBody);

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    (async () => {
      try {
        const reader = filtered.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          await writer.write(value);
        }

        // Auth: append exact 1 SSOT question, so the model never paraphrases it
        if (mode === "authenticated") {
          const qChunk = {
            choices: [{ delta: { content: `\n\n${authNextQ.question}` } }],
          };
          await writer.write(encoder.encode(`data: ${JSON.stringify(qChunk)}\n\n`));
        }

        // Always append server-side actions event
        const actions = mode === "authenticated" ? authActions : legacyActions;
        await writer.write(encoder.encode(`data: ${JSON.stringify({ actions })}\n\n`));
      } catch (e) {
        console.error("Stream error:", e);
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, {
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
