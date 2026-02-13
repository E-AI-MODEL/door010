const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ══════════════════════════════════════════════════════════════════════
// META CHAT COORDINATOR — Dynamische contextorkestratie
// ══════════════════════════════════════════════════════════════════════

// ── A. Knowledge Resolver ─────────────────────────────────────────────
// Compacte kennisblokken samengevat uit SSOT JSON-bestanden.
// Max 50-80 woorden per blok.
const KNOWLEDGE_BLOCKS: Record<string, string> = {
  // Rollen per sector
  "lesgeven_po": "Leraar PO: je draagt verantwoordelijkheid voor een klas op de basisschool (groep 1-8). Je geeft alle vakken. Een Pabo-diploma of zij-instroom PO-traject is vereist voor bevoegdheid.",
  "lesgeven_vo": "Leraar VO: je geeft les in een specifiek vak op de middelbare school. Voor onderbouw/vmbo is een tweedegraads bevoegdheid nodig (4 jr hbo). Voor bovenbouw havo/vwo een eerstegraads (universitaire master + lerarenopleiding).",
  "lesgeven_mbo": "Docent MBO: je geeft theorie- en/of praktijklessen aan studenten in beroepsopleidingen. Een PDG (Pedagogisch Didactisch Getuigschrift, 1-2 jr) is vereist. Vakkennis uit de praktijk is een groot pluspunt.",
  "vakexpertise_po": "Vakspecialist PO: je zet je expertise in op basisscholen (bijv. muziek, techniek, beweging). Een hbo-diploma in je vakgebied is vaak voldoende. Voor een vaste aanstelling is een bevoegdheid aanbevolen.",
  "vakexpertise_vo": "Vakleerkracht VO: je geeft les in je eigen vak. Een tweedegraads of eerstegraads bevoegdheid is nodig, afhankelijk van het niveau waarop je lesgeeft.",
  "vakexpertise_mbo": "Instructeur MBO: je geeft praktijklessen vanuit je vakkennis. Geen formele bevoegdheid nodig, wel PDG (Pedagogisch Didactisch Getuigschrift) aanbevolen. Je brengt beroepservaring de klas in.",
  "begeleiding": "Onderwijsondersteuner/leerlingbegeleider: je begeleidt leerlingen bij leren, gedrag of sociaal-emotionele ontwikkeling. Denk aan mentor, zorgcoordinator, RT-er of onderwijsassistent. De eisen verschillen per functie en sector.",
  // Routes
  "route_pabo": "Pabo: 4 jaar voltijd (of deeltijd). Leidt op tot leraar basisonderwijs. Toelatingseis: havo, vwo of mbo-4. Zij-instroom PO is een alternatief voor hbo/wo-gediplomeerden (2 jaar, leren en werken).",
  "route_tweedegraads": "Tweedegraads lerarenopleiding: 4 jaar hbo. Bevoegd voor vmbo en onderbouw havo/vwo. Zij-instroom VO is een versneld traject (2 jaar) voor mensen met een relevant hbo/wo-diploma en werkplek.",
  "route_eerstegraads": "Eerstegraads lerarenopleiding: universitaire master (1-2 jaar) na een vakinhoudelijke bachelor. Bevoegd voor alle niveaus VO inclusief bovenbouw havo/vwo.",
  "route_pdg": "PDG (Pedagogisch Didactisch Getuigschrift): 1-2 jaar, bedoeld voor vakmensen die in het MBO willen lesgeven. Je leert didactiek en pedagogiek terwijl je al voor de klas staat.",
  "route_zij_instroom": "Zij-instroom: een versneld traject (2 jaar) waarbij je leert en werkt tegelijk. Beschikbaar voor PO en VO. Voorwaarden: relevant hbo/wo-diploma, geschiktheidsonderzoek, en een werkplek op een school.",
  // Salaris
  "salaris": "Salaris in het onderwijs is vastgelegd in de CAO. Starters verdienen ca. 2.900-3.500 bruto/maand. Ervaren leraren tot ca. 5.800 bruto/maand. Exacte inschaling hangt af van opleiding, ervaring en sector. Check de CAO-tabellen voor je situatie.",
  // Kosten
  "kosten": "Kosten van een opleiding verschillen per route. Reguliere opleidingen vallen onder het wettelijk collegegeld (ca. 2.500/jaar). Zij-instroom wordt vaak deels door de school bekostigd via een subsidieregeling. PDG-kosten variëren per aanbieder.",
  // Regio Rotterdam
  "regio_rotterdam": "Onderwijsloket Rotterdam: gratis en onafhankelijk advies over werken in het onderwijs in de regio Rotterdam-Rijnmond. Je kunt een individueel consult aanvragen voor persoonlijk advies over routes, diploma-erkenning en vacatures. Website: onderwijsloketrotterdam.nl",
};

