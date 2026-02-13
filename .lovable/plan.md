

## Verbeterplan BackDOORai: 18 verbeterpunten

Hieronder staan alle verbeterpunten die ik uit de code heb geidentificeerd, genummerd 1-18. De eerste 13 worden volledig uitgewerkt. Punten 14-18 zijn laag-risico verbeteringen die meegenomen worden.

---

### Deel 1: Verbeteringen 1-13 (prioriteit)

**1. Chat.tsx: Advisor-berichten tonen met ADVISEUR label**
De volledige chatpagina (`Chat.tsx`) toont advisor-berichten als gewone berichten. DashboardChat heeft al de juiste styling (paarse rand + "ADVISEUR" label). Dezelfde styling moet naar Chat.tsx.

- Bestand: `src/pages/Chat.tsx` (regels 340-360)
- Aanpassing: advisor-berichten herkennen en met accent-styling + label tonen

**2. Realtime updates in backoffice chat (AdvisorChatPanel)**
Als een kandidaat een bericht stuurt terwijl de adviseur het chatpaneel open heeft, verschijnt het pas na pagina-refresh. Supabase Realtime subscription toevoegen.

- Bestand: `src/components/backoffice/AdvisorChatPanel.tsx`
- Aanpassing: `supabase.channel()` subscription op `messages` tabel voor het actieve conversation_id
- Database: `ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;`

**3. Realtime updates in kandidaat chat (DashboardChat + Chat.tsx)**
Advisor-berichten verschijnen pas na refresh bij de kandidaat. Realtime subscription toevoegen zodat nieuwe berichten direct binnenkomen.

- Bestanden: `src/hooks/useChatConversation.ts`, `src/components/dashboard/DashboardChat.tsx`
- Aanpassing: subscription op messages tabel voor het actieve conversation_id

**4. unread_messages dynamisch berekenen**
In `UserOverviewTable.tsx` wordt `unread_messages` getoond als badge, maar deze waarde is altijd undefined/0 -- er is geen berekening. Echte "ongelezen" berichten tellen: berichten van de kandidaat die na het laatste advisor-bericht zijn gestuurd.

- Bestand: `supabase/functions/get-profiles-with-email/index.ts`
- Aanpassing: per gebruiker de berichten tellen na het laatste advisor-bericht in hun conversation

**5. Automatisch chatbericht bij afspraak-statuswijziging**
Wanneer een adviseur een afspraak bevestigt of annuleert, wordt er automatisch een chatbericht naar de kandidaat gestuurd (bijv. "Je afspraak 'Orienteringsgesprek' is bevestigd voor 15 feb").

- Bestand: `src/components/backoffice/AppointmentsTab.tsx`
- Aanpassing: na succesvolle status-update, een message inserten in de conversation van de kandidaat

**6. TypeScript typing verbeteren -- `as any` casts verwijderen**
`CandidateDetailPanel.tsx` en `AppointmentsTab.tsx` gebruiken `(user as any).appointments` etc. Dit moet getypt worden via het `ProfileWithEmail` interface.

- Bestanden: `src/components/backoffice/UserOverviewTable.tsx` (ProfileWithEmail type), `CandidateDetailPanel.tsx`, `AppointmentsTab.tsx`
- Aanpassing: appointments, saved_events, saved_vacancies, user_notes als optionele velden toevoegen aan ProfileWithEmail

**7. Alerts uitbreiden met afspraken**
Het alert-systeem genereert alleen alerts op basis van profieldata (nieuwe aanmelding, CV upload, test). Nieuwe afspraak-aanvragen (status: pending) moeten ook als alert verschijnen.

- Bestand: `src/pages/Backoffice.tsx` (generateAlertsFromProfiles functie)
- Aanpassing: appointments uit profieldata lezen en als alert toevoegen

**8. Kandidaat fase handmatig aanpassen door adviseur**
Adviseurs moeten de fase van een kandidaat kunnen wijzigen vanuit het detailpaneel. Hiervoor is een nieuwe RLS policy nodig.

- Bestanden: `src/components/backoffice/CandidateDetailPanel.tsx`, database migratie
- Aanpassing: dropdown met fasen + update knop, nieuwe RLS UPDATE policy op profiles voor advisors

**9. Zoeken/filteren in gesprekken-tab**
De kandidatenlijst in de gesprekken-tab heeft geen zoekfunctie -- bij veel kandidaten is dit onwerkbaar.

- Bestand: `src/pages/Backoffice.tsx` (gesprekken-tab, regels 348-380)
- Aanpassing: zoekbalk toevoegen die filtert op naam

**10. Gesprekken-tab: toon laatste bericht en ongelezen indicator**
De kandidatenlijst toont alleen naam en fase, maar niet wanneer het laatste bericht was of of er ongelezen berichten zijn.

- Bestand: `src/pages/Backoffice.tsx` (gesprekken-tab)
- Aanpassing: `last_message_at` en `conversation_count` tonen per kandidaat

**11. Interne advisor-notities per kandidaat**
Er bestaan al `user_notes` (van de kandidaat zelf), maar adviseurs hebben geen eigen notitie-veld per kandidaat. Een `advisor_notes` tabel of veld toevoegen.

