# Unified Chat Overlay — Eén popup voor alle ingelogde chat

## Probleem

Er zijn nu 3 chat-implementaties: `PublicChatWidget` (homepage), `DashboardChat` (dashboard-embedded), en `Chat.tsx` (full page). De laatste twee gebruiken dezelfde backend maar hebben divergerende code (~1100 regels duplicaat). Dit veroorzaakt bugs en inconsistenties.

## Voorstel

Vervang `DashboardChat` en `Chat.tsx` door **één universele chat-overlay** die als floating popup werkt — vergelijkbaar met de huidige `PublicChatWidget` maar met alle DoorAI-functionaliteit (fase-detectie, intake, links, reflectie).

```text
┌──────────────────────────────────┐
│  Header + pagina-inhoud          │
│                                  │
│                          ┌──────┐│
│                          │ 💬   ││  ← FAB knop (rechtsonder)
│                          └──────┘│
└──────────────────────────────────┘

Klik → popup opent:
┌─────────────────────────┐
│ DOORai            ─ □ ✕ │  ← minimize / resize / close
├─────────────────────────┤
│ [msg 1]                 │  ← max 4 zichtbaar
│ [msg 2]                 │  ← rest scrollbaar
│ [msg 3]                 │
│ [msg 4]                 │
├─────────────────────────┤
│ [intake / actions]      │
│ [input]          [send] │
└─────────────────────────┘
```

## Architectuur

### Wat verdwijnt

- `src/pages/Chat.tsx` — **verwijderen**, route `/chat` redirect naar `/dashboard`
- `src/components/dashboard/DashboardChat.tsx` — **verwijderen**
- Dashboard embed van DashboardChat — vervangen door de overlay

### Wat blijft

- `PublicChatWidget` — blijft bestaan voor **niet-ingelogde** bezoekers (homepage-coach backend)
- Wanneer ingelogd: `PublicChatWidget` verbergt zichzelf, de nieuwe `AuthenticatedChatOverlay` neemt over
- De ingelogde gebruiker kan op 1 plek switchen tussen beide chatbots algmeen / persoonlijk

### Nieuw component: `AuthenticatedChatOverlay`

Eén component dat globaal in `App.tsx` wordt gerenderd (naast `PublicChatWidget`), met:

- **Alle DoorAI-functionaliteit**: fase-detectie, intake, links, reflectie, phase-confirmation
- **Popup UI**: floating panel rechtsonder, resizable (compact/expanded)
- **Max 4 berichten zichtbaar**, rest scrollbaar
- **Persistent across pages**: navigeer naar `/vacatures`, `/events`, etc. — chat blijft open
- **FAB-knop** op alle pagina's (behalve `/backoffice`)

### Dashboard aanpassing

Het dashboard verliest de embedded chat. In plaats daarvan:

- `TopicMenu` stuurt berichten naar de overlay via een global event (`window.dispatchEvent`)
- Het dashboard focust op `PhaseProgress`, `TopicMenu`, en `ProfileCard`
- De overlay opent automatisch als er een `chatMessageTrigger` is

### Stream-logica

De stream-parsing, SSE-event handling, intake/phase/reflection logica wordt direct in het nieuwe component gebouwd — één enkele implementatie, geen duplicatie meer. Alle fixes uit het eerdere plan (phase-update alleen na bevestiging, contextbewuste intake, effectieve links) worden hier meteen correct geïmplementeerd.

## Bestanden


| Bestand                                            | Actie                                                                |
| -------------------------------------------------- | -------------------------------------------------------------------- |
| `src/components/chat/AuthenticatedChatOverlay.tsx` | **Nieuw** — unified popup chat met alle DoorAI features              |
| `src/App.tsx`                                      | Voeg `AuthenticatedChatOverlay` toe naast `PublicChatWidget`         |
| `src/pages/Chat.tsx`                               | **Verwijderen**                                                      |
| `src/components/dashboard/DashboardChat.tsx`       | **Verwijderen**                                                      |
| `src/pages/Dashboard.tsx`                          | Verwijder DashboardChat import, TopicMenu stuurt events naar overlay |
| `src/App.tsx`                                      | Verwijder `/chat` route (of redirect naar `/dashboard`)              |


## Belangrijke details

- **Resize**: twee standen — compact (380×500px) en expanded (480×680px), toggle via knop
- **Max 4 berichten**: container height beperkt, `overflow-y: auto` voor scroll
- **Phase-update**: alleen via `handlePhaseAccept`, nooit automatisch
- **Intake**: contextbewust vanuit backend (`intake_question` + `slot_chips`), ook mid-gesprek
- **Links**: alleen wanneer effectief (intent-based), geen vaste frequentie
- **Reflectie**: `event: reflection` handler met subtiele waarschuwing