// ── B. Tone Selector ──────────────────────────────────────────────────
const TONE_TABLE: Record<string, { early: string; late: string }> = {
  interesseren: {
    early: "Houd het luchtig. Maak nieuwsgierig. Vermijd jargon. Laat zien dat kleine stappen al tellen.",
    late: "De gebruiker heeft al een richting. Bevestig kort en bied een concrete vervolgstap.",
  },
  orienteren: {
    early: "Zet opties naast elkaar. Noem randvoorwaarden (sector, niveau). Vermijd keuzestress.",
    late: "Focus op de gekozen route. Geef concrete info over duur, eisen, kosten.",
  },
  beslissen: {
    early: "Normaliseer twijfel. Bied 2 routes, niet meer. Geen druk.",
    late: "De keuze wordt concreet. Verwijs naar actie: aanmelden, gesprek, event.",
  },
  matchen: {
    early: "Help zoeken: regio, sector, type school. Concreet en praktisch.",
    late: "Verwijs naar vacatures en events. Bied contact met loket of school.",
  },
  voorbereiden: {
    early: "Checklist-stijl. Kort en zakelijk. Wat moet nog geregeld.",
    late: "Sluit af met aanmoediging. Verwijs naar praktische resources.",
  },
};

function selectTone(phase: string, slotsFilledCount: number, totalSlotsCount: number): string {
  const p = phase.toLowerCase();
  const entry = TONE_TABLE[p] || TONE_TABLE.interesseren;
  const ratio = totalSlotsCount > 0 ? slotsFilledCount / totalSlotsCount : 0;
  return ratio >= 0.5 ? entry.late : entry.early;
}

// ── C. Link Injector ──────────────────────────────────────────────────
function injectLinks(phase: string, slots: Partial<Record<SlotKey, string>>): string {
  const links: string[] = [];
  const p = phase.toLowerCase();

  links.push("/opleidingen - Routes naar het leraarschap");

  if (p === "matchen" || slots.next_step === "vacatures") {
    links.push("/vacatures - Actuele vacatures in het onderwijs");
  }
  if (p === "interesseren" || slots.next_step === "event") {
    links.push("/events - Meeloopdagen en infosessies");
  }
  if (p === "matchen" || p === "voorbereiden") {
    links.push("/events - Kennismakingen en open dagen");
  }
  if (slots.region_preference) {
    links.push("onderwijsloketrotterdam.nl - Gratis consult en persoonlijk advies");
  }
  if (slots.salary_info) {
    links.push("CAO PO/VO/MBO - Officiële salaristabellen (zoek op 'CAO primair onderwijs' e.d.)");
  }

  // Deduplicate
  const unique = [...new Set(links)];
  return unique.slice(0, 3).join("\n- ");
}

// ── D. Profile Interpreter ────────────────────────────────────────────
function interpretProfile(profileMeta?: ProfileMeta | null): string {
  if (!profileMeta) return "";
  const parts: string[] = [];

  if (profileMeta.first_name) {
    parts.push(`De gebruiker heet ${profileMeta.first_name}.`);
  }
  if (profileMeta.bio) {
    parts.push(`Achtergrond: ${profileMeta.bio.slice(0, 120)}.`);
  }
  if (profileMeta.test_completed && profileMeta.test_results) {
    const tr = profileMeta.test_results as Record<string, unknown>;
    if (tr.recommendedSector && tr.ranking && Array.isArray(tr.ranking)) {
      const ranking = tr.ranking as Array<{ sector: string; score: number }>;
      const top = ranking[0];
      const second = ranking[1];
      const sectorNames: Record<string, string> = { po: "basisonderwijs (PO)", vo: "voortgezet onderwijs (VO)", mbo: "beroepsonderwijs (MBO)" };
      let interp = `Interessetest afgerond. ${sectorNames[String(top?.sector).toLowerCase()] || top?.sector} past het best (score ${top?.score})`;
      if (second) interp += `, gevolgd door ${sectorNames[String(second.sector).toLowerCase()] || second.sector} (score ${second.score})`;
      interp += ".";
      parts.push(interp);
    }
  }

  return parts.join(" ");
}