- Nieuwe tabel: `advisor_notes` (advisor_user_id, candidate_user_id, content, created_at)
- Bestanden: `CandidateDetailPanel.tsx`, edge function, database migratie + RLS

**12. Notificatie-indicator voor kandidaten**
Kandidaten hebben geen manier om te zien dat er een nieuw advisor-bericht of afspraakwijziging is. Een eenvoudige "ongelezen" indicator toevoegen aan het dashboard.

- Bestanden: `src/pages/Dashboard.tsx`, `src/components/layout/Header.tsx`
- Aanpassing: query voor berichten met role='advisor' na laatste bezoek, badge tonen

**13. Backoffice data-refresh knop**
Na acties (afspraak bevestigen, bericht sturen) moet de adviseur handmatig de pagina herladen. Een refresh-knop toevoegen + automatisch refreshen na bepaalde acties.

- Bestand: `src/pages/Backoffice.tsx`
- Aanpassing: refresh functie + knop in header, automatisch aanroepen na status-updates

---

### Deel 2: Verbeteringen 14-18 (laag risico, meegenomen)

**14. BackofficeStats typing fix**
`(p as any).conversation_count` in BackofficeStats vervangen door correct getypt veld.

- Bestand: `src/components/backoffice/BackofficeStats.tsx` (regel 31)
- Simpele fix na verbetering 6

**15. Gesprekken-tab: sorteren op laatste activiteit**
Kandidaten met recente berichten bovenaan tonen in plaats van willekeurige volgorde.

- Bestand: `src/pages/Backoffice.tsx`
- Aanpassing: sorteren op `last_message_at`

**16. Afspraken-tab: toon bericht van kandidaat prominenter**
Het `message` veld wordt nu als `line-clamp-1` getoond. Bij afspraken is het bericht van de kandidaat cruciale context.

- Bestand: `src/components/backoffice/AppointmentsTab.tsx`
- Aanpassing: message als apart blok tonen, niet afgeknipt

**17. CandidateDetailPanel: chat-knop prominenter**
De "Open chat" knop staat onderaan het scrollbare paneel. Een sticky knop of in de header is beter bereikbaar.

- Bestand: `src/components/backoffice/CandidateDetailPanel.tsx`
- Aanpassing: chat-knop naar de header verplaatsen

**18. Advisor identificatie in berichten**
Bij meerdere adviseurs is niet duidelijk wie welk bericht stuurde. Een `advisor_name` meesturen of afleiden uit de sessie.

- Bestanden: `AdvisorChatPanel.tsx`, `messages` metadata
- Aanpassing: advisor naam opslaan in message metadata bij insert

---

### Technische details

**Database migraties nodig:**
```sql
-- Realtime voor berichten
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Advisors mogen profielen updaten (voor fase-wijziging)
CREATE POLICY "Advisors can update profiles"
ON public.profiles FOR UPDATE
USING (has_role(auth.uid(), 'advisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Interne advisor notities tabel
CREATE TABLE public.advisor_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_user_id uuid NOT NULL,
  candidate_user_id uuid NOT NULL,
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.advisor_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advisors can manage advisor notes"
ON public.advisor_notes FOR ALL
USING (has_role(auth.uid(), 'advisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
```

**Bestanden die worden aangepast (samenvatting):**

| # | Bestand | Wijziging |
|---|---------|-----------|
| 1 | `src/pages/Chat.tsx` | Advisor styling |
| 2 | `src/components/backoffice/AdvisorChatPanel.tsx` | Realtime subscription |
| 3 | `src/hooks/useChatConversation.ts` | Realtime subscription |
| 4 | `supabase/functions/get-profiles-with-email/index.ts` | Unread count berekening |
| 5 | `src/components/backoffice/AppointmentsTab.tsx` | Auto-chatbericht |
| 6 | `src/components/backoffice/UserOverviewTable.tsx` | ProfileWithEmail type uitbreiden |
| 6 | `src/components/backoffice/CandidateDetailPanel.tsx` | as any verwijderen |
| 7 | `src/pages/Backoffice.tsx` | Alerts uitbreiden + refresh + zoeken |
| 8 | `src/components/backoffice/CandidateDetailPanel.tsx` | Fase-dropdown |
| 9-10 | `src/pages/Backoffice.tsx` | Gesprekken-tab verbeteren |
| 11 | Nieuw: `advisor_notes` tabel + UI | Interne notities |
| 12 | `src/pages/Dashboard.tsx` + `Header.tsx` | Notificatie badge |
| 13 | `src/pages/Backoffice.tsx` | Refresh-knop |
| 14-18 | Diverse kleine fixes | Typing, sorting, UI tweaks |

**Volgorde van implementatie:**
1. Database migraties eerst (realtime, RLS, nieuwe tabel)
2. Type-fixes (punt 6, 14) -- voorkomt errors bij latere wijzigingen
3. Core functionaliteit (punten 1-5, 7-8)
4. UX verbeteringen (punten 9-13)
5. Polish (punten 14-18)

**Risico-inschatting:**
- Punten 14-18 zijn puur UI/typing fixes zonder risico op data-verlies of regressie
- Punt 11 (advisor_notes) vereist een nieuwe tabel maar is geisoleerd
- Punt 8 (fase aanpassen) vereist een nieuwe RLS policy -- moet zorgvuldig zodat kandidaten niet elkaars fase kunnen wijzigen

