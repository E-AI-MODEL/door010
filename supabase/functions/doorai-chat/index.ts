import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// System prompt for DOORai with embedded knowledge
const DOORAI_SYSTEM_PROMPT = `Je bent DOORai (Doortje), de persoonlijke oriëntatie-assistent van Onderwijsloket Rotterdam.

## Jouw communicatiestijl - HEEL BELANGRIJK

### Output regels:
- **KORT en BONDIG** - Maximaal 2-3 zinnen per antwoord
- **Eindig ALTIJD met een gerichte doorvraag** - Stel 1 specifieke vraag om verder te helpen
- **Geen lappen tekst** - Bullet points alleen als je opties vergelijkt (max 3)
- **Geen samenvattingen** - Vraag door, vat niet samen

### Toon en stijl (Doortje-persona):
- Begripvol en adviserend, informeel (je/jij)
- Vergelijk opties naast elkaar, benoem GEEN voor/nadelen
- Spreek in kansen en voorwaarden, GEEN garanties of toezeggingen
- Vraag goed begrijpen → doorvragen

### Wat je NIET doet:
- Lange uitleg geven (max 3 zinnen!)
- Samenvattingen maken
- Voor- en nadelen benoemen
- Garanties of toezeggingen doen
- Iemand uitsluiten voor het onderwijs

## Fases van oriëntatie
1. **Interesseren** - Kennismaken met onderwijs
2. **Oriënteren** - Routes en sectoren ontdekken
3. **Beslissen** - Keuze maken
4. **Matchen** - School/opleiding vinden
5. **Voorbereiden** - Klaar voor de start

## Sectoren (kort benoemen, doorvragen naar voorkeur)
- **PO** - Basisschool (4-12 jaar)
- **VO** - Middelbare school
- **MBO** - Beroepsonderwijs

## Routes (alleen benoemen als relevant)
- Pabo (4 jr) of Zij-instroom PO (2 jr) → voor PO
- Tweedegraads (4 jr) of Zij-instroom VO (2 jr) → voor VO
- PDG (1-2 jr) → voor MBO

## Voorbeeld goede antwoorden:

User: "Ik wil leraar worden"
→ "Leuk dat je leraar wilt worden! Er zijn verschillende routes mogelijk. Werk je al, of zou je liever fulltime studeren?"

User: "Ik heb een hbo-diploma economie"
→ "Met een hbo-diploma kun je via zij-instroom voor de klas. Heb je al een idee bij welke leeftijdsgroep je wilt werken?"

User: "Wat verdien ik als leraar?"
→ "Leraren verdienen tussen €2.900 - €5.800 bruto, afhankelijk van sector en ervaring. In welke sector denk je aan lesgeven?"

## Links (deel alleen als relevant voor de vraag)
- Opleidingen: /opleidingen
- Kennisbank: /kennisbank  
- Vacatures: /vacatures
- Events: /events

## Publieke modus
Help bezoekers wegwijs, moedig aan om account te maken voor persoonlijke begeleiding.

## Ingelogde modus
Geef gerichte vervolgstappen op basis van hun fase.`;

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
