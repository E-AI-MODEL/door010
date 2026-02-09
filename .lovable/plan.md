

# Plan: Knoppen strak en consistent maken

## Probleem
De knoppen in de chat widget wrappen nu over meerdere regels met `rounded-2xl` en `break-words`, wat lelijke, ongelijke pill-vormen oplevert. De set oogt rommelig en inconsistent.

## Oplossing
Knoppen worden altijd 1 regel hoog, met vaste hoogte en nette afkapping via `truncate` + `max-w-[260px]`.

## Wijzigingen in `src/components/chat/PublicChatWidget.tsx`

### 1. baseClass vervangen (regel 527)

**Oud:**
```
px-3 py-2 text-sm rounded-2xl transition-colors border leading-snug text-center whitespace-normal break-words max-w-[220px]
```

**Nieuw:**
```
px-4 py-2 text-sm rounded-full transition-colors border h-10 inline-flex items-center justify-center
```

- `h-10` zorgt voor gelijke hoogte
- `rounded-full` werkt weer netjes bij 1 regel
- `inline-flex items-center justify-center` voor nette centrering
- Weg: `whitespace-normal`, `break-words`, `max-w-[220px]`, `leading-snug`, `text-center`

### 2. Label-tekst wrappen in truncate-span
Alle drie de button-varianten (ask, Link, a) krijgen de label in:
```html
<span className="max-w-[260px] truncate">{action.label}</span>
```

Dit geldt voor:
- **ask-knop** (regel 538): `{action.label}` wordt `<span ...>`
- **Link** (regel 553): `{action.label}` wordt `<span ...>`
- **a** (regel 567): `{action.label}` wordt `<span ...>`

## Resultaat
- Altijd gelijke hoogte (h-10)
- Pill-vorm blijft mooi (1 regel)
- Langere teksten worden netjes afgekapt met "..."
- Geen rare multi-line pill blobs meer

## Alleen dit bestand wijzigt
`src/components/chat/PublicChatWidget.tsx` -- alleen het actions-renderblok (regels 527-569).
