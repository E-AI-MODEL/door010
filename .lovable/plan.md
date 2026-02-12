
# Plan: Natuurlijkere knopteksten

## Probleem

De suggestieknoppen sturen stijve, gescripte zinnen als chatbericht: "Ik ben geïnteresseerd in lesgeven", "Ik wil me oriënteren op PO". Dit voelt als een scripted chatbot, niet als een natuurlijk gesprek.

## Oplossing

De **labels** (wat de gebruiker ziet op de knop) blijven kort en duidelijk. De **values** (wat als bericht wordt verstuurd) worden omgeschreven naar informele, menselijke zinnetjes - alsof iemand het echt zou typen.

## Wijzigingen

Alleen het bestand `supabase/functions/doorai-chat/index.ts` wordt aangepast, in twee functies:

### 1. `actionsForNextSlot()` (authenticated mode)

| Slot | Label (blijft) | Value (oud, stijf) | Value (nieuw, natuurlijk) |
|------|----------------|--------------------|----|
| school_type | PO (basisonderwijs) | "PO" | "Basisonderwijs lijkt me wat" |
| school_type | VO (voortgezet) | "VO" | "Voortgezet onderwijs, denk ik" |
| school_type | MBO (beroepsonderwijs) | "MBO" | "MBO spreekt me aan" |
| role_interest | Lesgeven | "Ik wil lesgeven" | "Lesgeven trekt me" |
| role_interest | Begeleiden | "Ik wil begeleiden" | "Leerlingen begeleiden, dat lijkt me wat" |
| role_interest | Vakexpertise | "Ik wil mijn vak inzetten" | "Mijn vak inzetten in het onderwijs" |
| credential_goal | Route naar bevoegdheid | "Ik wil routes naar bevoegdheid zien" | "Hoe krijg ik een bevoegdheid" |
| credential_goal | Eerst verkennen | "Ik wil eerst verkennen wat bij me past" | "Ik wil eerst verkennen" |
| admission_requirements | MBO/HBO/WO/Anders | "Ik heb mbo" etc. | "Mijn achtergrond is mbo" etc. |
| region_preference | Regio Rotterdam | "Regio Rotterdam" | "Rotterdam en omgeving" |
| region_preference | Andere regio | "Andere regio" | "Ergens anders in Nederland" |
| next_step | Vacatures | "Ik wil vacatures bekijken" | "Laat me vacatures zien" |
| next_step | Gesprek plannen | "Ik wil een gesprek plannen" | "Kan ik ergens terecht voor een gesprek" |
| next_step | Events | "Ik wil events bekijken" | "Zijn er events binnenkort" |

### 2. `chooseActions()` (public mode)

| Fase | Label (blijft) | Value (oud) | Value (nieuw) |
|------|----------------|-------------|---------------|
| interesseren | Lesgeven | "Ik ben geïnteresseerd in lesgeven" | "Lesgeven trekt me" |
| interesseren | Begeleiding | "Ik ben geïnteresseerd in begeleiding" | "Leerlingen begeleiden lijkt me wat" |
| interesseren | Vakexpertise | "Ik ben geïnteresseerd in vakexpertise" | "Mijn vak inzetten in het onderwijs" |
| (geen sector) | PO/VO/MBO | "Ik wil me oriënteren op PO" etc. | "Basisonderwijs lijkt me wat" etc. |
| beslissen | Kosten bekijken | "Ik wil meer weten over de kosten" | "Wat kost het eigenlijk" |
| beslissen | Vacatures | "Ik wil vacatures bekijken" | "Laat me vacatures zien" |
| beslissen | Gesprek plannen | "Ik wil een gesprek plannen" | "Kan ik ergens terecht voor een gesprek" |
| matchen | Scholen zoeken | "Ik wil scholen zoeken in mijn regio" | "Welke scholen zitten in mijn buurt" |
| matchen | Vacatures | "Ik wil vacatures bekijken" | "Laat me vacatures zien" |
| voorbereiden | Checklist | "Wat moet ik nog regelen?" | "Wat moet ik nog regelen" |
| voorbereiden | Gesprek plannen | "Ik wil een gesprek plannen" | "Kan ik ergens terecht voor een gesprek" |
| default | Routes bekijken | "Welke routes zijn er naar het leraarschap?" | "Hoe word je eigenlijk leraar" |
| default | Opleidingen | "Welke opleidingen zijn er?" | "Welke opleidingen zijn er" |

### 3. Context-lek fixen (bonus)

Regel 343: de SSOT-vraagtekst wordt uit de system prompt context verwijderd om te voorkomen dat het model de vraag parafraseert. Alleen fase, confidence en bekende info blijven staan.

## Bestanden

| Bestand | Wijziging |
|---------|-----------|
| `supabase/functions/doorai-chat/index.ts` | Values in beide action-functies + context-lek fixen |

Na de wijziging wordt de edge function opnieuw gedeployed.
