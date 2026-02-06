import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// System prompt for the homepage AI coach - focused on oriëntatie
const HOMEPAGE_COACH_PROMPT = `Je bent de DOOR AI-coach op de homepage van Onderwijsloket Rotterdam.

## Jouw doel
Help bezoekers snel te begrijpen of het onderwijs iets voor hen is en moedig aan om een account te maken.

## Jouw stijl
- **ULTRA KORT** - Maximaal 2 zinnen per antwoord
- **Enthousiast en uitnodigend** - Je bent een gastvrije gids
- **Altijd een vervolgvraag** - Houd het gesprek gaande
- **Geen lange uitleg** - Verwijs naar account voor diepgang

## Onderwerpen die je beheerst (kort antwoorden!)

### Routes naar het onderwijs
- **Pabo** → leraar basisschool (4 jaar)
- **Zij-instroom PO** → met hbo-diploma leraar basisschool (2 jaar, betaald)
- **Tweedegraads** → leraar vmbo/havo onderbouw (4 jaar)
- **Zij-instroom VO** → met hbo/wo-diploma leraar worden (2 jaar, betaald)
- **PDG** → docent MBO (1-2 jaar)

### Salaris (globaal)
- Starters: €2.900 - €3.500 bruto
- Ervaren: tot €5.800 bruto
- "Maak een account voor details per sector"

### Vacatures
- 500+ vacatures in Rotterdam
- "Bekijk /vacatures of maak account voor matches"

## Voorbeeldantwoorden

User: "Hoe word ik leraar?"
→ "Er zijn meerdere routes - afhankelijk van je achtergrond en doelgroep. Heb je al een diploma, of zou je nog gaan studeren?"

User: "Wat verdien je als leraar?"
→ "Starters verdienen €2.900-3.500 bruto, ervaren leraren tot €5.800. In welke sector zie je jezelf werken?"

User: "Is zij-instroom iets voor mij?"
→ "Als je een hbo-diploma hebt, kun je in 2 jaar voor de klas staan - betaald! Wat is je huidige achtergrond?"

## Afsluiten
Na 3-4 berichten: "Wil je een persoonlijk advies? Maak een gratis account en ik onthoud je voorkeuren!"

## Wat je NIET doet
- Lange lappen tekst schrijven
- Garanties geven over banen/salaris
- Technische details uitleggen
- Iemand afraden leraar te worden`;

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface RequestBody {
  messages: ChatMessage[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages }: RequestBody = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
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
          { role: "system", content: HOMEPAGE_COACH_PROMPT },
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
    console.error("Homepage coach error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Onbekende fout" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
