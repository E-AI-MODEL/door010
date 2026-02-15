const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ══════════════════════════════════════════════════════════════════════
// DoorAI CHAT ORCHESTRA — server-side regie (SSOT + UI) + LLM (tone)
// ══════════════════════════════════════════════════════════════════════
// Kernprincipes:
// 1) Tone-of-voice (LLM) en regie (SSOT/actions/links) zijn gescheiden.
// 2) Links gaan NIET in de prompt maar als UI-payload via SSE.
// 3) SSOT-vraag wordt server-side bepaald; LLM mag natuurlijk doorvragen.
// 4) SSOT JSON-bestanden worden dynamisch gelookup-t voor kennisblokken.
// 5) Eén core prompt + 1 appendix (dashboard).
// 6) Kennis gelabeld als landelijk/regionaal en fase-gefilterd.
// 7) Multi-stap: intent-classificatie bepaalt welke context de LLM krijgt.

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────
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
  mode?: "authenticated";
  userPhase?: string;
  userSector?: string;
  detector?: DetectorPayload;
  phase_transition?: PhaseTransition;
  profileMeta?: ProfileMeta;
}

type IntentType = "greeting" | "question" | "exploration" | "followup";
type UiAction = { label: string; value: string };
type UiLink = { label: string; href: string };

// ─────────────────────────────────────────────────────────────────────
// SSOT Data — Complete lookups from JSON sources
// ─────────────────────────────────────────────────────────────────────

// ── Route Questions: alle 7 functiebeschrijvingen ──
const ROLE_DESCRIPTIONS: Record<string, string> = {
  leraar: "Een leraar draagt verantwoordelijkheid voor een klas. In de meeste gevallen moeten leraren wettelijk aan bekwaamheidseisen voldoen.",
  "onderwijsondersteunend personeel": "Ondersteunende functies die direct ondersteunen bij de lespraktijk: onderwijsassistenten, remedial teachers, leraarondersteuners, klassenassistenten.",
  "ondersteunend personeel": "Ondersteunende functies in de organisatie die niet direct betrokken zijn bij het leerproces: conciërge, personeelsmedewerkers, roostermaker, administratie.",
  schoolleiding: "De dagelijkse leiding van een school: directeur (PO), rector/conrectoren (VO), of directie afhankelijk van omvang (MBO).",
  middenmanagement: "Het middenmanagement vormt samen met de schoolleiding het managementteam: bouwcoördinatoren (PO), teamleiders (VO), opleidingsmanagers (MBO).",
  instructeur: "Binnen het mbo zijn instructeurs verantwoordelijk voor de praktijkonderdelen van een opleiding. Een instructeur geeft zelfstandig (delen van) lessen, maar valt altijd onder de verantwoordelijkheid van een docent of het onderwijsteam.",
  leerlingenzorg: "Binnen elke vorm van onderwijs zijn er mensen specifiek gericht op leerlingenzorg: Intern Begeleider (PO), Zorgcoördinator (VO), studieadviseur (MBO/HO), orthopedagoog (speciaal onderwijs).",
};

