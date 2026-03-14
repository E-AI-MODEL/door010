## Diagnose

Er zijn drie afzonderlijke problemen:

### 1. Chat suggestie-chips stapelen op

In zowel `PublicChatWidget` als `AuthenticatedChatOverlay` worden actie-chips (ResponseActions) getoond op basis van de **laatst gevonden** `primaryFollowup` in de berichtenlijst. Wanneer een nieuw assistant-bericht binnenkomt zonder eigen followup, valt de memo terug op de vorige beurt. Hierdoor blijven oude chips zichtbaar.

**Fix**: Bij het starten van een nieuwe beurt de `primaryFollowup` van alle eerdere berichten wissen. Alleen het allerlaatste assistant-bericht mag een followup hebben.

### 2. Add-on override bibliotheek met toggles

De huidige Superuser tab werkt al met meerdere add-ons per bot, maar het is niet duidelijk genoeg als bibliotheek. De gebruiker wil:

- Elke override permanent opgeslagen als item in een lijst
- Per item een toggle aan/uit
- Verwijderen is optioneel, niet verplicht
- Dezelfde opzet als bij de systeemprompt-visie
- Check  of de laatste add on niet een vaste toevoeging is geweest op de systeem prompt van de public chat. Indien ja: herstel en zet in te maken ads om bibliotheek met toggle  aan/uit 

De huidige `SuperuserControlTab` doet dit al grotendeels, maar heeft een UX-probleem: de test-override uit de vorige sessie zit nog in de DB. De code is correct, maar de layout moet duidelijker "bibliotheek" communiceren.

**Fix**: De UI verbeteren met duidelijkere bibliotheek-header, en het filter in pipeline events vervangen door een dropdown in plaats van een vrij tekstveld.

### 3. Pipeline issues oplossen/heropenen

De `chatbot_pipeline_events` tabel mist een UPDATE RLS policy, en de UI heeft geen "markeer als opgelost" knop.

**Fix**:

- Database: voeg UPDATE policy toe voor admins
- UI: per event een resolve-toggle
- Filter op "open" standaard

## Implementatie

### Stap 1: Fix chat-chip stacking (PublicChatWidget + AuthenticatedChatOverlay)

In beide componenten, bij het starten van een nieuwe beurt (net voor het toevoegen van het lege assistant-bericht):

- Wis `primaryFollowup` van alle eerdere assistant-berichten
- In `PublicChatWidget`: aanpassen van `sendMessageWithText` om de messages state te updaten
- In `AuthenticatedChatOverlay`: zelfde in `sendMessage` en `sendGeneralMessage`

### Stap 2: Pipeline events resolve-functionaliteit

- Database migratie: `CREATE POLICY "Admins can update pipeline events" ON public.chatbot_pipeline_events FOR UPDATE USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));`
- SuperuserControlTab: resolve-knop per event, filter standaard op "open"

### Stap 3: Superuser UI verbeteringen

- Pipeline filter: dropdown (`all` / `homepage-coach` / `doorai-chat` / `open` / `resolved`) i.p.v. vrij tekstveld
- Add-on sectie: duidelijke "Override bibliotheek" header
- Bestaande test-data opschonen (homepage-coach prompt_override leegmaken)