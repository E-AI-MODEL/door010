

# Plan: Knoplabels verlengen en informatiever maken

## Probleem
De huidige `MAX_LABEL_LEN = 26` kapt labels af tot korte, cryptische teksten. Nu de knoppen `rounded-2xl` en `break-words` ondersteunen, mogen labels gerust langer en duidelijker.

## Wijzigingen in `src/components/chat/PublicChatWidget.tsx`

### 1. MAX_LABEL_LEN verhogen
Van `26` naar `48` zodat labels meer ruimte krijgen.

### 2. Alle labels herschrijven naar duidelijke, menselijke zinnen

**Initieel (welkomstscherm):**
| Oud | Nieuw |
|-----|-------|
| Welke route past? | Welke route past bij mij? |
| Welke sector past? | Help me kiezen: PO, VO of MBO |
| Ik werk al---overstap? | Ik werk al en wil overstappen |

**Doorvragen (sector/opleiding onbekend):**
| Oud | Nieuw |
|-----|-------|
| Kies sector (PO/VO/MBO) | Help me kiezen tussen PO, VO en MBO |
| Mijn opleiding (MBO/HBO/WO) | Wat betekent mijn opleidingsniveau? |
| Ik wil PO | Ik wil naar het basisonderwijs (PO) |
| Ik heb HBO | Ik heb een HBO-diploma |

**Intent-specifiek:**
| Oud | Nieuw |
|-----|-------|
| Hoe werkt zij-instroom? | Hoe werkt zij-instroom precies? |
| Welke diploma's nodig? | Welke diploma's heb ik nodig? |
| Vacatures bij mij in buurt | Vacatures bij mij in de buurt |
| Wanneer zijn events? | Wanneer zijn er open dagen? |
| Welke route past bij mij? | Welke route past het best bij mij? |

**Navigatie:**
| Oud | Nieuw |
|-----|-------|
| Bekijk vacatures | Bekijk alle vacatures |
| Bekijk events | Bekijk aankomende events |
| Bekijk opleidingen | Bekijk opleidingsroutes |
| Kennisbank | Bekijk de kennisbank |

**CTA en overig:**
| Oud | Nieuw |
|-----|-------|
| Maak gratis profiel | Maak een gratis profiel aan |
| Vertel me de opties | Vat mijn opties samen |
| Probeer opnieuw | Kun je dat nog eens proberen? |

## Geen andere bestanden wijzigen
Alleen `src/components/chat/PublicChatWidget.tsx` wordt aangepast.