// ── Route Steps: alle routes geïndexeerd op slug ──
const ROUTE_SUMMARIES: Record<string, { title: string; summary: string; hasFaqs: boolean }> = {
  "wo-f": { title: "Wo-bachelor (doorstroom PO)", summary: "Wo-bacheloropleidingen zijn academische studies. Met een wo-bachelor in Gedrag en Maatschappij ben je toelaatbaar tot de universitaire Educatieve Master Primair Onderwijs (EMPO).", hasFaqs: false },
  hbom: { title: "Hbo-master", summary: "Na een tweedegraads bevoegdheid kun je via een hbo-master je bevoegdheid uitbreiden tot eerstegraads voor bovenbouw havo/vwo. Niet voor alle schoolvakken beschikbaar.", hasFaqs: true },
  pabo: { title: "Pabo", summary: "De Pabo duurt 4 jaar voltijd of langer in deeltijd. Leidt op tot leraar basisonderwijs. Toelatingseis: havo, vwo of mbo-4.", hasFaqs: true },
  "zij-instroom-po": { title: "Zij-instroom PO", summary: "Versneld 2-jarig traject voor hbo/wo-gediplomeerden die leraar basisonderwijs willen worden. Je leert en werkt tegelijk op een school.", hasFaqs: true },
  "zij-instroom-vo": { title: "Zij-instroom VO", summary: "2-jarig duaal traject voor mensen met een relevant hbo/wo-diploma. Je geeft les terwijl je de bevoegdheid haalt, met geschiktheidsonderzoek vooraf.", hasFaqs: true },
  tweedegraads: { title: "Tweedegraads lerarenopleiding", summary: "4 jaar hbo. Bevoegd voor vmbo en onderbouw havo/vwo. Geschikt als je een specifiek vak wilt geven op de middelbare school.", hasFaqs: true },
  eerstegraads: { title: "Eerstegraads lerarenopleiding", summary: "Universitaire master (1-2 jaar) na een vakinhoudelijke bachelor. Bevoegd voor alle niveaus VO inclusief bovenbouw havo/vwo.", hasFaqs: true },
  pdg: { title: "PDG", summary: "Pedagogisch Didactisch Getuigschrift: 1-2 jaar naast het werk. Bedoeld voor vakmensen die in het MBO willen lesgeven. Je leert didactiek terwijl je al voor de klas staat.", hasFaqs: true },
  kopopleiding: { title: "Kopopleiding", summary: "Versneld hbo-bachelortraject (1-2 jaar) voor wie al een hbo- of wo-bachelor heeft. Je haalt een tweedegraads bevoegdheid.", hasFaqs: true },
  "wo-a": { title: "Universitaire pabo", summary: "Combinatie van hbo-pabo en wo-bachelor Onderwijswetenschappen of Pedagogische Wetenschappen. In ca. 4 jaar behaal je twee bachelors.", hasFaqs: true },
  "mbo4-b": { title: "Mbo-4 (doorstroom)", summary: "Mbo 4-opleiding als middenkaderopleiding (3-4 jaar). Na afronding kun je doorstromen naar een AD of hbo-bachelor.", hasFaqs: true },
  "vavo-b": { title: "Vavo", summary: "Via volwassenenonderwijs je havodiploma halen. Voor 18+ zonder juist middelbareschooldiploma. Regulier havo-eindexamen.", hasFaqs: true },
  "pdg-a": { title: "PDG-traject", summary: "Met een PDG mag je lesgeven in het mbo. Leer-werktraject via zij-instroom. Hbo/wo-diploma of 3 jaar werkervaring + hbo-denkniveau vereist.", hasFaqs: true },
  "sl-a": { title: "Schoolleiding PO", summary: "Schoolleiders PO moeten geregistreerd staan in het Schoolleidersregister PO. Kwalificatie via schoolleidersopleiding, master, assessment of EVC.", hasFaqs: false },
  "mbo3-a": { title: "Mbo-3", summary: "Vakopleiding van 2-3 jaar. Na afronding doorstroom naar mbo-4 mogelijk.", hasFaqs: false },
  "hbo-f": { title: "Hbo-bachelor (ongegradeerde bevoegdheid)", summary: "Ongegradeerde bevoegdheid voor lichamelijke opvoeding, muziek en andere kunstvakken. Bevoegd in alle onderwijssectoren.", hasFaqs: false },
  "mm-b": { title: "Middenmanagement VO", summary: "Teamleiders en afdelingsleiders in het voortgezet onderwijs. Vaak nog deels voor de klas, met lesbevoegdheid.", hasFaqs: false },
  "wom-a": { title: "Wo-master (eerstegraads)", summary: "Educatieve master of zij-instroomtraject aan universiteit. 1-2 jaar. Bevoegd voor alle VO-niveaus.", hasFaqs: true },
  "ad-a": { title: "Associate degree (leraarondersteuner)", summary: "2-jarige praktijkgerichte hbo-opleiding. AD-PEP leidt op tot leraarondersteuner in alle sectoren. Ook instructeur MBO of pedagogisch coach.", hasFaqs: true },
  "wo-c": { title: "Wo-bachelor (doorstroom VO)", summary: "Wo-bachelor die aansluit bij een schoolvak. Daarna educatieve wo-master, kopopleiding of zij-instroom mogelijk.", hasFaqs: false },
  "mm-c": { title: "Middenmanagement MBO", summary: "Teamleiders in het mbo die leiding geven aan onderwijsteams. Vaak zelf ook uit de opleiding afkomstig.", hasFaqs: false },
  "21a": { title: "21+-toets", summary: "Toelatingstoets voor een associate degree als je geen mbo-4, havo of vwo-diploma hebt. Vanaf 21 jaar.", hasFaqs: true },
  "mbo4-d": { title: "Mbo-4 (doorstroom tweedegraads)", summary: "Mbo 4-opleiding waarna doorstroom naar tweedegraads lerarenopleiding mogelijk is.", hasFaqs: false },
  "wo-d": { title: "Wo-bachelor (doorstroom wo-master)", summary: "Wo-bachelor waarna doorstroom naar wo-master en vervolgens educatieve master of zij-instroom.", hasFaqs: false },
  "hbo-c": { title: "Hbo-bachelor (doorstroom kopopleiding)", summary: "Hbo-bachelor waarna verkorte lerarenopleiding (kopopleiding) mogelijk is voor tweedegraads bevoegdheid.", hasFaqs: false },
  "p-hbo-b": { title: "Verkorte pabo", summary: "Verkorte deeltijd pabo (2-3 jaar) voor wie al een hbo- of wo-opleiding heeft afgerond.", hasFaqs: true },
  "mbotoets-b": { title: "Mbo-toets", summary: "Toelatingstoets voor mbo 3-opleiding als je niet de gevraagde vooropleiding hebt.", hasFaqs: false },
  "hbo-b": { title: "Hbo-bachelor (tweedegraads)", summary: "Tweedegraads lerarenopleiding aan de hogeschool. 4 jaar voltijd. Bevoegd voor vmbo en onderbouw havo/vwo.", hasFaqs: true },
  "op-a": { title: "Ondersteunend personeel PO", summary: "Diverse functies: conciërge, administratie, technische dienst. Geen wettelijke eisen, direct solliciteren met relevante ervaring.", hasFaqs: true },
  "ad-e": { title: "Associate degree (instructeur)", summary: "2-jarige AD-opleiding om instructeur te worden in het mbo.", hasFaqs: false },
  "mbo4sp-b": { title: "Mbo-4 specialistenopleiding", summary: "Korte variant mbo-4 (1-2 jaar). Leer-werktraject na afronding aansluitende mbo-3 of mbo-4.", hasFaqs: false },
  "wom-b": { title: "Wo-master (doorstroom)", summary: "Wo-master waarna educatieve master of zij-instroom voor eerstegraads bevoegdheid.", hasFaqs: false },
  "mbo4-e": { title: "Mbo-4 (instructeur)", summary: "Mbo 4-opleiding als route naar instructeur in het mbo.", hasFaqs: false },
  "ad-b": { title: "Associate degree (doorstroom pabo)", summary: "AD als opstap naar de pabo of verkorte pabo.", hasFaqs: true },
  hbop: { title: "Hbo-P (pedagogisch)", summary: "Pedagogische hbo-opleiding, ca. 1 jaar. Richt zich op pedagogisch-didactische vaardigheden.", hasFaqs: false },
  "onbler-a": { title: "Gastdocent", summary: "Als gastdocent kun je zonder bevoegdheid voor de klas staan, maximaal een beperkt aantal uren per week.", hasFaqs: false },
  "op-b": { title: "Ondersteunend personeel VO", summary: "Ondersteunende functies in het voortgezet onderwijs. Geen wettelijke eisen, direct solliciteren.", hasFaqs: false },
  mbo1: { title: "Mbo-1", summary: "Entree-opleiding mbo. Duur: 1 jaar. Doorstroom naar mbo-2 mogelijk.", hasFaqs: false },
  "op-c": { title: "Ondersteunend personeel MBO", summary: "Ondersteunende functies in het mbo. Geen wettelijke eisen, direct solliciteren.", hasFaqs: false },
  "lz-a": { title: "Leerlingenzorg PO", summary: "Intern begeleider (IB'er) als spil van leerlingenzorg op de basisschool. HBO-opleiding tot IB'er.", hasFaqs: false },
  "lz-c": { title: "Leerlingenzorg VO", summary: "Zorgcoördinator als spil van leerlingenzorg op de middelbare school.", hasFaqs: false },
  "hbo-a": { title: "Hbo-bachelor (pabo)", summary: "Reguliere pabo: 4-jarige hbo-opleiding tot leraar basisonderwijs.", hasFaqs: true },
  "lz-d": { title: "Leerlingenzorg MBO", summary: "Zorgcoördinator, loopbaanbegeleider, leer-werkcoach en andere zorgfuncties in het mbo.", hasFaqs: false },
  "wo-b": { title: "Educatieve minor/module", summary: "30 ECTS minor tijdens of na wo-bachelor. Levert beperkte tweedegraads bevoegdheid op voor vmbo en onderbouw havo/vwo.", hasFaqs: true },
  "lz-e": { title: "Leerlingenzorg HO", summary: "Studentenpsycholoog, vertrouwenspersoon, studieadviseur in het hoger onderwijs.", hasFaqs: false },
  "onbler-b": { title: "Leraar HO", summary: "Lesgeven in het hoger onderwijs. Geen wettelijke bevoegdheid vereist. Vaak afgeronde master en BKO/BDB gevraagd.", hasFaqs: true },
};

