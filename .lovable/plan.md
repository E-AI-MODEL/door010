
# A/B Test Onboarding: Pop-up, Testinfo & Auto-login

## Overzicht

Drie onderdelen worden gebouwd:

1. **Blocking pop-up op de homepage** -- verschijnt bij eerste bezoek, toont uitleg over de A/B test en wijst een uniek testaccount toe (test2-test30). Gebruiker kan pas verder na inloggen.
2. **"Testinfo" knop in de header** -- altijd zichtbaar, opent een modal met dezelfde uitleg maar zonder logingegevens.
3. **Testaccount toewijzing** -- per apparaat wordt een account (test2-test30) toegewezen via `localStorage` en blijft bij terugkomen hetzelfde.

---

## Technische details

### Nieuw bestand: `src/components/onboarding/TestOnboardingPopup.tsx`

- Blocking dialog (AlertDialog, geen close-mogelijkheid behalve via de CTA).
- Toont de 5 tekstblokken uit het plan (Hallo, Wat test je, A/B uitleg, Placeholders, Jouw testlogin).
- Account toewijzing: kiest random getal 2-30, slaat op in `localStorage` key `doorai_test_account_index`. Bij terugkomen wordt hetzelfde getal opgehaald.
- "Kopieer email" en "Kopieer wachtwoord" knoppen (navigator.clipboard).
- CTA "Start met testen (log in)" roept `signIn(email, password)` aan uit AuthContext en navigeert naar `/dashboard`.
- Zichtbaarheidslogica: alleen tonen als `localStorage` key `doorai_onboarding_seen` niet `"true"` is EN gebruiker niet ingelogd is.
- Na succesvol inloggen wordt `doorai_onboarding_seen` op `"true"` gezet.
- ScrollArea voor de lange tekst zodat het op kleinere schermen ook werkt.

### Nieuw bestand: `src/components/onboarding/TestInfoModal.tsx`

- Gewone Dialog component.
- Toont dezelfde tekstblokken als de pop-up, maar zonder Blok 5 (logingegevens).
- Wordt getriggerd vanuit de Header.

### Wijziging: `src/components/layout/Header.tsx`

- Import `TestInfoModal` en `Info` icon van lucide.
- Voeg een "Testinfo" knop toe in de desktop navigatie (rechts, naast login/dashboard knoppen).
- Voeg dezelfde knop toe in het mobiele menu.
- State `testInfoOpen` voor het openen/sluiten van de modal.

### Wijziging: `src/pages/Index.tsx`

- Import en render `TestOnboardingPopup` component.
- De pop-up verschijnt bovenop de homepage content.

### Geen database wijzigingen nodig

- Account toewijzing is puur client-side via localStorage.
- De testaccounts (test2-test30@doorai.nl) moeten wel bestaan in de auth database -- dit valt buiten scope van de code maar moet handmatig of via seed worden aangemaakt.

---

## Bestanden

| Bestand | Actie |
|---------|-------|
| `src/components/onboarding/TestOnboardingPopup.tsx` | Nieuw |
| `src/components/onboarding/TestInfoModal.tsx` | Nieuw |
| `src/components/layout/Header.tsx` | Wijzigen (Testinfo knop) |
| `src/pages/Index.tsx` | Wijzigen (pop-up toevoegen) |

---

## Gedeelde tekst-constanten

Beide modals delen dezelfde tekstblokken. De tekst wordt als constanten gedefinieerd in de pop-up component en geexporteerd zodat de TestInfoModal dezelfde content kan hergebruiken (minus blok 5).