// ── E. Knowledge Resolver ─────────────────────────────────────────────
function resolveKnowledge(
  slots: Partial<Record<SlotKey, string>>,
  phase: string,
): string[] {
  const fragments: string[] = [];
  const role = slots.role_interest?.toLowerCase();
  const sector = slots.school_type?.toUpperCase();

  // Role + sector specific knowledge
  if (role && sector) {
    const key = `${role}_${sector.toLowerCase()}`;
    if (KNOWLEDGE_BLOCKS[key]) fragments.push(KNOWLEDGE_BLOCKS[key]);
  } else if (role === "begeleiding") {
    fragments.push(KNOWLEDGE_BLOCKS.begeleiding);
  } else if (role === "vakexpertise" && !sector) {
    // Generic vakexpertise without sector
    fragments.push(KNOWLEDGE_BLOCKS.vakexpertise_mbo);
  } else if (role === "lesgeven" && !sector) {
    fragments.push(KNOWLEDGE_BLOCKS.lesgeven_po); // default to PO
  }

  // Route info when credential_goal is asked
  if (slots.credential_goal) {
    if (sector === "PO") fragments.push(KNOWLEDGE_BLOCKS.route_pabo);
    else if (sector === "VO") fragments.push(KNOWLEDGE_BLOCKS.route_tweedegraads);
    else if (sector === "MBO") fragments.push(KNOWLEDGE_BLOCKS.route_pdg);
    else fragments.push(KNOWLEDGE_BLOCKS.route_zij_instroom);
  }

  // Salary
  if (slots.salary_info) fragments.push(KNOWLEDGE_BLOCKS.salaris);

  // Costs
  if (slots.costs_info) fragments.push(KNOWLEDGE_BLOCKS.kosten);

  // Region
  if (slots.region_preference) fragments.push(KNOWLEDGE_BLOCKS.regio_rotterdam);

  // Limit to max 3 fragments
  return fragments.slice(0, 3);
}

// ── F. Context Assembler ──────────────────────────────────────────────
function assembleContext(
  phase: string,
  detector: DetectorPayload | undefined,
  profileMeta: ProfileMeta | undefined | null,
  userSector: string | undefined,
  phaseTransition: PhaseTransition | undefined,
): string {
  const slots = detector?.known_slots || {};
  const slotsFilledCount = Object.values(slots).filter(Boolean).length;
  const totalSlotsCount = detector?.missing_slots
    ? slotsFilledCount + detector.missing_slots.length
    : 9; // total slot count from PHASE_RULES

  // 1. Tone (always, max ~50 tokens)
  const tone = selectTone(phase, slotsFilledCount, totalSlotsCount);

  // 2. Knowledge (max ~300 tokens, 1-3 fragments)
  const knowledge = resolveKnowledge(slots, phase);

  // 3. Profile interpretation (max ~100 tokens)
  const profile = interpretProfile(profileMeta);

  // 4. Links (max ~50 tokens)
  const links = injectLinks(phase, slots);

  // 5. Phase transition acknowledgment
  let transitionNote = "";
  if (phaseTransition) {
    transitionNote = `De gebruiker verschuift van "${phaseTransition.from}" naar "${phaseTransition.to}". Erken dit kort en positief (bijv. "Je bent een stap verder"). Pas je begeleiding aan op de nieuwe fase.`;
  }

  // Assemble
  const parts: string[] = [];
  parts.push(`## DYNAMISCHE CONTEXT`);

  parts.push(`\n### Toon\n${tone}`);

  // Basic context info
  const knownSlotsInfo = Object.entries(slots)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");
  parts.push(`\n### Situatie\n- Fase: ${detector?.phase_current_ui || phase}\n- Confidence: ${detector?.phase_confidence ?? "n.v.t."}`);
  if (knownSlotsInfo) parts.push(`- Bekende info: ${knownSlotsInfo}`);
  if (userSector) parts.push(`- Voorkeursector: ${userSector}`);
  if (detector?.evidence?.length) parts.push(`- Evidence: ${detector.evidence.slice(0, 3).join(" | ")}`);

  if (knowledge.length > 0) {
    parts.push(`\n### Kennis\n${knowledge.map(k => `- ${k}`).join("\n")}`);
  }

  if (profile) {
    parts.push(`\n### Over de gebruiker\n${profile}`);
  }

  parts.push(`\n### Relevante pagina's\n- ${links}`);

  if (transitionNote) {
    parts.push(`\n### Fase-verschuiving\n${transitionNote}`);
  }

  // Rough token estimate (~4 chars per token), cap at ~800 tokens
  const assembled = parts.join("\n");
  const estimatedTokens = Math.ceil(assembled.length / 4);
  if (estimatedTokens > 800) {
    // Trim: remove knowledge beyond first fragment, then links
    const trimmed = parts.slice(0, 4); // tone + situation
    if (knowledge.length > 0) trimmed.push(`\n### Kennis\n- ${knowledge[0]}`);
    if (profile) trimmed.push(`\n### Over de gebruiker\n${profile}`);
    return trimmed.join("\n");
  }

  return assembled;
}

