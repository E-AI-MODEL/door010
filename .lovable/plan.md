
# Plan: Dashboard Personalisatie en Backoffice Integratie

Dit plan beschrijft de uitbreidingen van het gebruikersdashboard en de verbinding met het backoffice systeem.

---

## Deel 1: Verwijderen AI Widget Sectie (Eenvoudig)

De `AIWidgetSection` op de homepage kan veilig worden verwijderd. De floating chat-widget (`PublicChatWidget`) biedt dezelfde functionaliteit en is al globaal beschikbaar.

**Wijzigingen:**
- `src/pages/Index.tsx`: Import en gebruik van `AIWidgetSection` verwijderen

**Geen risico**: De widget-functionaliteit blijft werken via de floating button.

---

## Deel 2: Database Uitbreidingen

### Nieuwe velden in `profiles` tabel:
```text
avatar_url     | text    | URL naar profielfoto
cv_url         | text    | URL naar CV document  
bio            | text    | Korte introductie
test_completed | boolean | Is de interessetest afgerond
test_results   | jsonb   | Resultaten van de interessetest
```

### Nieuwe Storage Bucket:
- Bucket naam: `user-uploads`
- Structuur: `{user_id}/avatar.{ext}` en `{user_id}/cv.{ext}`
- RLS: Gebruikers kunnen alleen eigen bestanden beheren, adviseurs kunnen lezen

---

## Deel 3: Dashboard Uitbreidingen

### A. Profiel Sectie (bovenaan)
- Avatar upload met preview
- Naam en voortgangspercentage
- Snelle link naar profiel bewerken

### B. CV Upload Functie
- Drag-and-drop PDF upload
- Status badge (Geupload/Ontbreekt)
- Adviseur kan CV bekijken

### C. Interesse/Persoonlijkheidstest
- Interactieve vragenlijst (8-12 vragen)
- Resultaten opslaan in `test_results`
- Sectoraanbevelingen op basis van antwoorden

### D. Persoonlijke Feed
- Aanbevelingen gebaseerd op:
  - Huidige fase
  - Gekozen sector
  - Testresultaten
- Relevante vacatures, events, opleidingen

---

## Deel 4: Profile Pagina Uitbreidingen

Toevoegen aan `src/pages/Profile.tsx`:
- Avatar upload component met crop-functionaliteit
- CV upload met preview
- Optie om interessetest te starten/herhalen
- Overzicht van ingevulde gegevens

---

## Deel 5: Backoffice Integratie

### Kandidaatweergave uitbreiden:
- Avatar thumbnail in tabel
- CV download knop
- Test status indicator (voltooid/niet voltooid)
- Testresultaten bekijken (modal)

### Alerts toevoegen voor:
- Kandidaat heeft CV geupload
- Kandidaat heeft interessetest afgerond
- Kandidaat is van fase veranderd

### RLS Policies:
- Adviseurs krijgen leestoegang tot `avatar_url`, `cv_url`, `test_results`
- Storage policies voor adviseurs om bestanden te kunnen downloaden

---

## Technische Details

### Storage Bucket Setup (SQL):
```text
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-uploads', 'user-uploads', false);

-- RLS policies voor eigen bestanden beheren
-- RLS policies voor adviseurs om te kunnen lezen
```

### Database Migratie:
```text
ALTER TABLE profiles ADD COLUMN avatar_url text;
ALTER TABLE profiles ADD COLUMN cv_url text;
ALTER TABLE profiles ADD COLUMN bio text;
ALTER TABLE profiles ADD COLUMN test_completed boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN test_results jsonb DEFAULT '{}'::jsonb;
```

### Benodigde nieuwe componenten:
1. `src/components/profile/AvatarUpload.tsx`
2. `src/components/profile/CVUpload.tsx`  
3. `src/components/profile/InterestTest.tsx`
4. `src/components/dashboard/PersonalFeed.tsx`

---

## Implementatie Volgorde

1. Database migratie uitvoeren (nieuwe velden + storage bucket)
2. AIWidgetSection verwijderen van homepage
3. Upload componenten bouwen (Avatar + CV)
4. Profile pagina uitbreiden met nieuwe functionaliteit
5. Interessetest component bouwen
6. Dashboard uitbreiden met feed en nieuwe cards
7. Backoffice uitbreiden met kandidaat-details
8. RLS policies aanpassen voor adviseur-toegang
9. End-to-end testen van volledige flow
