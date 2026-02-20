

# Verfijnd plan: fase-tracking, dashboard-zichtbaarheid en chat-link

## Overzicht

Vier chirurgische wijzigingen in bestaande code. Geen nieuwe bestanden, geen nieuwe tabellen, geen duplicaten.

---

## Stap 1: Fase-drempel verlagen (0.75 naar 0.60)

Iedereen blijft op "interesseren" staan omdat de confidence-drempel te hoog is. De fase-detector geeft +1.5 bias aan de huidige fase, waardoor een nieuwe fase bijna nooit 0.75 haalt.

Vier plekken, elk 1 regelwijziging:

| Bestand | Regel | Huidig | Nieuw |
|---------|-------|--------|-------|
| `src/components/dashboard/DashboardChat.tsx` | 100 | `>= 0.75` | `>= 0.60` |
| `src/components/dashboard/DashboardChat.tsx` | 159 | `>= 0.75` | `>= 0.60` |
| `src/pages/Chat.tsx` | 111 | `>= 0.75` | `>= 0.60` |
| `src/pages/Chat.tsx` | 182 | `>= 0.75` | `>= 0.60` |

---

## Stap 2: Fase-wijziging als melding in backoffice

In `src/pages/Backoffice.tsx`, in de bestaande `generateAlertsFromProfiles()` functie (na het appointments-blok, rond r94). Toevoegen:

```text
Als current_phase NIET "interesseren" is
EN updated_at recenter is dan 7 dagen geleden
-> alert type "phase_change", prioriteit "medium"
   bericht: "Doorgeschoven naar fase: [fasenaam]"
```

Dit past naadloos in het bestaande patroon. `BackofficeAlerts` ondersteunt het type `phase_change` al (r44-49, TrendingUp icoon, label "Fase wijziging"). Geen wijziging nodig in `BackofficeAlerts.tsx`.

Omvang: ~8 regels toevoegen.

---

## Stap 3: Dashboard-statistieken uitbreiden met alle fasen

Nieuw gevonden punt: `BackofficeStats.tsx` toont nu alleen tellingen voor "Interesseren" en "Matchen" (r60-71). De drie tussenliggende fasen (orienteren, beslissen, voorbereiden) ontbreken visueel. Als gebruikers gaan doorstromen ziet de adviseur dit niet in het dashboard.

Wijziging in `src/components/backoffice/BackofficeStats.tsx`: de twee hardcoded fase-kaarten vervangen door een dynamische weergave van alle 5 fasen. Dit kan door de `statCards` array uit te breiden met de ontbrekende fasen, of door een compacte fase-balk toe te voegen.

Omvang: ~15 regels aanpassen (de statCards array r35-72).

---

## Stap 4: Link naar afspraaktool vanuit chat

In `supabase/functions/doorai-chat/index.ts`, in de bestaande `computeLinks()` functie (r562-592). Na het regionale loket-blok (r587), toevoegen:

```text
Als slots.next_step === "gesprek"
OF fase === "matchen" OF fase === "voorbereiden"
-> link: { label: "Afspraak aanvragen", href: "/profiel" }
```

Let op: de conditie voor "matchen"/"voorbereiden" overlapt met een bestaand blok op r577-579 dat events linkt. De nieuwe link is naar `/profiel`, niet naar `/events`, dus geen conflict. De dedup-logica op r589-591 (Map op href) voorkomt duplicaten automatisch.

Omvang: ~3 regels toevoegen.

---

## Overzicht alle wijzigingen

| Bestand | Wat | Omvang |
|---------|-----|--------|
| `src/components/dashboard/DashboardChat.tsx` | 0.75 naar 0.60 (r100, r159) | 2 regelwijzigingen |
| `src/pages/Chat.tsx` | 0.75 naar 0.60 (r111, r182) | 2 regelwijzigingen |
| `src/pages/Backoffice.tsx` | Alert voor fase-wijziging in generateAlertsFromProfiles() | ~8 regels toevoegen |
| `src/components/backoffice/BackofficeStats.tsx` | Alle 5 fasen tonen i.p.v. 2 | ~15 regels aanpassen |
| `supabase/functions/doorai-chat/index.ts` | Link /profiel in computeLinks() | ~3 regels toevoegen |

## Wat NIET wordt aangeraakt

- Geen nieuwe bestanden of componenten
- Geen nieuwe database tabellen of migraties
- BackofficeAlerts component (ongewijzigd, ondersteunt phase_change al)
- AppointmentTile (ongewijzigd, werkt al correct)
- actionsForNextSlot() (ongewijzigd)
- DOORAI_CORE prompt (ongewijzigd)
- homepage-coach edge function (ongewijzigd)
- PublicChatWidget (ongewijzigd)
- Phase detector engine (ongewijzigd)
- Knowledge blocks (ongewijzigd)

## Volgorde van implementatie

De stappen zijn onafhankelijk en kunnen parallel worden uitgevoerd. Geen onderlinge afhankelijkheden.