// ── Phase & slot definitions (Single Source of Truth) ──────────────────
  const PHASE_RULES = {
  phases: [
    { code: "interesseren", title: "Interesseren", description: "Kennismaking met onderwijs als potentiële arbeidsmarkt.", intent: "verhelderen", tone: "Helder. We maken dit klein." },
    { code: "orienteren", title: "Oriënteren", description: "Overweging of functie in onderwijs passend is.", intent: "geruststellen", tone: "Even scherp zetten." },
    { code: "beslissen", title: "Beslissen", description: "Beslismoment: de stap wél of niet maken.", intent: "structureren", tone: "Twee routes die je nu hebt." },
    { code: "matchen", title: "Matchen", description: "Geschikte werk- en/of opleidingsplek vinden.", intent: "activeren", tone: "We pakken dit concreet aan." },
    { code: "voorbereiden", title: "Voorbereiden", description: "Voorbereiding vóór eerste werk- of opleidingsdag.", intent: "borgen", tone: "Bijna klaar, even de puntjes op de i." },
  ],
  slots: ["school_type", "role_interest", "credential_goal", "admission_requirements", "duration_info", "costs_info", "salary_info", "region_preference", "next_step"],
  policy: {
    goal: "Praktische, objectieve info; geen druk/garanties/commerciële bias.",
    ask_one_question: "Stel maximaal 1 vervolgvraag per beurt, gericht op grootste progressie.",
  },
};

// ── Slot extraction (deterministic, server-side) ───────────────────────
function extractSlots(text: string): Record<string, string | null> {
  const t = text.toLowerCase();
  const slots: Record<string, string | null> = {};

  if (/\bpo\b|basisonderwijs|primair|basisschool/.test(t)) slots.school_type = "PO";
  else if (/\bvo\b|voortgezet|middelbare/.test(t)) slots.school_type = "VO";
  else if (/\bmbo\b|beroepsonderwijs/.test(t)) slots.school_type = "MBO";
  else slots.school_type = null;

  return slots;
}

// ── Deterministic next-question logic ──────────────────────────────────
function chooseNextQuestion(
  userPhase: string | undefined,
  extracted: Record<string, string | null>,
): { slot: string; question: string } {
  const phase = (userPhase || "interesseren").toLowerCase();

  if (
    ["orienteren", "beslissen", "matchen", "voorbereiden"].includes(phase) &&
    !extracted.school_type
  ) {
    return { slot: "school_type", question: "In welke sector wil je je oriënteren: PO, VO of MBO?" };
  }

  switch (phase) {
    case "interesseren":
      return { slot: "role_interest", question: "Wat trekt je het meest aan?" };
    case "orienteren":
      return { slot: "credential_goal", question: "Wil je weten welke route bij je past, of welke diploma's je nodig hebt?" };
    case "beslissen":
      return { slot: "next_step", question: "Wat zou jou helpen om een keuze te maken?" };
    case "matchen":
      return { slot: "region_preference", question: "In welke regio wil je zoeken?" };
    case "voorbereiden":
      return { slot: "next_step", question: "Wat is voor jou de prettigste volgende stap?" };
    default:
      return { slot: "role_interest", question: "Wat trekt je het meest aan?" };
  }
}

// ── Actions based on phase + slots ─────────────────────────────────────
function chooseActions(
  userPhase: string | undefined,
  extracted: Record<string, string | null>,
): Array<{ label: string; value: string }> {
  const phase = (userPhase || "interesseren").toLowerCase();

  if (!extracted.school_type && phase !== "interesseren") {
    return [
      { label: "PO (basisonderwijs)", value: "Basisonderwijs lijkt me wat" },
      { label: "VO (voortgezet)", value: "Voortgezet onderwijs, denk ik" },
      { label: "MBO (beroepsonderwijs)", value: "MBO spreekt me aan" },
    ];
  }

  switch (phase) {
    case "interesseren":
      return [
        { label: "Lesgeven", value: "Lesgeven trekt me" },
        { label: "Begeleiding", value: "Leerlingen begeleiden lijkt me wat" },
        { label: "Vakexpertise", value: "Mijn vak inzetten in het onderwijs" },
      ];
    case "beslissen":
      return [
        { label: "Kosten bekijken", value: "Wat kost het eigenlijk" },
        { label: "Vacatures", value: "Laat me vacatures zien" },
        { label: "Gesprek plannen", value: "Kan ik ergens terecht voor een gesprek" },
      ];
    case "matchen":
      return [
        { label: "Scholen zoeken", value: "Welke scholen zitten in mijn buurt" },
        { label: "Vacatures", value: "Laat me vacatures zien" },
      ];
    case "voorbereiden":
      return [
        { label: "Checklist bekijken", value: "Wat moet ik nog regelen" },
        { label: "Gesprek plannen", value: "Kan ik ergens terecht voor een gesprek" },
      ];
    default:
      return [
        { label: "Routes bekijken", value: "Hoe word je eigenlijk leraar" },
        { label: "Opleidingen", value: "Welke opleidingen zijn er" },
      ];
  }
}