// ── Regional Education Desks: alle loketten met stad-matching ──
interface DeskInfo {
  title: string;
  email: string | null;
  website: string | null;
  consultUrl: string | null;
  hasConsultation: boolean;
  cities: string[];
}

const REGIONAL_DESKS_LIST: DeskInfo[] = [
  {
    title: "SchoolpleinNoord",
    email: "info@schoolpleinnoord.nl",
    website: "https://schoolpleinnoord.nl/",
    consultUrl: "https://schoolpleinnoord.nl/contact",
    hasConsultation: true,
    cities: ["groningen", "leeuwarden", "drachten", "heerenveen", "assen", "sneek", "delfzijl", "stadskanaal", "veendam", "winschoten", "appingedam", "emmen", "hoogeveen", "meppel"],
  },
  {
    title: "VOTA",
    email: "instroommakelaar@vota.nl",
    website: "https://vota.nl",
    consultUrl: "https://vota.nl/contact",
    hasConsultation: true,
    cities: ["almelo", "enschede", "hengelo", "deventer", "oldenzaal", "borne", "haaksbergen", "lochem", "raalte", "rijssen", "twente"],
  },
  {
    title: "Foodvalley Leerwerkloket",
    email: "arbeidsmarktregio@ede.nl",
    website: "https://kiesjekans.nl/branches/onderwijs",
    consultUrl: "https://www.kiesjekans.nl/contact",
    hasConsultation: true,
    cities: ["barneveld", "veenendaal", "ede", "wageningen", "renkum", "rhenen", "nijkerk", "oosterbeek", "foodvalley"],
  },
  {
    title: "Onderwijsloket Nijmegen",
    email: "contact@onderwijsloketnijmegen.nl",
    website: "https://onderwijsloketnijmegen.nl/",
    consultUrl: "https://onderwijsloketnijmegen.nl/contact",
    hasConsultation: true,
    cities: ["nijmegen", "lent"],
  },
  {
    title: "Grijp je kans in het onderwijs",
    email: "info@grijpjekansinhetonderwijs.nl",
    website: "https://grijpjekansinhetonderwijs.nl",
    consultUrl: "https://www.grijpjekansinhetonderwijs.nl/contact",
    hasConsultation: true,
    cities: ["eindhoven", "helmond", "'s-hertogenbosch", "den bosch", "geldrop", "deurne", "vught", "bladel", "meierijstad", "boxtel", "oss", "valkenswaard", "best", "veldhoven", "brabant-oost"],
  },
  {
    title: "Onderwijsloket Arnhem",
    email: "info@onderwijsloketarnhem.nl",
    website: "https://onderwijsregioloa.nl",
    consultUrl: "https://onderwijsloketarnhem.nl/contact",
    hasConsultation: true,
    cities: ["arnhem", "lingewaard", "overbetuwe"],
  },
  {
    title: "Aan de slag in het Haagse Basisonderwijs",
    email: "info@aandeslaginhethaagsebasisonderwijs.nl",
    website: "https://www.aandeslaginhethaagsebasisonderwijs.nl/",
    consultUrl: "https://www.aandeslaginhethaagsebasisonderwijs.nl/",
    hasConsultation: true,
    cities: ["den haag", "haaglanden"],
  },
  {
    title: "Leraar worden in Leiden, Duin- en Bollenstreek",
    email: "info@leraarwordeninleidenduinenbollenstreek.nl",
    website: "https://www.leraarwordeninleidenduinenbollenstreek.nl/",
    consultUrl: "https://www.leraarwordeninleidenduinenbollenstreek.nl/leraar-worden/meld-je-aan/",
    hasConsultation: true,
    cities: ["leiden", "leiderdorp", "katwijk", "noordwijk", "oegstgeest", "voorschoten", "wassenaar", "hillegom", "lisse", "bollenstreek"],
  },
  {
    title: "Samen voor de Haagse Klas",
    email: "info@samenvoordehaagseklas.nl",
    website: "https://samenvoordehaagseklas.nl",
    consultUrl: null,
    hasConsultation: false,
    cities: ["den haag"],
  },
  {
    title: "Utrecht leert",
    email: "welkom@utrechtleert.nl",
    website: "https://utrechtleert.nl/utrechtse-energie/",
    consultUrl: null,
    hasConsultation: false,
    cities: ["utrecht"],
  },
  {
    title: "Hatseklas",
    email: "info@hatseklas.nl",
    website: "https://hatseklas.nl",
    consultUrl: "https://hatseklas.nl/contact/",
    hasConsultation: true,
    cities: ["zwolle", "apeldoorn", "kampen", "harderwijk", "nunspeet", "ermelo", "putten", "elburg", "epe", "heerde", "hattem", "hoogeveen", "meppel", "dronten", "zeewolde", "urk", "overijssel"],
  },
  {
    title: "Midden Nederland Leert",
    email: "Instroom@middennederlandleert.nl",
    website: "https://middennederlandleert.nl/",
    consultUrl: "https://middennederlandleert.nl/contact/",
    hasConsultation: true,
    cities: ["amersfoort", "hilversum", "houten", "zeist", "leusden", "soest", "baarn", "woerden", "culemborg", "nieuwegein", "ijsselstein"],
  },
  {
    title: "Liever voor de klas",
    email: "info@lievervoordeklas.nl",
    website: "https://www.lievervoordeklas.nl/pagina/1loket-voor-zij-instromers-in-het-amsterdamse-basisonderwijs",
    consultUrl: "https://www.lievervoordeklas.nl/persoonlijk-advies",
    hasConsultation: true,
    cities: ["amsterdam"],
  },
  {
    title: "Stappen in het onderwijs",
    email: "info@stappeninhetonderwijs.nl",
    website: "https://stappeninhetonderwijs.nl/",
    consultUrl: null,
    hasConsultation: false,
    cities: ["breda", "tilburg", "roosendaal", "bergen op zoom", "brabant-west", "west-brabant"],
  },
  {
    title: "Onderwijsloket Rotterdam",
    email: "info@onderwijsloketrotterdam.nl",
    website: "https://onderwijsloketrotterdam.nl/",
    consultUrl: null,
    hasConsultation: false,
    cities: ["rotterdam", "barendrecht", "capelle aan den ijssel", "schiedam", "vlaardingen", "maassluis", "ridderkerk", "delft", "gouda", "lansingerland", "nissewaard", "albrandswaard", "zuidplas", "westland"],
  },
  {
    title: "Ik word leerkracht",
    email: "info@ikwordleerkracht.nl",
    website: "https://ikwordleerkracht.nl/",
    consultUrl: "https://ikwordleerkracht.nl/persoonlijk-advies/",
    hasConsultation: true,
    cities: ["haarlemmermeer", "hoofddorp", "nieuw-vennep"],
  },
  {
    title: "Koerskracht",
    email: "info@koerskracht.nu",
    website: "https://koerskracht.nu",
    consultUrl: "https://koerskracht.nu",
    hasConsultation: true,
    cities: ["dordrecht", "gorinchem", "papendrecht", "sliedrecht", "zwijndrecht", "alblasserdam"],
  },
  {
    title: "Landelijk Groen",
    email: "info@werkeningroenonderwijs.nl",
    website: "https://www.werkeningroenonderwijs.nl/",
    consultUrl: "https://www.werkeningroenonderwijs.nl/contact",
    hasConsultation: true,
    cities: ["groen onderwijs", "agrarisch"],
  },
  {
    title: "Talent als Docent",
    email: "info@talentalsdocent.nl",
    website: "https://talentalsdocent.nl/",
    consultUrl: null,
    hasConsultation: false,
    cities: ["haarlem", "velsen", "zandvoort", "bloemendaal", "heemstede", "amstelveen", "uithoorn", "aalsmeer", "beverwijk"],
  },
  {
    title: "Leraar van Buiten",
    email: "info@leraarvanbuiten.nl",
    website: "https://www.leraarvanbuiten.nl/",
    consultUrl: null,
    hasConsultation: false,
    cities: ["dordrecht", "rotterdam", "schiedam", "vlaardingen", "ridderkerk", "barendrecht", "capelle aan den ijssel", "krimpen aan den ijssel", "papendrecht", "sliedrecht", "zwijndrecht", "rijnmond"],
  },
  {
    title: "Onderwijsloket Friesland",
    email: "m.swiebel@dcterrra.nl",
    website: "https://www.onderwijsloketfriesland.nl/",
    consultUrl: "https://www.onderwijsloketfriesland.nl/contact",
    hasConsultation: true,
    cities: ["leeuwarden", "heerenveen", "drachten", "harlingen", "sneek", "friesland"],
  },
  {
    title: "Blijf zitten in Haarlem",
    email: null,
    website: null,
    consultUrl: null,
    hasConsultation: false,
    cities: ["haarlem", "heemstede", "bloemendaal", "kennemerland"],
  },
];

