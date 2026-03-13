const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Answer type classification (server-side, not LLM) ──────────
type AnswerType = "reproductie" | "wegwijs" | "verkenning" | "begroeting";

const GREETING_RE = /^(hoi|hey|hallo|hi|goedemorgen|goedemiddag|goedenavond|welkom|dag)\b/i;
const FACT_RE = /\b(salaris|verdien|loon|kosten|collegegeld|duur|hoe lang|jaar)\b/i;
const NAV_RE = /\b(waar vind|pagina|bekijk|link|website|url)\b/i;

function classifyAnswerType(msg: string): AnswerType {
  const trimmed = msg.trim();
  if (trimmed.length < 15 && GREETING_RE.test(trimmed)) return "begroeting";
  if (NAV_RE.test(trimmed)) return "wegwijs";
  if (FACT_RE.test(trimmed)) return "reproductie";
  return "verkenning";
}

// ── Output validation & repair ─────────────────────────────────
const FORBIDDEN_TERMS = [
  "peildatum", "kennisbank", "als ai", "goed dat je dit vraagt",
  "ik begrijp je helemaal", "je moet", "scenario",
  "globaal zo uit",
];

function replaceDashes(text: string): string {
  return text.replace(/[\u2014\u2013]/g, "-");
}

function validateAndRepair(draft: string, maxSentences: number): { text: string; issues: string[]; repaired: boolean } {
  let text = replaceDashes(draft);
  const issues: string[] = [];

  // Check forbidden terms
  const lower = text.toLowerCase();
  for (const phrase of FORBIDDEN_TERMS) {
    if (lower.includes(phrase)) {
      issues.push(`Bevat verboden term: "${phrase}"`);
    }
  }

  // Check bracket-labels (independent of length)
  if (/\[[A-Z][^\]]{1,30}\]/.test(text)) {
    issues.push("Bevat bracket-labels zoals [Label]");
    text = text.replace(/\[[A-Z][^\]]{1,30}\]\s*/g, "");
  }

  // Check sentence length
  const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 5);
  if (sentences.length > maxSentences) {
    issues.push(`Te lang: ${sentences.length} zinnen (max ${maxSentences})`);
    text = sentences.slice(0, maxSentences).join(" ").trim();
  }

  // Check dashes
  if (/[\u2014\u2013]/.test(text)) {
    issues.push("Bevat em-dash of en-dash");
    text = replaceDashes(text);
  }

  return { text, issues, repaired: issues.length > 0 };
}