// ── System prompt (NO actions instructions — actions are server-side) ──
const DOORAI_SYSTEM_PROMPT = `Je bent Doortje, de oriëntatie-assistent van Onderwijsloket Rotterdam.

## IDENTITEIT
Je bent een warme, nuchtere wegwijzer: menselijk, direct, vriendelijk. Je helpt mensen oriënteren op werken in het onderwijs. Je bent geen recruiter, geen jurist en geen arbeidsvoorwaardelijk adviseur. Je doet geen beloftes en je kiest niet "de beste route" voor iemand. Je zet opties naast elkaar en helpt de gebruiker zelf kiezen.

## DOEL PER ANTWOORD
- Maak de volgende stap klein en haal drempels weg.
- Geef concrete keuzehulp: 2 opties of 2 richtingen is vaak genoeg.
- Sluit af met een duidelijke vervolgstap.

## GEDRAGSREGELS
- Geen standaard bevestigingen. Alleen erkenning als iemand spanning, twijfel of frustratie uit.
- Geen mini-samenvatting als automatisme. Vat alleen samen als de vraag lang, dubbelzinnig is, of als je moet checken of je elkaar goed begrijpt.
- Stel nooit meerdere vragen. Maximaal 1 korte voortgangsvraag.
- Blijf neutraal. Gebruik woorden als "kan", "meestal", "verschilt per sector/regio/school".
- Als je iets niet zeker weet: zeg dat kort en verwijs door.

## SCOPE EN VEILIGHEID
- Vraag niet om gevoelige persoonsgegevens (BSN, medische details, financiele problemen, prive omstandigheden). Als iemand dat zelf deelt: vraag om het algemeen te houden.
- Geen garanties ("je wordt zeker aangenomen", "dit lukt altijd").
- Geen advies over onderhandelen, contracten, selectieprocedures of salaris-onderhandeling. Wel verwijzen naar CAO of officiele tabellen als bron.
- Bij emotionele escalatie of klacht: blijf rustig en verwijs naar menselijk contact.

## STIJL
- Korte zinnen. Concreet. Geen vakjargon tenzij de gebruiker erom vraagt.
- Vermijd containerzinnen zoals "het hangt ervan af" zonder meteen te concretiseren.
- Max 3 bullets als het echt helpt. Anders gewone zinnen.
- Geen emojis.
- Gebruik geen emdash. Gebruik hooguit een normale streep of splits zinnen.

## VERBODEN ZINNEN
- "Goed dat je dit vraagt."
- "Ik begrijp je helemaal."
- "Als AI kan ik..."
- "Wat is de beste route voor jou?"
- "Je moet ..."
- "Dat weet ik niet." (zonder vervolg)
- "Het hangt ervan af." (zonder direct concretiseren)

## VOORKEURSZINNEN (afwisselen)
- "Helder."
- "Even scherp zetten."
- "Twee routes die je nu hebt: ..."
- "Als je X wilt, past A. Als je Y wilt, past B."
- "Dit verschilt per sector of school. Dit is de vaste plek om te checken: ..."
- "Als dit maatwerk wordt, is een consult het handigst. Zal ik je daarheen wijzen?"

## WIDGET MODUS (je spreekt met iemand die niet is ingelogd)
- Houd het kort: 1 tot 3 zinnen.
- Stel alleen een vraag als je zonder die vraag niet kunt verwijzen. Dan maximaal 1 vraag.
- Link-first: verwijs naar 1 relevante pagina. Gebruik interne routes:
  - /opleidingen (routes en instroom)
  - /vacatures (actueel aanbod)
  - /events (meelopen, infosessies)
  - /auth (inloggen voor persoonlijker vervolg)
- Wegwijzer, geen coach. Minder diepgang, meer richting.
- Geen persoonlijke doorvraag die voelt als intake.
- Als iemand "persoonlijk advies" vraagt: verwijs naar /auth.

## KENNISBLOK

### Sectoren
- **PO** - Basisschool (4-12 jaar)
- **VO** - Middelbare school (12-18 jaar)
- **MBO** - Beroepsonderwijs (16+ jaar)

### Routes (alleen benoemen als relevant)
- Pabo (4 jr) of Zij-instroom PO (2 jr) - voor PO
- Tweedegraads (4 jr) of Zij-instroom VO (2 jr) - voor VO onderbouw
- Eerstegraads (2 jr na tweedegraads) - voor VO bovenbouw/havo/vwo
- PDG (1-2 jr) - voor MBO

### Salaris (globale indicatie, verwijs voor exacte bedragen naar CAO)
- Starters: 2.900 - 3.500 bruto
- Ervaren: tot 5.800 bruto

## VOORBEELDEN

Gebruiker: "Ik twijfel of het onderwijs iets voor mij is."
Doortje: "Twijfel is normaal bij zo'n stap. Je kunt klein beginnen met orienteren of meteen een route verkennen. Kijk bij /events voor meelopen en infosessies. Wil je PO, VO of MBO verkennen?"

Gebruiker: "Wat is het verschil tussen PO en VO?"
Doortje: "PO is werken met jonge kinderen en brede ontwikkeling. VO is werken met pubers en meer vakgericht. Op /opleidingen staan de routes per sector. Wat spreekt je nu het meest aan: PO of VO?"

Gebruiker: "Ik zoek vacatures in Rotterdam."
Doortje: "Dan is /vacatures de snelste ingang. Filter op sector en vakgebied, dan zie je direct wat er openstaat. Wil je PO, VO of MBO vacatures zien?"

Gebruiker: "Wat verdien je als docent?"
Doortje: "Salaris hangt af van sector en inschaling. Ik kan je globaal richten, maar check de CAO tabellen voor de exacte bedragen. Gaat het om PO, VO of MBO?"

Gebruiker: "Kan ik zij-instromen zonder pabo?"
Doortje: "Dat kan, afhankelijk van je opleiding en de sector. Op /opleidingen zie je de routes zoals zij-instroom en deeltijd. Wat is je hoogste afgeronde niveau: mbo, hbo of wo?"

Gebruiker: "Hoi"
Doortje: "Hoi, ik help je snel op weg richting werken in het onderwijs. Je kunt beginnen met routes op /opleidingen of meelopen via /events."`;

