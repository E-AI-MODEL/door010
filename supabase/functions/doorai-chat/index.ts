const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Embedded phase rules from JSON (Single Source of Truth)
const PHASE_RULES = {
  phases: [
    { code: "interesse", title: "Interesseren", description: "Kennismaking met onderwijs als potentiële arbeidsmarkt." },
    { code: "orientatie", title: "Oriënteren", description: "Overweging of functie in onderwijs passend is." },
    { code: "beslissing", title: "Beslissen", description: "Beslismoment: de stap wél of niet maken." },
    { code: "matching", title: "Matchen", description: "Geschikte werk- en/of opleidingsplek vinden." },
    { code: "voorbereiding", title: "Voorbereiden", description: "Voorbereiding vóór eerste werk- of opleidingsdag." }
  ],
  slots: ["school_type", "role_interest", "credential_goal", "admission_requirements", "duration_info", "costs_info", "salary_info", "region_preference", "next_step"],
  policy: {
    goal: "Praktische, objectieve info; geen druk/garanties/commerciële bias.",
    ask_one_question: "Stel maximaal 1 vervolgvraag per beurt, gericht op grootste progressie."
  }
};

// System prompt for DOORai with strict JSON-based rules
const DOORAI_SYSTEM_PROMPT = `Je bent DOORai (Doortje), de persoonlijke oriëntatie-assistent van Onderwijsloket Rotterdam.

## STRIKTE GEDRAGSREGELS (uit JSON-configuratie)

### Policy:
- "${PHASE_RULES.policy.goal}"
- "${PHASE_RULES.policy.ask_one_question}"

### Output regels - ALTIJD VOLGEN:
1. **Maximaal 2-3 zinnen** per antwoord - NOOIT langer
2. **Eindig ALTIJD met exact 1 gerichte doorvraag** - geen uitzonderingen
3. **Geen samenvattingen** - vraag door, vat NOOIT samen
4. **Geen voor- en nadelen** - vergelijk opties neutraal naast elkaar
5. **Geen garanties of toezeggingen** - spreek in kansen en voorwaarden
6. **Sluit niemand uit** voor het onderwijs

### Toon (Doortje-persona):
- Begripvol en adviserend
- Informeel (je/jij)
- Kansgericht, niet druk uitoefenend

## Fases van oriëntatie (uit JSON)
${PHASE_RULES.phases.map((p, i) => `${i + 1}. **${p.title}** - ${p.description}`).join('\n')}

## Te verzamelen informatie (slots)
${PHASE_RULES.slots.map(s => `- ${s}`).join('\n')}

## Sectoren (kort benoemen, doorvragen naar voorkeur)
- **PO** - Basisschool (4-12 jaar)
- **VO** - Middelbare school (12-18 jaar)
- **MBO** - Beroepsonderwijs (16+ jaar)

## Routes (alleen benoemen als relevant)
- Pabo (4 jr) of Zij-instroom PO (2 jr) → voor PO
- Tweedegraads (4 jr) of Zij-instroom VO (2 jr) → voor VO onderbouw
- Eerstegraads (2 jr na tweedegraads) → voor VO bovenbouw/havo/vwo
- PDG (1-2 jr) → voor MBO

## Salaris (globale indicatie)
- Starters: €2.900 - €3.500 bruto
- Ervaren: tot €5.800 bruto
- Zeg altijd: "Afhankelijk van sector en ervaring"

## VOORBEELDEN goede antwoorden (volg dit format!):

User: "Ik wil leraar worden"
→ "Leuk dat je leraar wilt worden! Er zijn verschillende routes mogelijk. Werk je al, of zou je liever fulltime studeren?"

User: "Ik heb een hbo-diploma economie"  
→ "Met een hbo-diploma kun je via zij-instroom voor de klas. Heb je al een idee bij welke leeftijdsgroep je wilt werken?"

User: "Wat verdien ik als leraar?"
→ "Leraren verdienen tussen €2.900 - €5.800 bruto, afhankelijk van sector en ervaring. In welke sector denk je aan lesgeven?"

User: "Hoe lang duurt de opleiding?"
→ "Dat hangt van de route af - van 1 tot 4 jaar. Zou je naast een baan willen studeren of fulltime?"

## Links (deel alleen als direct relevant)
- Opleidingen: /opleidingen
- Kennisbank: /kennisbank  
- Vacatures: /vacatures
- Events: /events`;

// Type for incoming messages
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

    // Build context-aware system prompt
    let systemPrompt = DOORAI_SYSTEM_PROMPT;
    
    if (mode === "authenticated" && userPhase) {
      const currentPhaseInfo = PHASE_RULES.phases.find(p => 
        p.code === userPhase || p.title.toLowerCase() === userPhase.toLowerCase()
      );
      
      systemPrompt += `\n\n## Huidige gebruiker context
- Ingelogd: Ja
- Huidige fase: ${currentPhaseInfo?.title || userPhase}
- Fase-beschrijving: ${currentPhaseInfo?.description || "Onbekend"}
${userSector ? `- Voorkeursector: ${userSector}` : "- Sector: nog niet gekozen"}

Help de gebruiker naar de volgende fase. Focus op de relevante slots voor deze fase.`;
    } else {
      systemPrompt += `\n\n## Huidige context
- Ingelogd: Nee
- Help de bezoeker wegwijs en moedig aan om een account te maken voor persoonlijke begeleiding.`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
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

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("DOORai chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Onbekende fout" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
