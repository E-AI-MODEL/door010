

# DOOR - Digitaal Onderwijsloket Onderwijsregio's Rotterdam

Een professioneel, AI-gestuurd SaaS platform in corporate/enterprise stijl (denk aan Linear, Stripe) voor de begeleiding van toekomstige onderwijsprofessionals.

---

## 🎯 Overzicht

**Doelgroep:** Kandidaten (studiekiezers, zij-instromers, overstappers) die een loopbaan in het onderwijs overwegen

**Kernbelofte:** Van eerste oriëntatie tot instroom in het onderwijs - persoonlijk begeleid door een AI-coach

---

## 📱 Fase 1: Publieke Website & AI Widget (MVP)

### Homepage
- **Hero sectie** met krachtige value proposition
- **Publieke AI Chat Widget** - eerste kennismaking met de AI-coach
- Duidelijke CTA's: "Start je oriëntatie" / "Log in"
- Sectie met succesverhalen en testimonials
- Overzicht van de klantreis (visuele stappen)
- Footer met partners en contactinfo
- allemaal te vinden in de json bestanden in de zip.

### Publieke Pagina's
- **Werken in het Onderwijs** - algemene informatie over banen, sectoren (PO/VO/MBO)
- **Vacatures** - eenvoudig overzicht met filters, scraping van Meesterbaan en werkenbij-sites
- **Events** - jaarkalender met open dagen, webinars, informatiesessies
- **Opleidingen** - basisinfo met links naar Studiekeuze123
- **Kennisbank** - FAQ, routes naar bevoegdheid, CAO-info

---

## 🔐 Fase 2: Authenticatie & Kandidaat Portal

### Registratie & Login
- Email/wachtwoord authenticatie
- Social login opties (Google, LinkedIn)
- Multi-tenant ondersteuning (voorbereiding voor andere regio's)

### Kandidaat Dashboard
- **Persoonlijk Dossier**
  - Profielgegevens (CV, skills, werkervaring, opleiding)
  - Voorkeuren (locatie, salaris, uren, sector)
  - Statusveld met klantreis-voortgang
- **Mijn Klantreis** - visuele weergave van doorlopen stappen
- **Opgeslagen vacatures en matches**
- **Afgenomen testen** (links naar externe testen)
- **Geplande events**

### AI Assistent (Ingelogd)
- Volwaardige AI-coach met geheugen van eerdere gesprekken
- Proactieve suggesties gebaseerd op profiel
- Begeleiding door de klantreis
- Alle processtappen en kennisitems moeten minimaal aan één SSOT-fase worden gekoppeld.
•	1. Interesseren (JA)
•	2. Oriënteren (JA)
•	3. Beslissen (JA)
•	4. Matchen (JA)
•	5. Voorbereiden (JA)
- alle kennis en phase detector voor gesprek en doorvragen zitten in de zip bestand 
- Escalatie naar menselijk consult mogelijk

---

## 🏢 Fase 3: Backoffice & Beheer

### Backoffice Dashboard
- **Kandidaatoverzicht** met filters en zoekfunctie
- **Individuele kandidaatpagina's** met dossier en gesprekshistorie
- **Consult planning** - inplannen van gesprekken
- **Monitoring** - triggers bij stagnerende kandidaten

### Content Management
- **Vacaturebeheer** - handmatig toevoegen + scraping overzicht
- **Events beheer** - aanmaken en publiceren
- **Kennisbank beheer** - artikelen en FAQ's

### Gebruikersbeheer (Multi-tenant)
- **Rollen:** Admin, Redacteur, Loopbaanadviseur, Auteur
- **Teams/Organisaties** - voorbereiding voor meerdere regio's
- **Uitnodigingen en permissies**

---

## 📊 Fase 4: Analytics & Optimalisatie

### Managementinformatie Dashboard
- **KPI's:** Aantal kandidaten, doorlooptijden, conversies
- **Klantreisanalyse** - waar haken mensen af?
- **Vacature-effectiviteit** - welke vacatures leiden tot sollicitaties
- **AI-coach prestaties** - kwaliteitsmetrieken

### AI Training & Monitoring
- Overzicht van AI-gesprekken voor kwaliteitscontrole
- Mogelijkheid tot bijsturen van AI-gedrag
- Signalering van hallucinaties of fouten

---

## 🎨 Design & Stijl

- **Corporate/Enterprise look** - clean, professioneel, betrouwbaar
- kijk af van onderwijs010 website en website onderwijsregio Rotterdam vo-mbo
- **Kleurenpalet:** Gedempte, professionele kleuren met accent voor Rotterdam
- **Typografie:** Duidelijk leesbaar, modern sans-serif
- **Responsief:** Desktop, tablet en mobiel
- **WCAG compliant** voor toegankelijkheid
- **Meertalig** - geautomatiseerde vertaling via AI

---

## 🔧 Technische Architectuur

### Frontend
- React met TypeScript
- Tailwind CSS voor styling
- Responsief design

### Backend (Lovable Cloud)
- Supabase voor database en authenticatie
- Multi-tenant database structuur
- Row Level Security voor datascheiding

### AI Integratie
- Lovable AI Gateway voor AI-coach
- Meerdere AI-agenten voor specialistische taken
- Opslag van conversatiehistorie

### Koppelingen
- Vacature scraping (Meesterbaan, werken-bij sites)
- Links naar externe bronnen (Onderwijsloket, Studiekeuze123)

---

## 📋 MVP Scope (Eerste Release)

1. ✅ Homepage met AI chat widget
2. ✅ Publieke pagina's (vacatures, events, kennisbank)
3. ✅ Kandidaat registratie en login
4. ✅ Persoonlijk dossier met statusveld
5. ✅ AI-coach met gesprekshistorie
6. ✅ Basis backoffice voor content en kandidaten
7. ✅ Eenvoudige managementinformatie

---

*Dit plan levert een professioneel, schaalbaar platform dat Rotterdam als pilot kan dienen en later uitbreidbaar is naar andere onderwijsregio's.*

