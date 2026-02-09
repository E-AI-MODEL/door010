

# Plan: Chat onderste balk opschonen

## Probleem
De screenshot toont twee problemen:
1. **Actieknoppen** ("Lesgeven", "Begeleiding", "Vakexpertise") staan links uitgelijnd zonder context -- het is onduidelijk wat ze betekenen
2. **Uitlijning** verschilt: knoppen zitten in een `px-4` container, het invoerveld in een `container max-w-3xl` -- daardoor staan ze niet op dezelfde breedte

## Oplossing

### 1. Label toevoegen boven actieknoppen
Een subtiel label "Snel starten:" (of vergelijkbaar) boven de knoppen zodat duidelijk is dat het suggesties zijn.

### 2. Uitlijning gelijktrekken
De `ChatActions` component krijgt dezelfde `container max-w-3xl mx-auto` wrapper als het invoerveld, zodat alles op dezelfde breedte staat.

### 3. Visuele samenhang
- Actieknoppen en invoerveld delen dezelfde `border-t` -- vervangen door een enkele gecombineerde footer-sectie
- Knoppen centreren op dezelfde breedte als het invoerveld

## Technische details

### `src/components/chat/ChatActions.tsx`
- Voeg een klein label toe: `<p className="text-xs text-muted-foreground mb-2">Snel starten</p>`
- Wrap in `container max-w-3xl mx-auto` voor uitlijning

### `src/pages/Chat.tsx`
- Combineer de actions en input in een enkele footer-`div` met gedeelde `border-t`, zodat er geen dubbele border ontstaat
- Verwijder de aparte `border-t` van `ChatActions`

### Bestanden die wijzigen
| Bestand | Wijziging |
|---------|-----------|
| `src/components/chat/ChatActions.tsx` | Label + container uitlijning |
| `src/pages/Chat.tsx` | Footer samengevoegd, enkele border |

