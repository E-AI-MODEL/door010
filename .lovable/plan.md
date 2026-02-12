

## Versleepbare profieltegels

### Wat wordt er gebouwd?
De tegels op de profielpagina worden versleepbaar, zodat gebruikers ze in een volgorde kunnen zetten die voor hen prettig is. De gekozen volgorde wordt opgeslagen in de database zodat het onthouden wordt tussen sessies.

### Hoe werkt het voor de gebruiker?
- Elke tegel krijgt een klein sleepicoon (griphandle) in de header
- Door te klikken en slepen kan de gebruiker tegels omhoog/omlaag verplaatsen
- De nieuwe volgorde wordt automatisch opgeslagen
- Bij een volgend bezoek staat alles nog op dezelfde plek

### Aanpak

**1. Database: volgorde opslaan**
- Een nieuw veld `tile_order` (JSON array) toevoegen aan de `profiles` tabel
- Hierin wordt de volgorde als lijst van tegel-ID's opgeslagen, bijv. `["personal","sector","phase","test","cv","notes","vacancies","events","appointment","timeline"]`

**2. Reorder met framer-motion (geen extra pakket nodig)**
- `framer-motion` heeft een ingebouwde `Reorder.Group` en `Reorder.Item` API
- De tegels worden als een verticale lijst gerenderd (in plaats van een CSS grid), waarbinnen de gebruiker kan slepen
- Elke tegel wordt gewrapped in een `Reorder.Item` component
- Op mobiel wordt de lijst single-column, op desktop blijft het visueel compact via CSS columns of een flex-wrap layout

**3. Tegel-registratie**
- Elke tegel krijgt een unieke string-ID (bijv. `"personal"`, `"sector"`, `"notes"`)
- Een configuratie-array koppelt elke ID aan het bijbehorende React-component
- De volgorde uit de database bepaalt de render-volgorde

**4. Automatisch opslaan**
- Bij elke herschikking wordt de nieuwe volgorde met een korte debounce naar de `profiles` tabel geschreven
- Geen extra "opslaan" actie nodig: het gebeurt direct

**5. Visuele feedback**
- Een `GripVertical` icoon verschijnt linksboven in elke tegel-header
- Tijdens het slepen krijgt de tegel een lichte schaduw en schaalvergroting
- Andere tegels schuiven vloeiend op via framer-motion animatie

---

### Technische details

**Database migratie:**
```sql
ALTER TABLE profiles ADD COLUMN tile_order jsonb DEFAULT NULL;
```

**Render-logica (pseudocode):**
```typescript
import { Reorder } from "framer-motion";

const defaultOrder = ["personal","sector","phase","test","cv","notes","vacancies","events","appointment","timeline"];

const tileComponents = {
  personal: <PersonalInfoTile />,
  sector: <SectorTile />,
  // ...
};

const [order, setOrder] = useState(profile.tile_order ?? defaultOrder);

<Reorder.Group axis="y" values={order} onReorder={handleReorder}>
  {order.map(id => (
    <Reorder.Item key={id} value={id}>
      {tileComponents[id]}
    </Reorder.Item>
  ))}
</Reorder.Group>
```

**Bestanden die worden aangepast/aangemaakt:**
- `profiles` tabel: nieuw `tile_order` veld (migratie)
- `src/pages/Profile.tsx`: refactor grid naar `Reorder.Group`, tegel-configuratie, opslaan logica
- `src/integrations/supabase/types.ts`: wordt automatisch bijgewerkt

**Beperking:** `Reorder.Group` werkt het best op een enkele as (verticaal). Voor een multi-kolom grid-layout met vrije positie-swap zou een zwaardere library nodig zijn (bijv. `dnd-kit`). De voorgestelde aanpak gebruikt een responsive kolom-layout via CSS *binnen* de verticale sleeplijst, wat visueel hetzelfde resultaat geeft met minimale complexiteit.