// ── Auth system prompt (higher level, only for ingelogde chat) ─────────
const DOORAI_SYSTEM_PROMPT_AUTH = `Je bent Doortje, de oriëntatie-assistent van Onderwijsloket Rotterdam.

## IDENTITEIT
Je bent een warme, nuchtere wegwijzer: menselijk, direct, vriendelijk. Je helpt mensen oriënteren op werken in het onderwijs. Je bent geen recruiter, geen jurist en geen arbeidsvoorwaardelijk adviseur. Je doet geen beloftes en je kiest niet "de beste route" voor iemand. Je zet opties naast elkaar en helpt de gebruiker zelf kiezen.

## DOEL PER ANTWOORD
- Maak de volgende stap klein en haal drempels weg.
- Geef concrete keuzehulp: 2 opties of 2 richtingen is vaak genoeg.
- Sluit af met een duidelijke vervolgstap. Als er een SSOT-vraag is: die is leidend.

## GEDRAGSREGELS
- Geen standaard bevestigingen. Alleen erkenning als iemand spanning, twijfel of frustratie uit.
- Geen mini-samenvatting als automatisme. Vat alleen samen als de vraag lang, dubbelzinnig is, of als je moet checken of je elkaar goed begrijpt.
- Je stelt geen eigen vragen. Gebruik geen vraagtekens in je antwoord.
- Blijf neutraal. Gebruik woorden als "kan", "meestal", "verschilt per sector/regio/school".
- Als je iets niet zeker weet: zeg dat kort en verwijs door.

## SCOPE EN VEILIGHEID
- Vraag niet om gevoelige persoonsgegevens (BSN, medische details, financiele problemen, prive omstandigheden). Als iemand dat zelf deelt: vraag om het algemeen te houden.
- Geen garanties ("je wordt zeker aangenomen", "dit lukt altijd").
- Geen advies over onderhandelen, contracten, selectieprocedures of salaris-onderhandeling. Wel verwijzen naar CAO of officiele tabellen als bron.
- Bij emotionele escalatie of klacht: blijf rustig en verwijs naar menselijk contact.

## STIJL
- Korte zinnen. Concreet. Geen vakjargon tenzij de gebruiker erom vraagt.
- Vermijd containerzinnen zoals "het hangt ervan af" zonder meteen te concretiseren.
- Max 3 bullets als het echt helpt. Anders gewone zinnen.
- Geen emojis.
- Gebruik geen emdash. Gebruik hooguit een normale streep of splits zinnen.
- Je mag inhoudelijk iets uitgebreider dan de widget, maar blijf compact en concreet.

## VERBODEN ZINNEN
- "Goed dat je dit vraagt."
- "Ik begrijp je helemaal."
- "Als AI kan ik..."
- "Wat is de beste route voor jou?"
- "Je moet ..."
- "Dat weet ik niet." (zonder vervolg)
- "Het hangt ervan af." (zonder direct concretiseren)
- "Scenario" (in welke vorm dan ook)

## VOORKEURSZINNEN (afwisselen)
- "Helder."
- "Even scherp zetten."
- "Twee routes die je nu hebt: ..."
- "Als je X wilt, past A. Als je Y wilt, past B."
- "Dit verschilt per sector of school. Dit is de vaste plek om te checken: ..."
- "Als dit maatwerk wordt, is een consult het handigst."

## FORMAT (flexibel, maar strak)
Kies precies een van deze vormen:

VORM A: Kort antwoord (meest gebruikt)
- 1 korte openingszin (max 12 woorden).
- 1 tot 2 korte zinnen uitleg (geen bullets).
- 1 korte vervolgstap zonder vraagteken.

VORM B: Keuzehulp (alleen als er echt 2 routes/opties zijn)
- 1 korte openingszin (max 12 woorden).
- Maximaal 2 bullets met opties. Gebruik "- " markdown. Gebruik nooit het woord "Scenario".
- 1 korte vervolgstap zonder vraagteken.

VORM C: Doorverwijzen (als maatwerk of risico op advies)
- 1 korte openingszin (max 12 woorden).
- 1 zin waarom dit kan verschillen of maatwerk is.
- 1 duidelijke vervolgstap zonder vraagteken (verwijs naar consult of vaste pagina).

Regels die altijd gelden:
- Geen emojis, geen vraagtekens.
- Max 90 woorden totaal.
- Gebruik alleen alinea's en bullets met "- ".
- Als next_question_text aanwezig is: wij voegen die exact toe. Jij schrijft alleen het statement.
- Als next_question_text ontbreekt: eindig met een duidelijke vervolgstap zonder vraagteken.

Kies VORM B alleen als de gebruiker duidelijk om vergelijken/keuze vraagt (woorden als: verschil, kiezen, A of B, welke route, zij-instroom vs deeltijd). Anders gebruik VORM A. Gebruik VORM C bij salaris/inschaling/regels of als het maatwerk wordt.

## FASE-GEDRAG
(Wordt dynamisch bepaald per beurt via de coordinator - zie DYNAMISCHE CONTEXT hieronder.)

## DOORVERWIJZEN
- Bij salaris of inschaling: alleen globaal en altijd richting CAO/tabellen.
- Bij maatwerk of twijfel: bied consult als veilige route, zonder te beloven dat je het regelt.

## VOORBEELDEN (antwoord zonder vraagtekens, SSOT-vraag wordt apart toegevoegd)

Gebruiker: "Ik wil het onderwijs in, maar ik weet niet waar te beginnen."
Doortje: "Helder. We maken dit klein: eerst kiezen we de sector, daarna bekijken we de routes die daarbij passen. Als je liever eerst wilt ervaren, is meelopen ook een sterke eerste stap."

Gebruiker: "Wat verdien ik ongeveer in het onderwijs?"
Doortje: "Salaris hangt af van sector, functie en inschaling. Ik kan je een globale richting geven en je naar de juiste tabellen wijzen. Voor exacte bedragen is de CAO leidend."

Gebruiker: "Ik twijfel tussen zij-instroom en een deeltijdopleiding."
Doortje: "Twee routes die je nu hebt: zij-instroom is vaak sneller richting werk, met begeleiding op school. Deeltijdopleiding is meestal voorspelbaarder in opbouw, met stages en studiebelasting. Als je wil, zetten we dit naast jouw situatie, stap voor stap."

Gebruiker: "Ik zoek een baan in Rotterdam."
Doortje: "Dan zitten we in matchen. We kunnen dit op twee manieren aanpakken: eerst breed kijken wat er openstaat, of eerst je sector en vakgebied scherp zetten zodat je sneller de juiste vacatures ziet."

Gebruiker: "Ik heb een buitenlands diploma."
Doortje: "Dit wordt vaak maatwerk, omdat diploma-waardering en aanvullende eisen kunnen verschillen. Ik kan je de route schetsen en je naar het juiste loket of consult wijzen, zodat je geen rondjes draait."

Gebruiker: "Ik wil meelopen om te voelen of dit past."
Doortje: "Slim. Meelopen haalt veel twijfel weg zonder dat je meteen iets vastlegt. We kiezen eerst de sector, daarna kijken we welke activiteiten of scholen het best aansluiten."`;


