import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight, MessageCircle, ExternalLink, Sparkles, Send, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { phaseData, type OrientationPhase } from "@/data/dashboard-phases";
import type { KnownSlots } from "@/utils/phaseDetectorEngine";

interface SubTopic {
  label: string;
  chatMessage: string;
}

interface TopicMenuItem {
  label: string;
  chatMessage?: string;
  href?: string;
  external?: boolean;
  subTopics?: SubTopic[];
}

interface TopicGroup {
  title: string;
  icon: React.ElementType;
  items: TopicMenuItem[];
}

function getPhaseTopics(phase: OrientationPhase): TopicMenuItem[] {
  const map: Record<OrientationPhase, TopicMenuItem[]> = {
    interesseren: [
      {
        label: "Wat doet een leraar?",
        subTopics: [
          { label: "Dagelijks werk", chatMessage: "Hoe ziet een typische werkdag van een leraar eruit?" },
          { label: "Werkdruk & balans", chatMessage: "Hoe zit het met werkdruk en werk-privébalans als leraar?" },
          { label: "Carrièremogelijkheden", chatMessage: "Welke doorgroeimogelijkheden zijn er als leraar?" },
        ],
      },
      {
        label: "Sectoren vergelijken",
        subTopics: [
          { label: "Basisonderwijs (PO)", chatMessage: "Vertel me over lesgeven in het basisonderwijs (PO)." },
          { label: "Voortgezet onderwijs (VO)", chatMessage: "Vertel me over lesgeven in het voortgezet onderwijs (VO)." },
          { label: "Middelbaar beroepsonderwijs (MBO)", chatMessage: "Vertel me over lesgeven in het MBO." },
          { label: "PO vs VO vs MBO", chatMessage: "Wat zijn de verschillen tussen PO, VO en MBO qua lesgeven?" },
        ],
      },
      {
        label: "Is onderwijs iets voor mij?",
        chatMessage: "Hoe weet ik of het onderwijs bij me past?",
      },
    ],
    orienteren: [
      {
        label: "Routes naar het leraarschap",
        subTopics: [
          { label: "Overzicht alle routes", chatMessage: "Welke routes zijn er om leraar te worden?" },
          { label: "Zij-instroom", chatMessage: "Hoe werkt zij-instroom precies en voor wie is het geschikt?" },
          { label: "Pabo / lerarenopleiding", chatMessage: "Wat is het verschil tussen de Pabo en andere lerarenopleidingen?" },
          { label: "Kopopleiding", chatMessage: "Wat is een kopopleiding en wanneer is dat een optie?" },
        ],
      },
      {
        label: "Bevoegdheden",
        subTopics: [
          { label: "Eerste- vs tweedegraads", chatMessage: "Wat is het verschil tussen eerste- en tweedegraads bevoegdheid?" },
          { label: "Welke bevoegdheid heb ik nodig?", chatMessage: "Welke bevoegdheid heb ik nodig voor het type onderwijs dat mij interesseert?" },
        ],
      },
      {
        label: "Kosten en duur",
        subTopics: [
          { label: "Opleidingsduur per route", chatMessage: "Hoe lang duren de verschillende routes naar het leraarschap?" },
          { label: "Kosten & financiering", chatMessage: "Wat kost een lerarenopleiding en welke financieringsopties zijn er?" },
        ],
      },
    ],
    beslissen: [
      {
        label: "Opleidingen vergelijken",
        subTopics: [
          { label: "Voltijd vs deeltijd", chatMessage: "Wat zijn de voor- en nadelen van voltijd vs deeltijd studeren?" },
          { label: "Opleidingen in de regio", chatMessage: "Welke lerarenopleidingen zijn er in de regio Rotterdam?" },
          { label: "Startmomenten", chatMessage: "Wanneer kan ik starten met een lerarenopleiding?" },
        ],
      },
      {
        label: "Financiering",
        subTopics: [
          { label: "Subsidies overzicht", chatMessage: "Welke subsidies en tegemoetkomingen zijn er voor aanstaande leraren?" },
          { label: "Lerarenbeurs", chatMessage: "Hoe werkt de Lerarenbeurs en kom ik in aanmerking?" },
          { label: "Zij-instroom subsidie", chatMessage: "Welke subsidie is er voor zij-instromers?" },
        ],
      },
      {
        label: "Zij-instroom uitgelegd",
        chatMessage: "Hoe werkt zij-instroom precies en wat zijn de stappen?",
      },
    ],
    matchen: [
      {
        label: "Werk vinden",
        subTopics: [
          { label: "Vacatures Rotterdam", chatMessage: "Welke onderwijsvacatures zijn er in Rotterdam?" },
          { label: "Sollicitatietips", chatMessage: "Heb je tips voor solliciteren in het onderwijs?" },
          { label: "Wat verwachten scholen?", chatMessage: "Waar letten scholen op bij nieuwe leraren?" },
        ],
      },
      {
        label: "Netwerken",
        subTopics: [
          { label: "Banenmarkten & events", chatMessage: "Welke banenmarkten en events zijn er voor het onderwijs?" },
          { label: "Scholen benaderen", chatMessage: "Hoe kan ik zelf scholen benaderen voor een baan?" },
        ],
      },
    ],
    voorbereiden: [
      {
        label: "Praktische voorbereiding",
        subTopics: [
          { label: "Inschrijving regelen", chatMessage: "Wat moet ik allemaal regelen voor mijn inschrijving?" },
          { label: "Eerste werkdag tips", chatMessage: "Hoe bereid ik me voor op mijn eerste dag voor de klas?" },
          { label: "Inwerkprogramma", chatMessage: "Wat kan ik verwachten van een inwerkprogramma?" },
        ],
      },
      {
        label: "Administratie",
        subTopics: [
          { label: "VOG aanvragen", chatMessage: "Hoe vraag ik een VOG aan voor het onderwijs?" },
          { label: "Registerleraar", chatMessage: "Moet ik me inschrijven in het lerarenregister?" },
        ],
      },
    ],
  };
  return map[phase];
}