// ─────────────────────────────────────────────────────────────────────
// SSOT Lookup Functions
// ─────────────────────────────────────────────────────────────────────
function truncate(text: string, maxWords: number): string {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(" ") + "...";
}

function findRoleDescription(roleName: string): string | null {
  const key = roleName.toLowerCase();
  if (ROLE_DESCRIPTIONS[key]) return truncate(ROLE_DESCRIPTIONS[key], 80);
  for (const [k, v] of Object.entries(ROLE_DESCRIPTIONS)) {
    if (k.includes(key) || key.includes(k)) return truncate(v, 80);
  }
  return null;
}

function findRouteStep(slug: string): string | null {
  const entry = ROUTE_SUMMARIES[slug.toLowerCase()];
  if (!entry) return null;
  let result = `${entry.title}: ${entry.summary}`;
  if (entry.hasFaqs) result += " Er zijn ook veelgestelde vragen beschikbaar op /opleidingen.";
  return truncate(result, 80);
}

function findRegionalDesk(regionOrCity: string): string | null {
  const key = regionOrCity.toLowerCase().trim();
  for (const desk of REGIONAL_DESKS_LIST) {
    const match = desk.cities.some(c => key.includes(c) || c.includes(key));
    if (match) {
      let info = `${desk.title}: gratis en onafhankelijk advies.`;
      if (desk.website) info += ` Website: ${desk.website}`;
      if (desk.hasConsultation) info += ` - je kunt een persoonlijk consult aanvragen.`;
      return truncate(info, 80);
    }
  }
  return null;
}

