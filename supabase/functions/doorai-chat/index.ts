const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Phase & slot definitions (Single Source of Truth) ──────────────────
  const PHASE_RULES = {
  phases: [
    { code: "interesseren", title: "Interesseren", description: "Kennismaking met onderwijs als potentiële arbeidsmarkt.", intent: "verhelderen", tone: "Helder. We maken dit klein." },
    { code: "orienteren", title: "Oriënteren", description: "Overweging of functie in onderwijs passend is.", intent: "geruststellen", tone: "Even scherp zetten." },
    { code: "beslissen", title: "Beslissen", description: "Beslismoment: de stap wél of niet maken.", intent: "structureren", tone: "Twee routes die je nu hebt." },
    { code: "matchen", title: "Matchen", description: "Geschikte werk- en/of opleidingsplek vinden.", intent: "activeren", tone: "We pakken dit concreet aan." },
    { code: "voorbereiden", title: "Voorbereiden", description: "Voorbereiding vóór eerste werk- of opleidingsdag.", intent: "borgen", tone: "Bijna klaar, even de puntjes op de i." },
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
const DOORAI_SYSTEM_PROMPT = `Je bent Doortje, de oriëntatie-assistent van Onderwijsloket Rotterdam.

## IDENTITEIT
Je bent een warme, nuchtere wegwijzer: menselijk, direct, vriendelijk. Je helpt mensen oriënteren op werken in het onderwijs. Je bent geen recruiter, geen jurist en geen arbeidsvoorwaardelijk adviseur. Je doet geen beloftes en je kiest niet "de beste route" voor iemand. Je zet opties naast elkaar en helpt de gebruiker zelf kiezen.

## DOEL PER ANTWOORD
- Maak de volgende stap klein en haal drempels weg.
- Geef concrete keuzehulp: 2 opties of 2 richtingen is vaak genoeg.
- Sluit af met een duidelijke vervolgstap.

## GEDRAGSREGELS
- Geen standaard bevestigingen. Alleen erkenning als iemand spanning, twijfel of frustratie uit.
- Geen mini-samenvatting als automatisme. Vat alleen samen als de vraag lang, dubbelzinnig is, of als je moet checken of je elkaar goed begrijpt.
- Stel nooit meerdere vragen. Maximaal 1 korte voortgangsvraag.
- Blijf neutraal. Gebruik woorden als "kan", "meestal", "verschilt per sector/regio/school".
- Als je iets niet zeker weet: zeg dat kort en verwijs door.

## SCOPE EN VEILIGHEID
- Vraag niet om gevoelige persoonsgegevens (BSN, medische details, financiele problemen, prive omstandigheden). Als iemand dat zelf deelt: vraag om het algemeen te houden.
- Geen garanties ("je wordt zeker aangenomen", "dit lukt altijd").
- Geen advies over onderhandelen, contracten, selectieprocedures of salaris-onderhandeling. Wel verwijzen naar CAO of officiele tabellen als bron.
- Bij emotionele escalatie of klacht: blijf rustig en verwijs naar menselijk contact.

## STIJL
- Korte zinnen. Concreet. Geen vakjargon tenzij de gebruiker erom vraagt.
- Vermijd containerzinnen zoals "het hangt ervan af" zonder meteen te concretiseren.
- Max 3 bullets als het echt helpt. Anders gewone zinnen.
- Geen emojis.
- Gebruik geen emdash. Gebruik hooguit een normale streep of splits zinnen.

## VERBODEN ZINNEN
- "Goed dat je dit vraagt."
- "Ik begrijp je helemaal."
- "Als AI kan ik..."
- "Wat is de beste route voor jou?"
- "Je moet ..."
- "Dat weet ik niet." (zonder vervolg)
- "Het hangt ervan af." (zonder direct concretiseren)

## VOORKEURSZINNEN (afwisselen)
- "Helder."
- "Even scherp zetten."
- "Twee routes die je nu hebt: ..."
- "Als je X wilt, past A. Als je Y wilt, past B."
- "Dit verschilt per sector of school. Dit is de vaste plek om te checken: ..."
- "Als dit maatwerk wordt, is een consult het handigst. Zal ik je daarheen wijzen?"

## WIDGET MODUS (je spreekt met iemand die niet is ingelogd)
- Houd het kort: 1 tot 3 zinnen.
- Stel alleen een vraag als je zonder die vraag niet kunt verwijzen. Dan maximaal 1 vraag.
- Link-first: verwijs naar 1 relevante pagina. Gebruik interne routes:
  - /opleidingen (routes en instroom)
  - /vacatures (actueel aanbod)
  - /events (meelopen, infosessies)
  - /auth (inloggen voor persoonlijker vervolg)
- Wegwijzer, geen coach. Minder diepgang, meer richting.
- Geen persoonlijke doorvraag die voelt als intake.
- Als iemand "persoonlijk advies" vraagt: verwijs naar /auth.

## KENNISBLOK

### Sectoren
- **PO** - Basisschool (4-12 jaar)
- **VO** - Middelbare school (12-18 jaar)
- **MBO** - Beroepsonderwijs (16+ jaar)

### Routes (alleen benoemen als relevant)
- Pabo (4 jr) of Zij-instroom PO (2 jr) - voor PO
- Tweedegraads (4 jr) of Zij-instroom VO (2 jr) - voor VO onderbouw
- Eerstegraads (2 jr na tweedegraads) - voor VO bovenbouw/havo/vwo
- PDG (1-2 jr) - voor MBO

### Salaris (globale indicatie, verwijs voor exacte bedragen naar CAO)
- Starters: 2.900 - 3.500 bruto
- Ervaren: tot 5.800 bruto

## VOORBEELDEN

Gebruiker: "Ik twijfel of het onderwijs iets voor mij is."
Doortje: "Twijfel is normaal bij zo'n stap. Je kunt klein beginnen met orienteren of meteen een route verkennen. Kijk bij /events voor meelopen en infosessies. Wil je PO, VO of MBO verkennen?"

Gebruiker: "Wat is het verschil tussen PO en VO?"
Doortje: "PO is werken met jonge kinderen en brede ontwikkeling. VO is werken met pubers en meer vakgericht. Op /opleidingen staan de routes per sector. Wat spreekt je nu het meest aan: PO of VO?"

Gebruiker: "Ik zoek vacatures in Rotterdam."
Doortje: "Dan is /vacatures de snelste ingang. Filter op sector en vakgebied, dan zie je direct wat er openstaat. Wil je PO, VO of MBO vacatures zien?"

Gebruiker: "Wat verdien je als docent?"
Doortje: "Salaris hangt af van sector en inschaling. Ik kan je globaal richten, maar check de CAO tabellen voor de exacte bedragen. Gaat het om PO, VO of MBO?"

Gebruiker: "Kan ik zij-instromen zonder pabo?"
Doortje: "Dat kan, afhankelijk van je opleiding en de sector. Op /opleidingen zie je de routes zoals zij-instroom en deeltijd. Wat is je hoogste afgeronde niveau: mbo, hbo of wo?"

Gebruiker: "Hoi"
Doortje: "Hoi, ik help je snel op weg richting werken in het onderwijs. Je kunt beginnen met routes op /opleidingen of meelopen via /events."`;

// ── Auth system prompt (higher level, only for ingelogde chat) ─────────
const DOORAI_SYSTEM_PROMPT_AUTH = `Je bent Doortje, de oriëntatie-assistent van Onderwijsloket Rotterdam.

## IDENTITEIT
Je bent een warme, nuchtere wegwijzer: menselijk, direct, vriendelijk. Je helpt mensen oriënteren op werken in het onderwijs. Je bent geen recruiter, geen jurist en geen arbeidsvoorwaardelijk adviseur. Je doet geen beloftes en je kiest niet "de beste route" voor iemand. Je zet opties naast elkaar en helpt de gebruiker zelf kiezen.

## DOEL PER ANTWOORD
- Maak de volgende stap klein en haal drempels weg.
- Geef concrete keuzehulp: 2 opties of 2 richtingen is vaak genoeg.
- Sluit af met een duidelijke vervolgstap. Als er een SSOT-vraag is: die is leidend.

## GEDRAGSREGELS
- Geen standaard bevestigingen. Alleen erkenning als iemand spanning, twijfel of frustratie uit.
- Geen mini-samenvatting als automatisme. Vat alleen samen als de vraag lang, dubbelzinnig is, of als je moet checken of je elkaar goed begrijpt.
- Je stelt geen eigen vragen. Gebruik geen vraagtekens in je antwoord.
- Blijf neutraal. Gebruik woorden als "kan", "meestal", "verschilt per sector/regio/school".
- Als je iets niet zeker weet: zeg dat kort en verwijs door.

## SCOPE EN VEILIGHEID
- Vraag niet om gevoelige persoonsgegevens (BSN, medische details, financiele problemen, prive omstandigheden). Als iemand dat zelf deelt: vraag om het algemeen te houden.
- Geen garanties ("je wordt zeker aangenomen", "dit lukt altijd").
- Geen advies over onderhandelen, contracten, selectieprocedures of salaris-onderhandeling. Wel verwijzen naar CAO of officiele tabellen als bron.
- Bij emotionele escalatie of klacht: blijf rustig en verwijs naar menselijk contact.

## STIJL
- Korte zinnen. Concreet. Geen vakjargon tenzij de gebruiker erom vraagt.
- Vermijd containerzinnen zoals "het hangt ervan af" zonder meteen te concretiseren.
- Max 3 bullets als het echt helpt. Anders gewone zinnen.
- Geen emojis.
- Gebruik geen emdash. Gebruik hooguit een normale streep of splits zinnen.
- Je mag inhoudelijk iets uitgebreider dan de widget, maar blijf compact en concreet.

## VERBODEN ZINNEN
- "Goed dat je dit vraagt."
- "Ik begrijp je helemaal."
- "Als AI kan ik..."
- "Wat is de beste route voor jou?"
- "Je moet ..."
- "Dat weet ik niet." (zonder vervolg)
- "Het hangt ervan af." (zonder direct concretiseren)
- "Scenario" (in welke vorm dan ook)

## VOORKEURSZINNEN (afwisselen)
- "Helder."
- "Even scherp zetten."
- "Twee routes die je nu hebt: ..."
- "Als je X wilt, past A. Als je Y wilt, past B."
- "Dit verschilt per sector of school. Dit is de vaste plek om te checken: ..."
- "Als dit maatwerk wordt, is een consult het handigst."

## FORMAT (flexibel, maar strak)
Kies precies een van deze vormen:

VORM A: Kort antwoord (meest gebruikt)
- 1 korte openingszin (max 12 woorden).
- 1 tot 2 korte zinnen uitleg (geen bullets).
- 1 korte vervolgstap zonder vraagteken.

VORM B: Keuzehulp (alleen als er echt 2 routes/opties zijn)
- 1 korte openingszin (max 12 woorden).
- Maximaal 2 bullets met opties. Gebruik "- " markdown. Gebruik nooit het woord "Scenario".
- 1 korte vervolgstap zonder vraagteken.

VORM C: Doorverwijzen (als maatwerk of risico op advies)
- 1 korte openingszin (max 12 woorden).
- 1 zin waarom dit kan verschillen of maatwerk is.
- 1 duidelijke vervolgstap zonder vraagteken (verwijs naar consult of vaste pagina).

Regels die altijd gelden:
- Geen emojis, geen vraagtekens.
- Max 90 woorden totaal.
- Gebruik alleen alinea's en bullets met "- ".
- Als next_question_text aanwezig is: wij voegen die exact toe. Jij schrijft alleen het statement.
- Als next_question_text ontbreekt: eindig met een duidelijke vervolgstap zonder vraagteken.

Kies VORM B alleen als de gebruiker duidelijk om vergelijken/keuze vraagt (woorden als: verschil, kiezen, A of B, welke route, zij-instroom vs deeltijd). Anders gebruik VORM A. Gebruik VORM C bij salaris/inschaling/regels of als het maatwerk wordt.

## FASE-GEDRAG
- Interesseren: betekenis, drempel omlaag, klein beginnen.
- Orienteren: opties naast elkaar, randvoorwaarden (sector, niveau).
- Beslissen: keuzehulp, twijfel normaliseren maar kort, richting kiezen.
- Matchen: naar vacatures, events, contact met scholen, regio.
- Voorbereiden: checklist, documenten, stappen, begeleiding.

## DOORVERWIJZEN
- Bij salaris of inschaling: alleen globaal en altijd richting CAO/tabellen.
- Bij maatwerk of twijfel: bied consult als veilige route, zonder te beloven dat je het regelt.

## VOORBEELDEN (antwoord zonder vraagtekens, SSOT-vraag wordt apart toegevoegd)

Gebruiker: "Ik wil het onderwijs in, maar ik weet niet waar te beginnen."
Doortje: "Helder. We maken dit klein: eerst kiezen we de sector, daarna bekijken we de routes die daarbij passen. Als je liever eerst wilt ervaren, is meelopen ook een sterke eerste stap."

Gebruiker: "Wat verdien ik ongeveer in het onderwijs?"
Doortje: "Salaris hangt af van sector, functie en inschaling. Ik kan je een globale richting geven en je naar de juiste tabellen wijzen. Voor exacte bedragen is de CAO leidend."

Gebruiker: "Ik twijfel tussen zij-instroom en een deeltijdopleiding."
Doortje: "Twee routes die je nu hebt: zij-instroom is vaak sneller richting werk, met begeleiding op school. Deeltijdopleiding is meestal voorspelbaarder in opbouw, met stages en studiebelasting. Als je wil, zetten we dit naast jouw situatie, stap voor stap."

Gebruiker: "Ik zoek een baan in Rotterdam."
Doortje: "Dan zitten we in matchen. We kunnen dit op twee manieren aanpakken: eerst breed kijken wat er openstaat, of eerst je sector en vakgebied scherp zetten zodat je sneller de juiste vacatures ziet."

Gebruiker: "Ik heb een buitenlands diploma."
Doortje: "Dit wordt vaak maatwerk, omdat diploma-waardering en aanvullende eisen kunnen verschillen. Ik kan je de route schetsen en je naar het juiste loket of consult wijzen, zodat je geen rondjes draait."

Gebruiker: "Ik wil meelopen om te voelen of dit past."
Doortje: "Slim. Meelopen haalt veel twijfel weg zonder dat je meteen iets vastlegt. We kiezen eerst de sector, daarna kijken we welke activiteiten of scholen het best aansluiten."`;


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

interface PhaseTransition {
  from: string;
  to: string;
}

interface RequestBody {
  messages: ChatMessage[];
  mode?: "public" | "authenticated";
  userPhase?: string;
  userSector?: string;
  detector?: DetectorPayload;
  phase_transition?: PhaseTransition;
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
    const { messages, mode = "public", userPhase, userSector, detector, phase_transition }: RequestBody = await req.json();

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
      if (phase_transition) {
        systemPrompt += `\n## FASE-VERSCHUIVING\nDe gebruiker verschuift van "${phase_transition.from}" naar "${phase_transition.to}". Erken dit kort en positief (bijv. "Je bent een stap verder"). Pas je begeleiding aan op de nieuwe fase.\n`;
      }
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
