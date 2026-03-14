## Diagnose

Het account `vis@emmauscollege.nl` bestaat in de database, maar heeft alleen de rol **candidate** — niet **superuser**. De seed-functie is waarschijnlijk eerder gedraaid voordat vis in de seed-lijst stond, of is nooit opnieuw gedraaid na de toevoeging.


| Veld             | Status             |
| ---------------- | ------------------ |
| Account bestaat  | Ja                 |
| Email bevestigd  | Ja                 |
| Wachtwoord gezet | Ja                 |
| Huidige rol      | `candidate` (fout) |
| Gewenste rol     | `admin`            |


## Plan

### Stap 1: Voeg admin-rol toe

Database migratie met 1 SQL statement:

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('ab70ec17-075f-40a1-8008-ef984231b8a6', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

### Stap 2: Profiel bijwerken

Het profiel moet `first_name` en `last_name` correct bevatten:

```sql
UPDATE public.profiles
SET first_name = 'Vis', last_name = 'Emmaus'
WHERE user_id = 'ab70ec17-075f-40a1-8008-ef984231b8a6'
  AND (first_name IS NULL OR first_name = '');
```

### Stap 3: Wachtwoord resetten naar admin010

Via de seed edge function aanroepen (alleen voor vis), of via een kleine migratie is dit niet mogelijk — wachtwoord reset vereist de `seed-admin-users` edge function. Ik roep die functie aan na de migratie.

### Resultaat

Na deze fix kun je inloggen met `vis@emmauscollege.nl` / `admin010` en word je automatisch doorgestuurd naar `/backoffice`.