// Helper: find desk object for links
function findDeskObject(regionOrCity: string): DeskInfo | null {
  const key = regionOrCity.toLowerCase().trim();
  for (const desk of REGIONAL_DESKS_LIST) {
    if (desk.cities.some(c => key.includes(c) || c.includes(key))) return desk;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────
// Fallback Knowledge Blocks
// ─────────────────────────────────────────────────────────────────────
const KNOWLEDGE_BLOCKS: Record<string, string> = {
  lesgeven_po: "Leraar PO: je draagt verantwoordelijkheid voor een klas op de basisschool (groep 1-8). Je geeft alle vakken. Pabo-diploma of zij-instroom PO-traject vereist.",
  lesgeven_vo: "Leraar VO: je geeft les in een specifiek vak op de middelbare school. Tweedegraads (4 jr hbo) voor onderbouw/vmbo, eerstegraads (master) voor bovenbouw havo/vwo.",
  lesgeven_mbo: "Docent MBO: je geeft theorie/praktijklessen in beroepsopleidingen. PDG (1-2 jr) vereist. Vakkennis uit de praktijk is een groot pluspunt.",
  vakexpertise_po: "Vakspecialist PO: je zet expertise in op basisscholen (muziek, techniek, beweging). Hbo-diploma in je vakgebied is vaak voldoende.",
  vakexpertise_vo: "Vakleerkracht VO: je geeft les in je eigen vak. Tweedegraads of eerstegraads bevoegdheid nodig.",
  vakexpertise_mbo: "Instructeur MBO: je geeft praktijklessen vanuit vakkennis. Geen formele bevoegdheid nodig, PDG aanbevolen.",
  begeleiding: "Onderwijsondersteuner/leerlingbegeleider: je begeleidt leerlingen bij leren, gedrag of sociaal-emotionele ontwikkeling. Eisen verschillen per functie en sector.",
  route_pabo: "Pabo: 4 jaar voltijd (of deeltijd). Toelatingseis: havo, vwo of mbo-4. Zij-instroom PO is alternatief voor hbo/wo-gediplomeerden (2 jaar).",
  route_tweedegraads: "Tweedegraads lerarenopleiding: 4 jaar hbo. Bevoegd voor vmbo en onderbouw havo/vwo. Zij-instroom VO is versneld (2 jaar).",
  route_eerstegraads: "Eerstegraads: universitaire master (1-2 jaar) na vakinhoudelijke bachelor. Bevoegd voor alle VO-niveaus.",
  route_pdg: "PDG: 1-2 jaar, bedoeld voor vakmensen die in MBO willen lesgeven. Didactiek en pedagogiek terwijl je al voor de klas staat.",
  route_zij_instroom: "Zij-instroom: versneld 2-jarig traject, leren en werken tegelijk. Voor PO en VO. Voorwaarden: relevant hbo/wo-diploma, geschiktheidsonderzoek, werkplek.",
  salaris: "Salaris volgt de CAO. Starters ca. 2.900-3.500 bruto/maand. Ervaren leraren tot ca. 5.800. Exacte inschaling hangt af van opleiding, ervaring en sector.",
  kosten: "Kosten verschillen per route. Regulier: wettelijk collegegeld (ca. 2.500/jr). Zij-instroom: vaak deels door school bekostigd via subsidie. PDG: variëert per aanbieder.",
  regio_rotterdam: "Onderwijsloket Rotterdam: gratis en onafhankelijk advies over werken in het onderwijs in de regio Rotterdam-Rijnmond. Website: onderwijsloketrotterdam.nl",
};

// Basiskennis: altijd beschikbaar, ongeacht gevulde slots
const BASELINE_KNOWLEDGE = `Het Onderwijsloket Rotterdam helpt je gratis en onafhankelijk bij het verkennen van werken in het onderwijs. Er zijn verschillende richtingen: lesgeven (voor de klas), begeleiden (leerlingen ondersteunen), ondersteunende functies, of je vakexpertise inzetten als instructeur of specialist. Routes lopen via reguliere opleidingen of via zij-instroom als je al werkervaring hebt.`;

// ─────────────────────────────────────────────────────────────────────
// A. Tone Selector — vereenvoudigd: 1 sfeerinstructie per fase-moment
// ─────────────────────────────────────────────────────────────────────
const TONE_TABLE: Record<string, { early: string; late: string }> = {
  interesseren: {
    early: "Luchtig en nieuwsgierig.",
    late: "Bevestigend, richting concrete stap.",
  },
  orienteren: {
    early: "Opties naast elkaar, zonder keuzestress.",
    late: "Gericht op de gekozen route.",
  },
  beslissen: {
    early: "Twijfel normaliseren, twee opties max.",
    late: "Concreet: aanmelden, gesprek, event.",
  },
  matchen: {
    early: "Praktisch: regio, sector, type school.",
    late: "Doorverwijzen naar vacatures of loket.",
  },
  voorbereiden: {
    early: "Kort en zakelijk, checklist-stijl.",
    late: "Afsluitend met aanmoediging.",
  },
};

function selectTone(phase: string, slotsFilledCount: number, totalSlotsCount: number): string {
  const p = phase.toLowerCase();
  const entry = TONE_TABLE[p] || TONE_TABLE.interesseren;
  const ratio = totalSlotsCount > 0 ? slotsFilledCount / totalSlotsCount : 0;
  return ratio >= 0.5 ? entry.late : entry.early;
}

// ─────────────────────────────────────────────────────────────────────
// B. Profile Interpreter
// ─────────────────────────────────────────────────────────────────────
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
    const tr = profileMeta.test_results;
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

// ─────────────────────────────────────────────────────────────────────
// C. Knowledge Resolver — fase-gefilterd, landelijk/regionaal gelabeld
// ─────────────────────────────────────────────────────────────────────
function resolveKnowledge(
  slots: Partial<Record<SlotKey, string>>,
  phase: string,
): string[] {
  const fragments: string[] = [];
  const landelijk: string[] = [];
  const regionaal: string[] = [];

  const role = slots.role_interest?.toLowerCase();
  const sector = slots.school_type?.toUpperCase();
  const p = (phase || "interesseren").toLowerCase();

  // ── Fase-gebaseerde kennis-injectie ──

  // Interesseren: rollen en sectoren (breed, landelijk)
  if (p === "interesseren" || p === "orienteren") {
    if (role) {
      const roleDesc = findRoleDescription(role);
      if (roleDesc) {
        landelijk.push(roleDesc);
      } else if (role && sector) {
        const key = `${role}_${sector.toLowerCase()}`;
        if (KNOWLEDGE_BLOCKS[key]) landelijk.push(KNOWLEDGE_BLOCKS[key]);
      } else if (role === "begeleiding") {
        landelijk.push(KNOWLEDGE_BLOCKS.begeleiding);
      } else if (role === "vakexpertise") {
        landelijk.push(KNOWLEDGE_BLOCKS.vakexpertise_mbo);
      } else if (role === "lesgeven") {
        landelijk.push(KNOWLEDGE_BLOCKS.lesgeven_po);
      }
    }
  }

  // Oriënteren/Beslissen: route-info (landelijk)
  if (p === "orienteren" || p === "beslissen") {
    if (slots.credential_goal) {
      let slug: string | null = null;
      if (sector === "PO") slug = "pabo";
      else if (sector === "VO") slug = "tweedegraads";
      else if (sector === "MBO") slug = "pdg";

      if (slug) {
        const routeInfo = findRouteStep(slug);
        if (routeInfo) {
          landelijk.push(routeInfo);
        } else {
          const fallbackKey = `route_${slug}`;
          if (KNOWLEDGE_BLOCKS[fallbackKey]) landelijk.push(KNOWLEDGE_BLOCKS[fallbackKey]);
        }
      } else {
        landelijk.push(KNOWLEDGE_BLOCKS.route_zij_instroom);
      }
    }
  }

  // Beslissen: kosten en salaris (landelijk)
  if (p === "beslissen" || p === "orienteren") {
    if (slots.salary_info) landelijk.push(KNOWLEDGE_BLOCKS.salaris);
    if (slots.costs_info) landelijk.push(KNOWLEDGE_BLOCKS.kosten);
  }

  // Matchen/Voorbereiden: regionaal loket
  if (p === "matchen" || p === "voorbereiden") {
    if (slots.region_preference) {
      const deskInfo = findRegionalDesk(slots.region_preference);
      if (deskInfo) {
        regionaal.push(deskInfo);
      } else {
        regionaal.push("Zoek een onderwijsloket in je regio via onderwijsloketten.nl voor gratis advies over routes en vacatures.");
      }
    }
    // Also inject salary/costs if available in later phases
    if (slots.salary_info) landelijk.push(KNOWLEDGE_BLOCKS.salaris);
    if (slots.costs_info) landelijk.push(KNOWLEDGE_BLOCKS.kosten);
  }

  // Altijd: als region_preference gezet maar buiten matchen/voorbereiden, toch regionale info geven
  if (slots.region_preference && p !== "matchen" && p !== "voorbereiden") {
    const deskInfo = findRegionalDesk(slots.region_preference);
    if (deskInfo) regionaal.push(deskInfo);
  }

  // Assemble
  for (const l of landelijk.slice(0, 2)) fragments.push(l);
  for (const r of regionaal.slice(0, 2)) fragments.push(r);

  return fragments.slice(0, 3);
}

// ─────────────────────────────────────────────────────────────────────
// D. UI Links (server-side, NIET in LLM prompt)
// ─────────────────────────────────────────────────────────────────────
function computeLinks(
  phase: string,
  slots: Partial<Record<SlotKey, string>>,
): UiLink[] {
  const links: UiLink[] = [];
  const p = (phase || "interesseren").toLowerCase();

  links.push({ label: "Routes en opleidingen", href: "/opleidingen" });

  if (p === "matchen" || slots.next_step === "vacatures") {
    links.push({ label: "Vacatures", href: "/vacatures" });
  }
  if (p === "interesseren" || slots.next_step === "event") {
    links.push({ label: "Events en meelopen", href: "/events" });
  }
  if (p === "matchen" || p === "voorbereiden") {
    links.push({ label: "Events en open dagen", href: "/events" });
  }

  // Regional desk website link
  if (slots.region_preference) {
    const desk = findDeskObject(slots.region_preference);
    if (desk?.website) {
      links.push({ label: desk.title, href: desk.website });
    }
  }

  const uniq = new Map<string, UiLink>();
  for (const l of links) uniq.set(l.href, l);
  return [...uniq.values()].slice(0, 3);
}

// ─────────────────────────────────────────────────────────────────────
// E. Context Assembler — gehumaniseerd, geen raw metadata
// ─────────────────────────────────────────────────────────────────────

// Vertaal slots + fase naar menselijk leesbare situatieschets
function humanizeSituation(
  phase: string,
  slots: Partial<Record<SlotKey, string>>,
  userSector: string | undefined,
): string {
  const parts: string[] = [];
  const p = (phase || "interesseren").toLowerCase();

  // Fase-beschrijving
  const phaseDescriptions: Record<string, string> = {
    interesseren: "verkent of het onderwijs iets is",
    orienteren: "bekijkt welke richting het beste past",
    beslissen: "staat voor een keuze en wilt het helder krijgen",
    matchen: "zoekt een concrete school of opleiding",
    voorbereiden: "maakt zich klaar voor de start",
  };
  parts.push(`De gebruiker ${phaseDescriptions[p] || phaseDescriptions.interesseren}.`);

  // Bekende interesses vertalen naar zinnen
  const role = slots.role_interest;
  const sector = slots.school_type || userSector?.toUpperCase();

  if (role && sector) {
    const sectorNames: Record<string, string> = { PO: "het basisonderwijs", VO: "het voortgezet onderwijs", MBO: "het mbo" };
    parts.push(`Interesse in ${role} in ${sectorNames[sector.toUpperCase()] || sector}.`);
  } else if (role) {
    parts.push(`Interesse in ${role}.`);
  } else if (sector) {
    const sectorNames: Record<string, string> = { PO: "het basisonderwijs", VO: "het voortgezet onderwijs", MBO: "het mbo" };
    parts.push(`Gericht op ${sectorNames[sector.toUpperCase()] || sector}.`);
  }

  if (slots.credential_goal) {
    parts.push(`Wil een bevoegdheid halen.`);
  }
  if (slots.region_preference) {
    parts.push(`Zoekt in de regio ${slots.region_preference}.`);
  }
  if (slots.admission_requirements) {
    parts.push(`Achtergrond: ${slots.admission_requirements}.`);
  }

  return parts.join(" ");
}

function assembleContext(
  phase: string,
  detector: DetectorPayload | undefined,
  profileMeta: ProfileMeta | undefined | null,
  userSector: string | undefined,
  phaseTransition: PhaseTransition | undefined,
  intent: IntentType,
): string {
  const slots = detector?.known_slots || {};
  const slotsFilledCount = Object.values(slots).filter(Boolean).length;
  const totalSlotsCount = detector?.missing_slots
    ? slotsFilledCount + detector.missing_slots.length
    : 9;

  const tone = selectTone(phase, slotsFilledCount, totalSlotsCount);
  const profile = interpretProfile(profileMeta);

  let transitionNote = "";
  if (phaseTransition) {
    transitionNote = `De gebruiker verschuift van "${phaseTransition.from}" naar "${phaseTransition.to}". Erken dit kort en positief. Pas je begeleiding aan op de nieuwe fase.`;
  }

  const parts: string[] = [];
  parts.push(`## DYNAMISCHE CONTEXT`);
  parts.push(`\n### Toon\n${tone}`);

  // Gehumaniseerde situatie (geen raw metadata)
  const situation = humanizeSituation(phase, slots, userSector);
  parts.push(`\n### Situatie\n${situation}`);

  // Kennis: afhankelijk van intent
  if (intent === "question") {
    const knowledge = resolveKnowledge(slots, phase);
    if (knowledge.length > 0) {
      parts.push(`\n### Achtergrondinformatie (gebruik dit inhoudelijk, noem geen labels)\n${knowledge.map(k => `- ${k}`).join("\n")}`);
    } else {
      parts.push(`\n### Achtergrondinformatie\n${BASELINE_KNOWLEDGE}`);
    }
  } else if (intent === "exploration") {
    parts.push(`\n### Achtergrondinformatie\n${BASELINE_KNOWLEDGE}`);
  } else if (intent === "followup") {
    const knowledge = resolveKnowledge(slots, phase);
    if (knowledge.length > 0) {
      parts.push(`\n### Achtergrondinformatie (gebruik dit inhoudelijk, noem geen labels)\n${knowledge.map(k => `- ${k}`).join("\n")}`);
    }
    // Bij followup zonder relevante kennis: geen kennisblok (LLM bouwt voort op gesprek)
  }
  // greeting: geen kennisblokken

  if (profile) {
    parts.push(`\n### Over de gebruiker\n${profile}`);
  }

  if (transitionNote) {
    parts.push(`\n### Fase-verschuiving\n${transitionNote}`);
  }

  // Token cap (~800 tokens)
  const assembled = parts.join("\n");
  const estimatedTokens = Math.ceil(assembled.length / 4);
  if (estimatedTokens > 800) {
    const trimmed = parts.slice(0, 4);
    if (profile) trimmed.push(`\n### Over de gebruiker\n${profile}`);
    return trimmed.join("\n");
  }

  return assembled;
}

// ─────────────────────────────────────────────────────────────────────
// Actions: SSOT-gestuurde acties (ongewijzigd)
// ─────────────────────────────────────────────────────────────────────
function actionsForNextSlot(
  slot: SlotKey,
  knownSlots?: Partial<Record<SlotKey, string>>,
): UiAction[] {
  if (slot === "school_type") {
    if (knownSlots?.role_interest === "vakexpertise") {
      return [
        { label: "MBO (instructeur)", value: "MBO als instructeur of vakspecialist" },
        { label: "VO (vakleerkracht)", value: "Vakleerkracht in het voortgezet onderwijs" },
        { label: "PO (vakspecialist)", value: "Specialist in het basisonderwijs" },
      ];
    }
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

// ─────────────────────────────────────────────────────────────────────
// Prompts — DRY: 1 core + 1 appendix (dashboard)
// ─────────────────────────────────────────────────────────────────────
const DOORAI_CORE = `Je bent DoorAI, de oriëntatie-assistent van Onderwijsloket Rotterdam.

## Rol en houding
- Je bent een warme, nuchtere wegwijzer: menselijk, direct, vriendelijk.
- Je helpt mensen orienteren op werken in het onderwijs.
- Positief en bemoedigend, maar zonder overdrijving of valse beloftes.
- Je zet opties naast elkaar en helpt de gebruiker zelf kiezen.
- Je bent geen recruiter en doet geen toezeggingen of garanties.

## Gesprekskwaliteit
- Als de vraag onduidelijk is: vraag 1 korte verduidelijking, of vat kort samen om te checken.
- Als vergelijken helpt: zet maximaal 2 opties naast elkaar (kort).
- Houd de volgende stap klein en concreet.

## Veiligheid en grenzen
- Vraag niet om gevoelige persoonsgegevens.
- Bij salaris/inschaling: alleen globaal, verwijs naar CAO/tabellen.
- Bij maatwerk: benoem dat het kan verschillen en verwijs naar een passende vervolgstap.

## Achtergrondinformatie
- Je krijgt achtergrondinformatie over routes, loketten en opleidingen in de context.
- Gebruik deze info inhoudelijk in je antwoord, maar noem NOOIT labels als "[Landelijk]" of "[Regionaal]".
- Verwerk de feiten natuurlijk in je tekst. Noem geen metadata of sectienames uit de context.

## Stijl
- Korte zinnen, weinig jargon.
- Geen lange lijstjes; alleen bullets als het echt helpt (max 2 bullets).
- Geen emojis.
- Gebruik geen emdash. Gebruik hooguit een streep of splits zinnen.
- Geen containerzinnen ("het hangt ervan af") zonder direct te concretiseren.

## Verboden zinnen
- "Goed dat je dit vraagt."
- "Ik begrijp je helemaal."
- "Als AI kan ik..."
- "Je moet ..."
- "Scenario" (in welke vorm dan ook)

## Gesprekshouding
- Reageer zoals een collega die je helpt: natuurlijk, niet gepolijst.
- Varieer je openingszinnen. Begin niet steeds met hetzelfde woord.
- Pak aan wat de gebruiker zegt en bouw daarop voort, in plaats van een standaard structuur te volgen.
`;

// Intent-specifieke appendix: vervangt de generieke DASHBOARD_APPENDIX
const INTENT_APPENDIX: Record<IntentType, string> = {
  greeting: `
## Modus: dashboard (ingelogd) - Begroeting
- De gebruiker groet je. Reageer warm en kort.
- Stel een open wedervraag om te ontdekken wat hen bezighoudt.
- Deel geen inhoudelijke info tenzij de gebruiker er specifiek om vraagt.
- Links worden door ons apart getoond onder de chat; noem ze niet in je tekst.
- Maximaal 60 woorden.
`,
  question: `
## Modus: dashboard (ingelogd) - Vraag
- De gebruiker heeft een specifieke vraag. Beantwoord deze gericht met de achtergrondinformatie.
- Gebruik de context om inhoudelijk te antwoorden.
- Als je niet genoeg weet voor een volledig antwoord, geef wat je weet en stel een gerichte wedervraag.
- Links worden door ons apart getoond onder de chat; noem ze niet in je tekst.
- Maximaal 120 woorden.
`,
  exploration: `
## Modus: dashboard (ingelogd) - Verkenning
- De gebruiker verkent, twijfelt of is nieuwsgierig. Geen informatiedump.
- Stel een korte wedervraag om te begrijpen waar de interesse ligt.
- Je mag de basisinfo gebruiken als het natuurlijk past, maar hou het kort.
- Links worden door ons apart getoond onder de chat; noem ze niet in je tekst.
- Maximaal 80 woorden.
`,
  followup: `
## Modus: dashboard (ingelogd) - Vervolg
- De gebruiker reageert op een eerder antwoord. Bouw voort op het gesprek.
- Gebruik de context alleen als het relevant is voor het lopende onderwerp.
- Houd het conversationeel en beknopt.
- Links worden door ons apart getoond onder de chat; noem ze niet in je tekst.
- Maximaal 120 woorden.
`,
};

// ─────────────────────────────────────────────────────────────────────
// F. Intent Classifier — stap 1 van multi-stap orchestratie
// ─────────────────────────────────────────────────────────────────────
const INTENT_CLASSIFY_PROMPT = `Classificeer het laatste bericht van de gebruiker. Antwoord ALLEEN met valide JSON.

Categorieën:
- "greeting": begroeting, kennismaking, hoi/hey/hallo, "ik ben nieuw"
- "question": specifieke vraag over routes, opleidingen, bevoegdheden, salaris, kosten
- "exploration": vage verkenning, twijfel, "ik ben benieuwd", "ik weet niet", "wat kan ik"
- "followup": reactie op een eerder antwoord, bevestiging, verduidelijking, "ja maar", "en als"

Antwoord formaat: {"intent":"greeting|question|exploration|followup"}`;

async function classifyIntent(
  messages: ChatMessage[],
  apiKey: string,
): Promise<IntentType> {
  try {
    // Neem de laatste 5 berichten voor context
    const recentMessages = messages.slice(-5);
    const lastUserMsg = [...recentMessages].reverse().find(m => m.role === "user")?.content ?? "";

    if (!lastUserMsg.trim()) return "greeting";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: INTENT_CLASSIFY_PROMPT },
          ...recentMessages.map(m => ({ role: m.role, content: m.content })),
        ],
        stream: false,
        temperature: 0,
      }),
    });

    if (!response.ok) {
      console.warn("Intent classification failed, falling back to 'question'");
      return "question";
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() ?? "";

    // Parse JSON response
    const match = content.match(/\{[^}]*"intent"\s*:\s*"(\w+)"[^}]*\}/);
    if (match) {
      const intent = match[1] as IntentType;
      if (["greeting", "question", "exploration", "followup"].includes(intent)) {
        return intent;
      }
    }

    console.warn("Intent parse failed, content:", content);
    return "question";
  } catch (e) {
    console.warn("Intent classification error:", e);
    return "question";
  }
}