// ── Types ──────────────────────────────────────────────────────────────
interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

type SlotKey =
  | "school_type"
  | "role_interest"
  | "credential_goal"
  | "admission_requirements"
  | "duration_info"
  | "costs_info"
  | "salary_info"
  | "region_preference"
  | "next_step";

interface DetectorPayload {
  audience: string;
  phase_current: string;
  phase_current_ui: string;
  phase_confidence: number;
  evidence: string[];
  known_slots: Partial<Record<SlotKey, string>>;
  missing_slots: SlotKey[];
  next_slot_key: SlotKey;
  next_question_id: string;
  next_question: string;
  next_phase_target?: string;
}

interface PhaseTransition {
  from: string;
  to: string;
}

interface ProfileMeta {
  first_name?: string | null;
  bio?: string | null;
  test_completed?: boolean | null;
  test_results?: Record<string, unknown> | null;
}

interface RequestBody {
  messages: ChatMessage[];
  mode?: "public" | "authenticated";
  userPhase?: string;
  userSector?: string;
  detector?: DetectorPayload;
  phase_transition?: PhaseTransition;
  profileMeta?: ProfileMeta;
}

// ── Actions based on next slot (for authenticated flow) ────────────────
function actionsForNextSlot(
  slot: SlotKey,
  knownSlots?: Partial<Record<SlotKey, string>>,
): Array<{ label: string; value: string }> {
  if (slot === "school_type") {
    return [
      { label: "PO (basisonderwijs)", value: "Basisonderwijs lijkt me wat" },
      { label: "VO (voortgezet)", value: "Voortgezet onderwijs, denk ik" },
      { label: "MBO (beroepsonderwijs)", value: "MBO spreekt me aan" },
    ];
  }
  if (slot === "role_interest") {
    return [
      { label: "Lesgeven", value: "Lesgeven trekt me" },
      { label: "Begeleiden", value: "Leerlingen begeleiden, dat lijkt me wat" },
      { label: "Vakexpertise", value: "Mijn vak inzetten in het onderwijs" },
    ];
  }
  // When role_interest is already filled, offer sector-specific follow-ups
  if (slot === "school_type" && knownSlots?.role_interest) {
    if (knownSlots.role_interest === "vakexpertise") {
      return [
        { label: "MBO (instructeur)", value: "MBO als instructeur of vakspecialist" },
        { label: "VO (vakleerkracht)", value: "Vakleerkracht in het voortgezet onderwijs" },
        { label: "PO (vakspecialist)", value: "Specialist in het basisonderwijs" },
      ];
    }
  }
  if (slot === "credential_goal") {
    return [
      { label: "Route naar bevoegdheid", value: "Hoe krijg ik een bevoegdheid" },
      { label: "Eerst verkennen", value: "Ik wil eerst verkennen" },
    ];
  }
  if (slot === "admission_requirements") {
    return [
      { label: "MBO", value: "Mijn achtergrond is mbo" },
      { label: "HBO", value: "Mijn achtergrond is hbo" },
      { label: "WO", value: "Mijn achtergrond is wo" },
      { label: "Anders", value: "Mijn achtergrond is anders" },
    ];
  }
  if (slot === "region_preference") {
    return [
      { label: "Regio Rotterdam", value: "Rotterdam en omgeving" },
      { label: "Andere regio", value: "Ergens anders in Nederland" },
    ];
  }
  if (slot === "next_step") {
    return [
      { label: "Vacatures", value: "Laat me vacatures zien" },
      { label: "Gesprek plannen", value: "Kan ik ergens terecht voor een gesprek" },
      { label: "Events", value: "Zijn er events binnenkort" },
    ];
  }
  return [];
}

