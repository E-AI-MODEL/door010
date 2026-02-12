

## BackDOORai: Van mock naar echt

### Overzicht
Alle mock data en placeholders in de backoffice worden vervangen door echte database-verbindingen. Dit raakt 4 componenten en 1 edge function.

---

### Stap 1: Backoffice.tsx -- Mock data verwijderen

**Probleem:** 85 regels hardcoded mockProfiles, fallback naar mock bij elke fout.

**Oplossing:**
- Verwijder het volledige `mockProfiles` array
- Verwijder de fallback `setProfiles(mockProfiles)` op 4 plekken
- Toon een lege staat of foutmelding als de API faalt (in plaats van nep-data)
- Verwijder de random `last_activity` en `unread_messages` enrichment die nu aan echte profielen worden toegevoegd

---

### Stap 2: AdvisorChatPanel -- Echte gesprekken laden

**Probleem:** Toont altijd 3 dezelfde nep-berichten, verstuurt niks naar de database.

**Oplossing:**
- Bij selectie van een kandidaat: query `conversations` + `messages` tabellen voor die `user_id`
- Toon echte berichten uit de database (user + assistant + advisor berichten)
- Bij verzenden: insert een echt bericht in de `messages` tabel met `role: 'advisor'`
- Hiervoor is een nieuw RLS-beleid nodig zodat adviseurs berichten kunnen inserten in andermans gesprekken
- Als een kandidaat nog geen conversation heeft, toon "Nog geen gesprekken" (echte lege staat)

**Database wijzigingen:**
- Nieuwe RLS policy op `messages`: advisors/admins mogen INSERT op alle conversations
- Nieuwe RLS policy op `conversations`: advisors/admins mogen INSERT (om eventueel een nieuw gesprek te starten)

---

### Stap 3: BackofficeAlerts -- Alerts uit echte data genereren

**Probleem:** 6 hardcoded nep-alerts met fictieve namen.

**Oplossing:** Alerts worden dynamisch gegenereerd uit echte database-activiteit:
- **Nieuwe aanmelding**: profielen aangemaakt in de laatste 7 dagen
- **Fasewijziging**: profielen waar `current_phase` recent is gewijzigd (op basis van `updated_at`)
- **CV geupload**: profielen met een `cv_url` die recent is ingevuld
- **Test voltooid**: profielen waar `test_completed` recent op `true` is gezet

De alerts worden opgebouwd in de `Backoffice.tsx` pagina op basis van de opgehaalde profieldata en doorgegeven als props (geen aparte tabel nodig voor nu).

---

### Stap 4: BackofficeStats -- Echte statistieken

**Probleem:** "Actief vandaag" is `Math.floor(profiles.length * 0.3)` -- compleet verzonnen.

**Oplossing:**
- Verwijder de fake "activeToday" berekening
- Vervang door "Met gesprek" (kandidaten die minimaal 1 conversation hebben) -- dit vereist dat de edge function het aantal conversations per profiel meestuurt
- Of vervang door een andere echte metric zoals "CV geupload" of "Test gedaan"

---

### Stap 5: Edge function uitbreiden

De `get-profiles-with-email` edge function wordt uitgebreid om extra data mee te sturen:
- Aantal conversations per kandidaat
- Datum van laatste bericht (voor "laatste activiteit")
- Of de kandidaat ongelezen advisor-berichten heeft

---

### Technische details

**Database migraties (RLS policies):**
```sql
-- Advisors kunnen berichten inserten in alle conversations
CREATE POLICY "Advisors can insert messages"
ON public.messages FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'advisor'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Advisors kunnen conversations aanmaken voor gebruikers
CREATE POLICY "Advisors can create conversations"
ON public.conversations FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'advisor'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
);
```

**Edge function uitbreiding (get-profiles-with-email):**
- Query `conversations` tabel: count per user_id
- Query `messages` tabel: laatste bericht datum per conversation
- Voeg `conversation_count`, `last_message_at` toe aan response

**Bestanden die worden aangepast:**
- `supabase/functions/get-profiles-with-email/index.ts` -- extra queries
- `src/pages/Backoffice.tsx` -- mock data verwijderen, alerts genereren
- `src/components/backoffice/AdvisorChatPanel.tsx` -- volledig herschrijven met echte DB queries
- `src/components/backoffice/BackofficeAlerts.tsx` -- alerts als props ontvangen i.p.v. hardcoded
- `src/components/backoffice/BackofficeStats.tsx` -- fake metric vervangen
- Database migratie voor nieuwe RLS policies

### Complexiteit
Dit is een middelgroot project: ~4-5 bestanden, 2 RLS policies, 1 edge function update. De kernlogica (Supabase queries, RLS) is recht-toe-recht-aan. Het meeste werk zit in het herschrijven van AdvisorChatPanel naar echte database-interactie.