function getSlotTopics(slots: KnownSlots): TopicMenuItem[] {
  const items: TopicMenuItem[] = [];
  const st = slots.school_type;
  if (st === "PO") {
    items.push({
      label: "Basisonderwijs (PO)",
      subTopics: [
        { label: "Pabo-opleiding", chatMessage: "Vertel me meer over de Pabo-opleiding." },
        { label: "Zij-instroom PO", chatMessage: "Hoe werkt zij-instroom in het basisonderwijs?" },
        { label: "Academische Pabo", chatMessage: "Wat is de Academische Pabo en wat is het verschil met de reguliere Pabo?" },
      ],
    });
  } else if (st === "VO") {
    items.push({
      label: "Voortgezet onderwijs (VO)",
      subTopics: [
        { label: "Eerstegraads vs tweedegraads", chatMessage: "Wat is het verschil tussen eerste- en tweedegraads bevoegdheid?" },
        { label: "Universitaire lerarenopleiding", chatMessage: "Hoe werkt de universitaire lerarenopleiding?" },
        { label: "Vakken en bevoegdheden", chatMessage: "Voor welke vakken kan ik bevoegd worden in het VO?" },
      ],
    });
  } else if (st === "MBO") {
    items.push({
      label: "Middelbaar beroepsonderwijs (MBO)",
      subTopics: [
        { label: "Lesgeven in het MBO", chatMessage: "Wat heb ik nodig om les te geven in het MBO?" },
        { label: "PDG-traject", chatMessage: "Wat is het PDG-traject en voor wie is het geschikt?" },
        { label: "Werkervaring als eis", chatMessage: "Welke werkervaring heb ik nodig voor het MBO?" },
      ],
    });
  }
  if (slots.role_interest) {
    items.push({
      label: `Meer over ${slots.role_interest}`,
      chatMessage: `Vertel me meer over de functie ${slots.role_interest} in het onderwijs.`,
    });
  }
  return items;
}

const FAQ_TOPICS: TopicMenuItem[] = [
  {
    label: "Salaris & arbeidsvoorwaarden",
    subTopics: [
      { label: "Salaris leraar", chatMessage: "Wat verdient een leraar gemiddeld?" },
      { label: "CAO onderwijs", chatMessage: "Wat staat er in de CAO voor het onderwijs?" },
    ],
  },
  { label: "Toelatingseisen", chatMessage: "Wat zijn de toelatingseisen voor lerarenopleidingen?" },
  { label: "Lerarentekort Rotterdam", chatMessage: "Hoe zit het met het lerarentekort in Rotterdam?" },
];

const QUICK_LINKS: TopicMenuItem[] = [
  { label: "Vacatures", href: "/vacatures" },
  { label: "Events & open dagen", href: "/events" },
  { label: "Opleidingen", href: "/opleidingen" },
  { label: "Kennisbank", href: "/kennisbank" },
];

interface TopicMenuProps {
  currentPhase: OrientationPhase;
  knownSlots: KnownSlots;
  onSendMessage: (message: string) => void;
  collapsed?: boolean;
}

