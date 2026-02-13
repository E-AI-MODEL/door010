

## Mobiele optimalisatie BackDOORai

Op basis van de screenshot en de code-analyse zijn dit de hoofdproblemen op mobiel:

### Problemen geidentificeerd

1. **Backoffice header**: Knoppen "Vernieuwen" en "Uitloggen" overlappen met de titel op smalle schermen
2. **Stats grid**: 6-koloms grid op desktop, 2-koloms op mobiel -- dit werkt al redelijk maar neemt veel ruimte in
3. **TabsList**: 4 tabs met iconen en tekst passen niet horizontaal, waardoor horizontal scroll nodig is
4. **UserOverviewTable**: De `<Table>` met 6 kolommen (Kandidaat, Contact, Fase, Documenten, Laatste activiteit, Acties) is veel te breed voor mobiel
5. **Overzicht-tab layout**: `lg:grid-cols-3` grid toont tabel + detailpaneel naast elkaar op desktop, maar op mobiel staat het detailpaneel onder de tabel (onzichtbaar zonder scrollen)
6. **Gesprekken-tab**: `lg:grid-cols-4` layout met kandidatenlijst + chatpaneel -- op mobiel staan beide onder elkaar
7. **AppointmentsTab**: Tabel met 6 kolommen is onleesbaar op mobiel
8. **CandidateDetailPanel**: Wordt op mobiel niet als overlay getoond, waardoor je moet scrollen voorbij de tabel

### Oplossingen

**A. Backoffice header compact op mobiel**
- Op mobiel: icoon-only knoppen (geen tekst "Vernieuwen"/"Uitloggen"), kleinere padding

**B. TabsList scrollbaar maken**
- `overflow-x-auto` toevoegen aan TabsList wrapper
- Op mobiel: korte labels zonder iconen, of icoon-only

**C. UserOverviewTable omzetten naar kaart-layout op mobiel**
- Gebruik `useIsMobile()` hook
- Op mobiel: render elke kandidaat als een compact kaartje in plaats van tabelrij
- Kaartje bevat: naam, fase-badge, documenten-iconen, laatste activiteit, chat-knop

**D. CandidateDetailPanel als Sheet/Drawer op mobiel**
- Op mobiel: wanneer een kandidaat wordt geselecteerd, toon het detailpaneel als een bottom-up `Sheet` (half-screen overlay)
- Hierdoor hoeft de gebruiker niet te scrollen en kan het paneel snel gesloten worden

**E. AdvisorChatPanel als fullscreen overlay op mobiel**
- Op mobiel: wanneer een chat geopend wordt, toon deze als fullscreen Sheet
- Terug-knop om naar de lijst te gaan

**F. AppointmentsTab als kaarten op mobiel**
- Zelfde aanpak als de UserOverviewTable: op mobiel kaarten in plaats van tabel
- Elke kaart toont kandidaat, onderwerp, datum, status, acties

**G. Gesprekken-tab: mobiele navigatie**
- Op mobiel: toon eerst de kandidatenlijst, en bij selectie navigeer naar de fullscreen chat
- Terug-knop om terug te gaan naar de lijst

---

### Technische aanpak

| # | Bestand | Wijziging |
|---|---------|-----------|
| A | `src/pages/Backoffice.tsx` | Header: icoon-only knoppen op mobiel, TabsList scrollable |
| B | `src/pages/Backoffice.tsx` | TabsList: `overflow-x-auto`, compactere triggers |
| C | `src/components/backoffice/UserOverviewTable.tsx` | Mobiele kaart-view met `useIsMobile()` |
| D | `src/pages/Backoffice.tsx` | CandidateDetailPanel wrappen in `Sheet` op mobiel |
| E | `src/pages/Backoffice.tsx` | AdvisorChatPanel wrappen in `Sheet` op mobiel |
| F | `src/components/backoffice/AppointmentsTab.tsx` | Mobiele kaart-view |
| G | `src/pages/Backoffice.tsx` | Gesprekken-tab: conditie voor mobiel (lijst of chat) |

Alle wijzigingen gebruiken de bestaande `useIsMobile()` hook uit `src/hooks/use-mobile.tsx` en de bestaande `Sheet` component uit `src/components/ui/sheet.tsx`. Geen nieuwe dependencies nodig.

