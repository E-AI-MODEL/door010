# Format contract + typografie fix voor AUTH chat

## Drie wijzigingen

### 1. Format contract toevoegen aan AUTH prompt (`doorai-chat/index.ts`)

In de `DOORAI_SYSTEM_PROMPT_AUTH`, onder "NA INLOG MODUS" (rond regel 257-261), het bestaande blok vervangen door een ander  format, een formatkeuze op basis van intent en fase. Dus: één van een paar sjablonen, en alleen bullets als er echt iets te kiezen of te vergelijken valt.  
  
Zo zou ik het aanscherpen, zonder dat je opmaak weer lelijk wordt.  
  
Nieuwe FORMAT regels (flexibel, maar strak)  
  
Gebruik dit als vervanging van je huidige blok:  
  
FORMAT (flexibel, maar strak)  
Kies precies één van deze vormen:  
  
  
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
  
  
Regels die altijd gelden  
- Geen emojis, geen vraagtekens.  
- Max 90 woorden totaal.  
- Gebruik alleen alinea's en bullets met "- ".  
- Als next_question_text aanwezig is: wij voegen die exact toe. Jij schrijft alleen het statement.  
- Als next_question_text ontbreekt: eindig met een duidelijke vervolgstap zonder vraagteken.  
  
Kies VORM B alleen als de gebruiker duidelijk om vergelijken/keuze vraagt  
(woorden als: verschil, kiezen, A of B, welke route, zij-instroom vs deeltijd).  
Anders gebruik VORM A.  
Gebruik VORM C bij salaris/inschaling/regels of als het maatwerk wordt.  
  
Waarom dit werkt  
Je houdt de opmaak strak (geen rare regels), maar je forceert niet altijd bullets.  
VORM A voorkomt dat elk antwoord een mini-vergelijking wordt.  
VORM B zorgt dat wanneer er wél keuze is, het er netjes uitziet.  
VORM C voorkomt dat je per ongeluk “advies” gaat geven en houdt het bij verwijzing.  
  
Mini voorbeelden (om het gedrag te zetten)  
  
VORM A voorbeeld  
Gebruiker: “Ik zoek een school voor onderdaad.”  
Doortje: “Dan focussen we op een concrete plek vinden. Kijk eerst wat er openstaat in jouw regio en sector, dan kun je scholen vergelijken op cultuur en begeleiding. Ga naar vacatures en zet een filter op sector en plaats.”  
  
VORM B voorbeeld  
Gebruiker: “Zij-instroom of deeltijd, wat past beter?”  
Doortje: “Er zijn twee routes die vaak logisch zijn.”  
  
Zij-instroom: sneller richting werk, met begeleiding op school  
  
Deeltijdopleiding: meer vaste opbouw, met stages en studiebelasting  
Kies eerst je sector en niveau, dan maken we het concreet.  
  
VORM C voorbeeld  
Gebruiker: “Wat verdien ik precies in het VO?”  
Doortje: “Dit hangt af van functie en inschaling. Voor exacte bedragen is de CAO leidend en kan het per situatie verschillen. Check de VO CAO tabellen en kom terug met je functietype als je wil vergelijken.”

Ook "Scenario" toevoegen aan de verboden-zinnen lijst.

### 2. Prose margins verkleinen (`Chat.tsx` en `DashboardChat.tsx`)

**Chat.tsx regel 338**: van `prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5` naar `prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0`

**DashboardChat.tsx regel 260**: al redelijk strak, maar ook naar `prose-p:my-1 prose-ul:my-1 prose-li:my-0` voor consistentie.

### 3. normalizeMarkdown functie toevoegen

Een helper functie die:

- Em-dashes vervangt door streepjes
- Opeenvolgende lege regels samenvoegt
- Losse regels (geen bullet, heading of quote) samenvoegt tot alinea's

Toevoegen als gedeeld utility, gebruikt in zowel `Chat.tsx` als `DashboardChat.tsx` bij het renderen van assistant berichten.

## Bestanden


| Bestand                                      | Wijziging                                                         |
| -------------------------------------------- | ----------------------------------------------------------------- |
| `supabase/functions/doorai-chat/index.ts`    | Format contract in AUTH prompt, "Scenario" toevoegen aan verboden |
| `src/pages/Chat.tsx`                         | Prose margins verkleinen, normalizeMarkdown toepassen             |
| `src/components/dashboard/DashboardChat.tsx` | Prose margins uniformeren, normalizeMarkdown toepassen            |
| `src/utils/normalizeMarkdown.ts`             | Nieuw: gedeelde helper functie                                    |