// ── Stream filter: replace emdash/en-dash in SSE chunks ─────────────────
function streamReplaceDashes(input: ReadableStream<Uint8Array>) {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    start(controller) {
      const reader = input.getReader();

      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunkText = decoder.decode(value, { stream: true });
            const replaced = chunkText.replace(/[—–]/g, "-");
            controller.enqueue(encoder.encode(replaced));
          }

          const tail = decoder.decode();
          if (tail) controller.enqueue(encoder.encode(tail.replace(/[—–]/g, "-")));
          controller.close();
        } catch (e) {
          console.error("Stream transform error:", e);
          controller.close();
        }
      };

      pump();
    },
  });
}

// ── Handler ────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, mode = "public", userPhase, userSector, detector, phase_transition, profileMeta }: RequestBody = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
    const extracted = extractSlots(lastUserMsg);

    // Public / legacy next question + actions (blijft zoals het nu is)
    const legacyNextQ = chooseNextQuestion(userPhase, extracted);
    const legacyActions = chooseActions(userPhase, extracted);

    // Auth SSOT next question + actions
    const authNextQ = detector?.next_question && detector?.next_slot_key
      ? { slot: detector.next_slot_key, question: detector.next_question }
      : legacyNextQ;

    const authActions = detector?.next_slot_key
      ? actionsForNextSlot(detector.next_slot_key, detector?.known_slots)
      : legacyActions;

    // System prompt
    let systemPrompt = mode === "authenticated" ? DOORAI_SYSTEM_PROMPT_AUTH : DOORAI_SYSTEM_PROMPT;

    if (mode === "authenticated") {
      const dynamicContext = assembleContext(
        detector?.phase_current || userPhase || "interesseren",
        detector,
        profileMeta,
        userSector,
        phase_transition,
      );
      systemPrompt += `\n\n${dynamicContext}`;
    } else {
      // Public context blijft kort
      systemPrompt += `\n\n## Huidige context\n- Ingelogd: Nee\n`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Te veel verzoeken, probeer het later opnieuw." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI-credits zijn op, neem contact op met de beheerder." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Er ging iets mis met de AI, probeer het opnieuw." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiBody = response.body!;
    const filtered = streamReplaceDashes(aiBody);

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    (async () => {
      try {
        const reader = filtered.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          await writer.write(value);
        }

        // Auth: append exact 1 SSOT question, so the model never paraphrases it
        if (mode === "authenticated") {
          const qChunk = {
            choices: [{ delta: { content: `\n\n${authNextQ.question}` } }],
          };
          await writer.write(encoder.encode(`data: ${JSON.stringify(qChunk)}\n\n`));
        }

        // Always append server-side actions event
        const actions = mode === "authenticated" ? authActions : legacyActions;
        await writer.write(encoder.encode(`data: ${JSON.stringify({ actions })}\n\n`));
      } catch (e) {
        console.error("Stream error:", e);
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("DOORai chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Onbekende fout" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
