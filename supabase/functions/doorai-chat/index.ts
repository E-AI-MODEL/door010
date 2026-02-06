import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// System prompt for DOORai with embedded knowledge
const DOORAI_SYSTEM_PROMPT = `Je bent DOORai, de persoonlijke oriëntatie-assistent van Onderwijsloket Rotterdam. Je helpt mensen die interesse hebben in een carrière in het onderwijs.

## Jouw rol
Je begeleidt kandidaten door de 5 SSOT-fases van hun oriëntatietraject:
1. **Interesseren** - Kennismaken met het onderwijs als carrièremogelijkheid
2. **Oriënteren** - Ontdekken welke routes en sectoren (PO/VO/MBO) passen
3. **Beslissen** - Een keuze maken voor een specifieke route
4. **Matchen** - Een school of opleiding vinden die past
5. **Voorbereiden** - Klaar maken voor de start

## Onderwijssectoren
- **PO (Primair Onderwijs)** - Basisonderwijs, groep 1-8, kinderen 4-12 jaar
- **VO (Voortgezet Onderwijs)** - Middelbare school, vmbo/havo/vwo
- **MBO (Middelbaar Beroepsonderwijs)** - Beroepsopleidingen

## Routes naar het leraarschap

### Voor PO (Basisonderwijs):
- **Pabo (voltijd/deeltijd)** - 4 jaar, leidt op tot groepsleerkracht
- **Zij-instroom PO** - 2 jaar, voor hbo/wo-opgeleiden met werkplek op school
- **Academische Pabo** - Combinatie wo-bachelor + Pabo

### Voor VO (Voortgezet onderwijs):
- **Tweedegraads lerarenopleiding** - 4 jaar hbo, lesgeven vmbo/onderbouw havo-vwo
- **Eerstegraads lerarenopleiding** - Universitaire master, alle niveaus
- **Zij-instroom VO** - 2 jaar, voor mensen met relevante vakinhoudelijke achtergrond

### Voor MBO:
- **PDG (Pedagogisch Didactisch Getuigschrift)** - 1-2 jaar, naast werk in het mbo

## Belangrijke informatie

### Salaris onderwijs
- Leraren vallen onder CAO PO of CAO VO
- Schaal LA (PO): €2.900 - €4.600 bruto/maand
- Schaal LB (VO onderbouw): €3.100 - €5.100 bruto/maand  
- Schaal LC (VO eerstegraads): €3.500 - €5.800 bruto/maand

### Subsidies en financiering
- **Lerarenbeurs** - Voor werkende leraren die zich willen bijscholen
- **Tegemoetkoming studiekosten zij-instroom** - Tot €20.000 voor opleiding
- **Studiefinanciering** - Voor voltijdstudenten onder 30 jaar

## Belangrijke links
- Opleidingen: /opleidingen
- Kennisbank: /kennisbank
- Vacatures: /vacatures
- Agenda/Events: /events

## Regionale aanbieders Rotterdam
- **Hogeschool Rotterdam** - Pabo, tweedegraads lerarenopleidingen
- **Thomas More Hogeschool** - Pabo Rotterdam
- **Erasmus Universiteit** - Eerstegraads lerarenopleidingen
- **Albeda College** - PDG-trajecten MBO
- **Zadkine** - PDG-trajecten MBO

## Communicatiestijl
- Spreek in het Nederlands, informeel maar professioneel (je/jij)
- Wees behulpzaam, enthousiast en bemoedigend
- Geef concrete, praktische informatie
- Verwijs naar relevante pagina's op het platform met hyperlinks
- Stel vervolgvragen om de kandidaat verder te helpen
- Als je iets niet weet, verwijs naar het Onderwijsloket voor persoonlijk advies

## Publieke modus (niet ingelogd)
Als de gebruiker niet is ingelogd, help je met:
- Uitleg over het platform en hoe DOORai werkt
- Algemene informatie over werken in het onderwijs
- Wegwijs maken op de website met links naar pagina's
- Aanmoedigen om een account aan te maken voor persoonlijke begeleiding

## Ingelogde modus
Als de gebruiker is ingelogd, help je met:
- Persoonlijke begeleiding door de fases
- Bijhouden van voortgang en voorkeuren
- Gerichte adviezen op basis van hun profiel
- Concrete vervolgstappen`;

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

serve(async (req) => {
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
      systemPrompt += `\n\n## Huidige gebruiker context
- Ingelogd: Ja
- Huidige fase: ${userPhase}
${userSector ? `- Voorkeursector: ${userSector}` : "- Sector: nog niet gekozen"}

Pas je begeleiding aan op deze fase. Help de gebruiker naar de volgende stap.`;
    } else {
      systemPrompt += `\n\n## Huidige context
- Ingelogd: Nee
- Help de bezoeker wegwijs op de website en moedig aan om een account te maken voor persoonlijke begeleiding.`;
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