/** A single topic item — either has subTopics (expandable) or a direct chatMessage with confirm button */
function TopicItem({ item, onSendMessage }: { item: TopicMenuItem; onSendMessage: (msg: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [selectedSub, setSelectedSub] = useState<string | null>(null);

  // Item with subTopics → expandable
  if (item.subTopics && item.subTopics.length > 0) {
    return (
      <div className="rounded-lg">
        <button
          onClick={() => { setExpanded(!expanded); setSelectedSub(null); }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-muted/70 transition-colors text-left"
        >
          <ChevronRight className={`h-3 w-3 text-primary/60 shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`} />
          <span className="flex-1">{item.label}</span>
          <span className="text-[10px] text-muted-foreground">{item.subTopics.length}</span>
        </button>
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <div className="ml-5 pl-2 border-l-2 border-primary/15 space-y-0.5 pb-1">
                {item.subTopics.map((sub, j) => (
                  <div key={j}>
                    <button
                      onClick={() => setSelectedSub(selectedSub === sub.label ? null : sub.label)}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[13px] transition-colors text-left ${
                        selectedSub === sub.label
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }`}
                    >
                      <span className="flex-1">{sub.label}</span>
                    </button>
                    <AnimatePresence>
                      {selectedSub === sub.label && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.12 }}
                          className="overflow-hidden"
                        >
                          <div className="flex items-center gap-2 px-2.5 py-1.5 ml-2">
                            <p className="text-[11px] text-muted-foreground flex-1 italic">
                              &ldquo;{sub.chatMessage}&rdquo;
                            </p>
                            <Button
                              size="sm"
                              variant="default"
                              className="h-6 px-2 text-[11px] gap-1 shrink-0"
                              onClick={() => onSendMessage(sub.chatMessage)}
                            >
                              <Send className="h-2.5 w-2.5" />
                              Stel vraag
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Item without subTopics → direct question with confirm
  if (item.chatMessage) {
    return (
      <div className="rounded-lg">
        <button
          onClick={() => setSelectedSub(selectedSub ? null : item.label)}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
            selectedSub ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted/70"
          }`}
        >
          <ChevronRight className="h-3 w-3 text-primary/60 shrink-0" />
          <span className="flex-1">{item.label}</span>
        </button>
        <AnimatePresence>
          {selectedSub && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 px-3 py-1.5 ml-5">
                <p className="text-[11px] text-muted-foreground flex-1 italic">
                  &ldquo;{item.chatMessage}&rdquo;
                </p>
                <Button
                  size="sm"
                  variant="default"
                  className="h-6 px-2 text-[11px] gap-1 shrink-0"
                  onClick={() => onSendMessage(item.chatMessage!)}
                >
                  <Send className="h-2.5 w-2.5" />
                  Stel vraag
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return null;
}

function TopicGroupSection({ group, onSendMessage, defaultOpen }: { group: TopicGroup; onSendMessage: (msg: string) => void; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const Icon = group.icon;

  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors"
      >
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 text-left">{group.title}</span>
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-2 pb-2 space-y-0.5">
              {group.items.map((item, i) =>
                item.href ? (
                  <Link
                    key={i}
                    to={item.href}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                ) : (
                  <TopicItem key={i} item={item} onSendMessage={onSendMessage} />
                )
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function TopicMenu({ currentPhase, knownSlots, onSendMessage, collapsed }: TopicMenuProps) {
  const [menuOpen, setMenuOpen] = useState(!collapsed);
  const phaseInfo = phaseData[currentPhase];

  const phaseTopics = getPhaseTopics(currentPhase);
  const slotTopics = getSlotTopics(knownSlots);

  const groups: TopicGroup[] = [
    {
      title: `${phaseInfo.title}-fase`,
      icon: Sparkles,
      items: phaseTopics,
    },
  ];

  if (slotTopics.length > 0) {
    groups.push({
      title: "Op basis van jouw profiel",
      icon: BookOpen,
      items: slotTopics,
    });
  }

  groups.push({
    title: "Veelgestelde vragen",
    icon: MessageCircle,
    items: FAQ_TOPICS,
  });

  groups.push({
    title: "Snelle links",
    icon: ExternalLink,
    items: QUICK_LINKS,
  });

  return (
    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
      {/* Mobile toggle */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="w-full flex items-center justify-between px-4 py-3 md:hidden"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Onderwerpen</span>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${menuOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Desktop: always visible header */}
      <div className="hidden md:flex items-center gap-2 px-4 py-3 border-b border-border">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Onderwerpen</span>
      </div>

      {/* Content */}
      <div className={`${menuOpen ? "block" : "hidden"} md:block`}>
        {groups.map((group, i) => (
          <TopicGroupSection
            key={i}
            group={group}
            onSendMessage={(msg) => {
              onSendMessage(msg);
              // Auto-collapse on mobile after sending
              if (window.innerWidth < 768) setMenuOpen(false);
            }}
            defaultOpen={i === 0}
          />
        ))}
      </div>
    </div>
  );
}
