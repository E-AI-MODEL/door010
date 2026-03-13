

# Fix: Chat placeholders + profiel zichtbaarheid + draft controle

## Probleem 1: Placeholders in chatantwoorden

De screenshot toont `[Landelijk]` en `[Regionaal]` als platte tekst in het antwoord. Dit zijn bracket-labels die het LLM genereert ondanks de "geen opsommingen" regel. Het antwoord is ook te lang (7+ zinnen vs max 3).

**Oorzaak**: Het systeem-prompt verbiedt bullets en genummerde lijsten, maar niet bracket-labels (`[Label]`). De reflectielaag controleert op verboden termen en zinlengte, maar:
- Geen detectie van `[...]`-patronen
- Zinslimiet is te ruim: `maxS * 1.5` (= 6 zinnen bij max 4)

**Fix in `doorai-chat/index.ts`**:
- Systeem-prompt uitbreiden: expliciet verbieden van `[Label]`-stijl, subkopjes, en elke vorm van structurering
- Reflectielaag: detectie van `[...]` bracket-labels toevoegen als verboden patroon
- Multiplier verlagen van `1.5` naar `1.2` voor strengere lengte-controle
- Toevoegen van `scenario` en `globaal zo uit` aan verboden termen (zichtbaar in screenshot)

## Probleem 2: Profiel niet zichtbaar op dashboard

Bij 1021px viewport is de gebruiker net onder de `lg` breakpoint (1024px). De `ProfileCard` heeft `hidden lg:block` en is daardoor onzichtbaar. De gebruiker mist het profieloverzicht op het dashboard.

**Fix in `Dashboard.tsx`**:
- Breakpoint aanpassen van `lg:block` naar `md:block` (768px+) zodat het profiel ook op tablets en smalle desktops zichtbaar is
- Grid aanpassen naar `md:grid-cols-12` layout

## Probleem 3: "Onderwerpen" uitklapmenu op dashboard

De tweede screenshot toont het Onderwerpen-menu als collapsed dropdown. Op 1021px viewport (< lg) verschijnt het als een inklapbaar menu. Dit is correct gedrag, maar kan beter: standaard open op medium schermen.

**Fix in `TopicMenu.tsx`**:
- Mobile toggle breakpoint aanpassen van `lg:hidden` naar `md:hidden`
- Desktop header breakpoint aanpassen van `hidden lg:flex` naar `hidden md:flex`

## Bestanden

| Bestand | Actie |
|---------|-------|
| `supabase/functions/doorai-chat/index.ts` | Systeem-prompt + reflectielaag verscherpen |
| `src/pages/Dashboard.tsx` | ProfileCard en grid breakpoints aanpassen |
| `src/components/dashboard/TopicMenu.tsx` | Menu breakpoints aanpassen naar `md` |

