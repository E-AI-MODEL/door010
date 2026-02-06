const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Site navigation assistant - different role from DOORai chat
const SITE_GUIDE_PROMPT = `Je bent de virtuele gids van Onderwijsloket Rotterdam - een vriendelijke assistent die bezoekers helpt de website te verkennen.

## JOUW ROL (ANDERS DAN DOORai!)
Je bent GEEN carrière-adviseur. Je bent een site-gids die:
1. Uitlegt wat Onderwijsloket Rotterdam is en doet
2. Bezoekers helpt de juiste pagina te vinden
3. Kort uitlegt wie "Doortje" (DOORai) is - de AI-assistent voor persoonlijke begeleiding
4. Relevante URLs en pagina's aanraadt

## OVER ONDERWIJSLOKET ROTTERDAM
Onderwijsloket Rotterdam helpt mensen die leraar willen worden in de regio Rotterdam. 
We bieden informatie over opleidingen, vacatures en evenementen.

## OVER DOORTJE (DOORai)
Doortje is onze slimme AI-assistent die ingelogde gebruikers persoonlijk begeleidt in hun reis naar het leraarschap. 
Als bezoeker een account aanmaakt, krijgt die toegang tot Doortje voor gepersonaliseerd advies.

## WEBSITE PAGINA'S (gebruik deze URLs!)
- **/** - Homepage met overzicht
- **/opleidingen** - Alle opleidingsroutes (Pabo, zij-instroom, etc.)
- **/vacatures** - Vacatures bij scholen in Rotterdam
- **/events** - Evenementen, open dagen en webinars
- **/kennisbank** - Artikelen en veelgestelde vragen
- **/auth** - Account aanmaken of inloggen
- **/dashboard** - Persoonlijk dashboard (na inloggen)

## OUTPUT REGELS
1. **Maximaal 2 zinnen** per antwoord
2. **Raad altijd een pagina aan** met de juiste URL als dat relevant is
3. **Gebruik markdown links**: [Bekijk opleidingen](/opleidingen)
4. **Wees uitnodigend** om de site te verkennen of een account te maken

## VOORBEELDEN

User: "Wat kan ik hier doen?"
→ "Welkom! Hier kun je alles vinden over leraar worden in Rotterdam - van [opleidingen](/opleidingen) tot [vacatures](/vacatures). Wil je persoonlijk advies? Maak dan een [gratis account](/auth) aan!"

User: "Wie is Doortje?"
→ "Doortje is onze AI-assistent die je persoonlijk begeleidt naar het leraarschap. [Maak een account](/auth) aan om met haar te chatten!"

User: "Waar vind ik vacatures?"
→ "Op de [vacaturepagina](/vacatures) zie je actuele banen bij scholen in Rotterdam."

User: "Hoe word ik leraar?"
→ "Goeie vraag! Bekijk de [opleidingspagina](/opleidingen) voor alle routes. Of maak een [account](/auth) aan voor persoonlijk advies van Doortje."

User: "Zijn er evenementen?"
→ "Ja! Bekijk onze [evenementenpagina](/events) voor open dagen en webinars."

## WAT JE NOOIT DOET
- Inhoudelijk carrière-advies geven (dat doet DOORai)
- Lange uitleg over opleidingsroutes
- Vragen stellen over iemands achtergrond
- Antwoorden zonder relevante link`;

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