// ── System prompt ──────────────────────────────────────────────
const SITE_GUIDE_PROMPT = `Je bent DoorAI, de site-gids van Onderwijsloket Rotterdam. Je helpt bezoekers de juiste pagina te vinden.

## IDENTITEIT
Je bent een warme, nuchtere wegwijzer: menselijk, direct, vriendelijk. Je helpt mensen orienteren op werken in het onderwijs. Je bent geen recruiter, geen jurist en geen arbeidsvoorwaardelijk adviseur. Je doet geen beloftes en je kiest niet "de beste route" voor iemand. Je zet opties naast elkaar en helpt de gebruiker zelf kiezen.

## GEDRAGSREGELS
- Geen standaard bevestigingen. Alleen erkenning als iemand spanning, twijfel of frustratie uit.
- Geen mini-samenvatting als automatisme.
- Stel maximaal 1 vraag per beurt, alleen als je zonder die vraag niet kunt verwijzen.
- Blijf neutraal. Gebruik woorden als "kan", "meestal", "verschilt per sector/regio/school".

## STIJL
- Korte zinnen. Concreet. Geen vakjargon tenzij de gebruiker erom vraagt.
- Vermijd containerzinnen zoals "het hangt ervan af" zonder meteen te concretiseren.
- Geen emojis. Geen emdash of endash (gebruik "-" of splits zinnen).
- Noem NOOIT "kennisbank" of "peildatum" - dat zijn interne labels.

## VERBODEN ZINNEN
- "Goed dat je dit vraagt."
- "Ik begrijp je helemaal."
- "Als AI kan ik..."
- "Wat is de beste route voor jou?"
- "Je moet ..."
- "Dat weet ik niet." (zonder vervolg)

## VERBODEN PATRONEN
- GEEN tekst tussen vierkante haken: [Landelijk], [Regionaal], [Stap 1], etc.
- GEEN opsommingen, genummerde lijsten, stappen-overzichten.
- GEEN subkopjes of structurering. Schrijf gewoon lopende tekst.
- NOOIT het woord "scenario" of "scenario's".

## VOORKEURSZINNEN (afwisselen)
- "Helder."
- "Even scherp zetten."
- "Dit verschilt per sector of school. Dit is de vaste plek om te checken: ..."
- "Als dit maatwerk wordt, is een consult het handigst. Zal ik je daarheen wijzen?"

## LINKS
- Gebruik klikbare markdown-links waar relevant, bijv: [Routes bekijken](/opleidingen)
- Max 2-4 links per antwoord, beschrijvend. Nooit "klik hier".

## OUTPUT REGELS
1. **Maximaal 2 zinnen** per antwoord
2. **Altijd een relevante link** meegeven als markdown: [tekst](/pad)
3. **Noem feiten compact** (bijv. "Pabo duurt 4 jaar voltijd")
4. **Geen inhoudelijk carriere-advies** - verwijs naar account/Doortje voor persoonlijk advies

## ONDERWIJSSECTOREN
- **PO**: Basisschool, groep 1-8, leeftijd 4-12 jaar. Bevoegdheid via Pabo.
- **VO**: Middelbare school (vmbo/havo/vwo). Eerste- of tweedegraads bevoegdheid nodig.
- **MBO**: Beroepsopleidingen niveau 1-4. PDG of bevoegdheid voor beroepsvakken.
- **SO**: Voor leerlingen met extra ondersteuningsbehoefte. Extra specialisatie bovenop basisbevoegdheid.

## ROUTES NAAR HET LERAARSCHAP
| Route | Voor wie | Duur | Meer info |
|-------|----------|------|-----------|
| **Pabo** | Leraar basisonderwijs worden | 4 jaar voltijd | [/opleidingen](/opleidingen) |
| **Zij-instroom PO/VO** | Hbo/wo-diploma + werkervaring | 2 jaar duaal | [/opleidingen](/opleidingen) |
| **PDG (mbo-docent)** | Hbo/wo + vakexpertise | 1 jaar | [/opleidingen](/opleidingen) |
| **Lerarenopleiding VO** | Tweedegraads (hbo) of eerstegraads (wo) | 4 jaar / 1-2 jaar master | [/opleidingen](/opleidingen) |
| **Onderwijsassistent** | Instap zonder diploma, mbo-3/4 | 2-3 jaar | [/opleidingen](/opleidingen) |

## WEBSITE PAGINA'S
| Pagina | URL | Wat vind je er |
|--------|-----|----------------|
| Homepage | [/](/) | Overzicht, snel starten |
| Opleidingen | [/opleidingen](/opleidingen) | Alle routes naar het leraarschap |
| Vacatures | [/vacatures](/vacatures) | Actuele banen bij scholen |
| Evenementen | [/events](/events) | Open dagen, webinars, infosessies |
| Account | [/auth](/auth) | Inloggen of registreren |
| Dashboard | [/dashboard](/dashboard) | Persoonlijke voortgang (na inloggen) |

## VOORBEELDEN

Gebruiker: "Wat is zij-instroom?"
DoorAI: "Zij-instroom is een 2-jarig traject voor mensen met een hbo/wo-diploma en werkervaring die leraar willen worden. Bekijk alle routes op de [opleidingspagina](/opleidingen)."

Gebruiker: "Hoe word ik leraar basisonderwijs?"
DoorAI: "Via de Pabo (4 jaar) of zij-instroom (2 jaar, als je al een diploma hebt). Ontdek welke route bij je past op [/opleidingen](/opleidingen)."

Gebruiker: "Zijn er open dagen?"
DoorAI: "Bekijk de [evenementenpagina](/events) voor actuele open dagen en webinars."

Gebruiker: "Ik wil persoonlijk advies"
DoorAI: "Ik kan je helpen orienteren en de opties naast elkaar zetten. Voor een persoonlijker traject is inloggen handig - maak een [gratis account](/auth) aan."`;

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface RequestBody {
  messages: ChatMessage[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages }: RequestBody = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Server-side classify before calling LLM
    const lastUserMsg = [...messages].reverse().find(m => m.role === "user")?.content?.trim() ?? "";
    const answerType = classifyAnswerType(lastUserMsg);
    const mode = "public";

    // ── Infer conversation signals for dynamic actions ──
    const allUserMsgs = messages.filter(m => m.role === "user").map(m => m.content.toLowerCase()).join(" ");
    const mentionsSector = /\b(po|vo|mbo|basisonderwijs|voortgezet|middelbare|beroepsonderwijs)\b/i.test(allUserMsgs);
    const mentionsLevel = /\b(mbo|hbo|wo|univers)\b/i.test(allUserMsgs);
    const mentionsRoute = /\b(pabo|zij-instroom|zijinstroom|pdg|lerarenopleiding|onderwijsassistent)\b/i.test(allUserMsgs);
    const msgCount = messages.filter(m => m.role === "user").length;

    // ── Dynamic actions based on conversation context ──
    function buildActions(): Array<{ label: string; value: string }> {
      if (answerType === "begroeting") {
        return [
          { label: "Welke route past bij mij?", value: "Welke route past bij mij om leraar te worden?" },
          { label: "Ik werk al en wil overstappen", value: "Ik werk al. Kan ik overstappen naar het onderwijs?" },
        ];
      }
      if (!mentionsSector && msgCount >= 1) {
        return [
          { label: "Basisonderwijs (PO)", value: "Ik ben geïnteresseerd in het basisonderwijs." },
          { label: "Voortgezet onderwijs (VO)", value: "Ik ben geïnteresseerd in het voortgezet onderwijs." },
        ];
      }
      if (mentionsSector && !mentionsRoute) {
        return [
          { label: "Welke routes zijn er?", value: "Welke opleidingsroutes zijn er voor mij?" },
          { label: "Bekijk vacatures", value: "Zijn er vacatures in het onderwijs?" },
        ];
      }
      if (mentionsRoute) {
        return [
          { label: "Bekijk evenementen", value: "Zijn er open dagen of informatie-avonden?" },
          { label: "Maak een account", value: "Hoe kan ik een account aanmaken voor persoonlijk advies?" },
        ];
      }
      return [
        { label: "Vertel me meer", value: "Kun je daar meer over vertellen?" },
        { label: "Bekijk opleidingen", value: "Welke opleidingsroutes zijn er?" },
      ];
    }

    const actions = buildActions();

    // Build meta payload (server-side, not LLM)
    const meta = {
      mode,
      answer_type: answerType,
      direct_answer: null,
      supporting_detail: null,
      actions,
      verified_links: answerType === "wegwijs"
        ? [
            { label: "Routes en opleidingen", href: "/opleidingen" },
            { label: "Vacatures bekijken", href: "/vacatures" },
            { label: "Events en meelopen", href: "/events" },
          ]
        : answerType === "reproductie"
        ? [
            { label: "Routes en opleidingen", href: "/opleidingen" },
            { label: "CAO-salaristabellen", href: "https://www.voraad.nl/cao" },
          ]
        : [
            { label: "Routes en opleidingen", href: "/opleidingen" },
          ],
    };

    // ── Non-streaming LLM call for draft validation ──
    const maxSentences = answerType === "begroeting" ? 2 : 3;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SITE_GUIDE_PROMPT },
          ...messages,
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Te veel verzoeken, probeer het later opnieuw." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI-credits zijn op, neem contact op met de beheerder." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Er ging iets mis met de AI, probeer het opnieuw." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const llmData = await response.json();
    const rawDraft = llmData.choices?.[0]?.message?.content ?? "";

    // ── Validate & repair before streaming ──
    const validated = validateAndRepair(rawDraft, maxSentences);
    const finalText = validated.text;

    if (validated.issues.length > 0) {
      console.warn("Homepage-coach validation issues (repaired):", validated.issues);
    }

    // ── Stream validated response word-by-word for smooth UX ──
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const enc = new TextEncoder();

    (async () => {
      try {
        // Send server-side meta as first data event
        await writer.write(enc.encode(`data: ${JSON.stringify({ meta })}\n\n`));

        // Stream the validated text word-by-word
        const words = finalText.split(/(\s+)/);
        for (const word of words) {
          const chunk = {
            choices: [{ delta: { content: word }, index: 0 }],
          };
          await writer.write(enc.encode(`data: ${JSON.stringify(chunk)}\n\n`));
        }

        await writer.write(enc.encode("data: [DONE]\n\n"));
      } catch (e) {
        console.error("Stream error:", e);
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error("Homepage coach error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Onbekende fout" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
