

# Plan: Test-account + Professionele profielpagina met dynamische tijdlijn

## Deel 1: Test-account toevoegen

Het `seed-admin-users` edge function wordt uitgebreid met:

| Email | Wachtwoord | Rol | Profiel |
|-------|-----------|-----|---------|
| `test1@doorai.nl` | `admin010` | candidate | first_name: "Test1", last_name: "DOOR", current_phase: "interesseren" |

---

## Deel 2: Gele kleur verwijderen uit kleurenpalet

In `dashboard-phases.ts` staat `bg-amber-500` als kleur voor de "interesseren" fase. Deze past niet bij het Rotterdam Groen / Magenta designsysteem. Alle fasekleuren worden aangepast naar tinten die binnen het palet vallen:

| Fase | Oud | Nieuw |
|------|-----|-------|
| Interesseren | `bg-amber-500` (geel) | `bg-primary` (Rotterdam Groen) |
| Orienteren | `bg-blue-500` | `bg-door-teal` of `bg-emerald-600` |
| Beslissen | `bg-primary` | `bg-primary` (blijft) |
| Matchen | `bg-purple-500` | `bg-accent` (Magenta) |
| Voorbereiden | `bg-emerald-500` | `bg-emerald-700` (donkerder groen voor contrast) |

Hierdoor gebruikt het hele platform alleen Rotterdam Groen en Magenta varianten -- geen losstaande kleuren meer.

---

## Deel 3: Profielpagina redesign

### Nieuwe componenten

**A. ProfileHero -- visuele header met completheid**

Vervangt de huidige simpele groene balk. Toont:
- Grotere avatar (centraal, 96px)
- Naam + fase-badge + sector-badge
- Voortgangsbalk "Profiel compleetheid" met percentage

Berekening compleetheid (gewogen):
- Naam ingevuld: 20%
- Telefoon: 10%
- Bio: 10%
- Sector gekozen: 20%
- Interessetest voltooid: 20%
- CV geupload: 20%

**B. ProfileTimeline -- dynamische verticale tijdlijn**

Verticale tijdlijn die de 5 fasen visualiseert met real-time data:

```text
  (v) Interesseren     [voltooid - checkmark]
   |
  (*) Orienteren       [huidige fase - primary kleur, actief]
   |   > "3 gesprekken gevoerd"
   |   > "Sector: VO"
   |   > Tip: "Vergelijk voltijd en deeltijd"
   |
  ( ) Beslissen        [nog niet bereikt - grijs]
   |
  ( ) Matchen          [vergrendeld - grijs]
   |
  ( ) Voorbereiden     [vergrendeld - grijs]
```

Per fase:
- Voltooide fasen: checkmark, korte samenvatting
- Huidige fase: primary kleur, dynamische info uit profiel + gesprekscount (query op `conversations` tabel)
- Toekomstige fasen: subtiel grijs met preview van wat er komt
- Tips uit bestaande `dashboard-phases.ts` SSOT data

**C. ProfileCompleteness -- losse voortgangscomponent**

Herbruikbare balk met segmenten per categorie, gebruikt in de ProfileHero.

### Layout herindeling

Desktop: 2-kolom layout

```text
Links (40%):                Rechts (60%):
+---------------------+    +-----------------------------+
| ProfileHero         |    | Dynamische Tijdlijn         |
| - Avatar            |    | - 5 fasen verticaal         |
| - Naam/badges       |    | - Chat-stats per fase       |
| - Compleetheid %    |    | - Tips en acties            |
+---------------------+    +-----------------------------+
| Persoonlijke        |
| gegevens formulier  |
| (naam, tel, bio)    |
+---------------------+
| Sector keuze        |
+---------------------+
| CV Upload           |
+---------------------+
| Interessetest       |
+---------------------+
```

Mobiel: gestapeld (hero, tijdlijn, formulier, rest).

### Stijlverbeteringen

- `rounded-3xl` voor hoofdkaarten (conform branding richtlijn)
- Subtiele gradient achtergronden in plaats van vlakke kleuren
- Framer Motion staggered animaties voor kaarten en tijdlijn-nodes
- Geen geel meer -- alleen Rotterdam Groen en Magenta tinten
- Consistente `shadow-door` schaduw op kaarten
- Professionelere typografie: sectietitels met `tracking-wide uppercase` stijl (zoals al op het dashboard)

---

## Technische details

### Nieuwe bestanden

| Bestand | Doel |
|---------|------|
| `src/components/profile/ProfileTimeline.tsx` | Verticale fase-tijdlijn met dynamische data |
| `src/components/profile/ProfileHero.tsx` | Hero-sectie met avatar, badges, completheid |
| `src/components/profile/ProfileCompleteness.tsx` | Voortgangsbalk component |

### Gewijzigde bestanden

| Bestand | Wijziging |
|---------|-----------|
| `supabase/functions/seed-admin-users/index.ts` | test1@doorai.nl toevoegen |
| `src/data/dashboard-phases.ts` | Geel (amber) vervangen door on-brand kleuren |
| `src/pages/Profile.tsx` | Volledige layout herindeling met nieuwe componenten |

### Data die de tijdlijn gebruikt

- `profiles` tabel: current_phase, preferred_sector, test_completed, test_results, cv_url
- `conversations` tabel: COUNT(*) per user_id voor "aantal gesprekken"
- `dashboard-phases.ts`: fase-titels, tips, acties (bestaande SSOT)