// ─────────────────────────────────────────────────────────────────────
// Stream filter: replace emdash/en-dash
// ─────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────
// Handler — 2-staps orchestratie
// ─────────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, userPhase, userSector, detector, phase_transition, profileMeta }: RequestBody = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // ── Stap 1: Intent classificatie (snel, niet-streaming) ──
    const intent = await classifyIntent(messages, LOVABLE_API_KEY);

    // ── SSOT actions + links (deterministisch, ongewijzigd) ──
    const phase = detector?.phase_current || userPhase || "interesseren";
    const slots = detector?.known_slots || {};

    const ssotActions: UiAction[] = detector?.next_slot_key
      ? actionsForNextSlot(detector.next_slot_key, detector?.known_slots)
      : [];

    const uiLinks = computeLinks(phase, slots);

    // ── Stap 2: Context samenstellen op basis van intent ──
    const dynamicContext = assembleContext(phase, detector, profileMeta, userSector, phase_transition, intent);
    const systemPrompt = DOORAI_CORE + INTENT_APPENDIX[intent] + `\n\n${dynamicContext}`;

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
        return new Response(JSON.stringify({ error: "Te veel verzoeken, probeer het later opnieuw." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI-credits zijn op, neem contact op met de beheerder." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Er ging iets mis met de AI, probeer het opnieuw." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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

        // UI payload: actions + links
        await writer.write(
          encoder.encode(`data: ${JSON.stringify({ actions: ssotActions, links: uiLinks })}\n\n`),
        );
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
    console.error("DoorAI chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Onbekende fout" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
