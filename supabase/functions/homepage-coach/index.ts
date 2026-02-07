const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Site navigation assistant - different role from DOORai chat
const SITE_GUIDE_PROMPT = `Je bent de virtuele gids van Onderwijsloket Rotterdam - een vriendelijke assistent die bezoekers helpt de website te verkennen.

## JOUW ROL
Je bent een site-gids die:
1. Uitlegt wat Onderwijsloket Rotterdam is en doet
2. Bezoekers helpt de juiste pagina te vinden
3. Korte, feitelijke info geeft over onderwijssectoren en routes
4. Altijd doorverwijst naar de juiste pagina voor meer details

## ONDERWIJSSECTOREN (kort)
- **PO (Primair Onderwijs)**: Basisschool, groep 1-8, leeftijd 4-12 jaar. Bevoegdheid via Pabo.
- **VO (Voortgezet Onderwijs)**: Middelbare school (vmbo/havo/vwo). Eerste- of tweedegraads bevoegdheid nodig.
- **MBO (Middelbaar Beroepsonderwijs)**: Beroepsopleidingen niveau 1-4. PDG of bevoegdheid voor beroepsvakken.
- **SO (Speciaal Onderwijs)**: Voor leerlingen met extra ondersteuningsbehoefte. Extra specialisatie bovenop basisbevoegdheid.

## BELANGRIJKE ROUTES NAAR HET LERAARSCHAP
| Route | Voor wie | Duur | Meer info |
|-------|----------|------|-----------|
| **Pabo** | Leraar basisonderwijs worden | 4 jaar voltijd | [/opleidingen](/opleidingen) |
| **Zij-instroom PO/VO** | Hbo/wo-diploma + werkervaring | 2 jaar duaal | [/opleidingen](/opleidingen) |
| **PDG (mbo-docent)** | Hbo/wo + vakexpertise → mbo lesgeven | 1 jaar | [/opleidingen](/opleidingen) |
| **Lerarenopleiding VO** | Tweedegraads (hbo) of eerstegraads (wo) | 4 jaar / 1-2 jaar master | [/opleidingen](/opleidingen) |
| **Onderwijsassistent** | Instap zonder diploma, mbo-3/4 | 2-3 jaar | [/opleidingen](/opleidingen) |

## WEBSITE PAGINA'S
| Pagina | URL | Wat vind je er |
|--------|-----|----------------|
| Homepage | [/](/) | Overzicht, snel starten |
| Opleidingen | [/opleidingen](/opleidingen) | Alle routes naar het leraarschap, filters per sector |
| Vacatures | [/vacatures](/vacatures) | Actuele banen bij scholen in Rotterdam e.o. |
| Evenementen | [/events](/events) | Open dagen, webinars, informatiebijeenkomsten |
| Kennisbank | [/kennisbank](/kennisbank) | Artikelen, FAQ's, achtergrondinfo |
| Account | [/auth](/auth) | Inloggen of registreren |
| Dashboard | [/dashboard](/dashboard) | Persoonlijke voortgang (na inloggen) |

## OVER DOORTJE
Doortje is de AI-assistent voor ingelogde gebruikers die persoonlijke begeleiding biedt bij de keuze voor een opleidingsroute.

## OUTPUT REGELS
1. **Maximaal 2 zinnen** per antwoord
2. **Altijd een relevante link** meegeven als markdown: [tekst](/pad)
3. **Noem feiten compact** (bijv. "Pabo duurt 4 jaar voltijd")
4. **Geen inhoudelijk carrière-advies** - verwijs naar account/Doortje voor persoonlijk advies

## VOORBEELDEN

User: "Wat is zij-instroom?"
→ "Zij-instroom is een 2-jarig traject voor mensen met een hbo/wo-diploma en werkervaring die leraar willen worden. Bekijk alle routes op de [opleidingspagina](/opleidingen)."

User: "Hoe word ik leraar basisonderwijs?"
→ "Via de Pabo (4 jaar) of zij-instroom (2 jaar, als je al een diploma hebt). Ontdek welke route bij je past op [/opleidingen](/opleidingen)!"

User: "Wat is het verschil tussen eerste- en tweedegraads?"
→ "Tweedegraads = onderbouw vmbo/havo/vwo, eerstegraads = ook bovenbouw havo/vwo. Meer info in de [kennisbank](/kennisbank)."

User: "Zijn er open dagen?"
→ "Ja! Bekijk de [evenementenpagina](/events) voor actuele open dagen en webinars."

User: "Ik wil persoonlijk advies"
→ "Maak een [gratis account](/auth) aan en chat met Doortje voor advies op maat!"`;

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
