import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight, MessageCircle, ExternalLink, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { phaseData, type OrientationPhase } from "@/data/dashboard-phases";
import type { KnownSlots } from "@/utils/phaseDetectorEngine";

interface TopicMenuItem {
  label: string;
  chatMessage?: string;
  href?: string;
  external?: boolean;
}

interface TopicGroup {
  title: string;
  icon: React.ElementType;
  items: TopicMenuItem[];
}

function getPhaseTopics(phase: OrientationPhase): TopicMenuItem[] {
  const map: Record<OrientationPhase, TopicMenuItem[]> = {
    interesseren: [
      { label: "Wat doet een leraar?", chatMessage: "Wat doet een leraar precies in het dagelijks werk?" },
      { label: "Sectoren vergelijken", chatMessage: "Wat zijn de verschillen tussen PO, VO en MBO?" },
      { label: "Is onderwijs iets voor mij?", chatMessage: "Hoe weet ik of het onderwijs bij me past?" },
    ],
    orienteren: [
      { label: "Routes bekijken", chatMessage: "Welke routes zijn er voor mij om leraar te worden?" },
      { label: "Bevoegdheden uitgelegd", chatMessage: "Welke bevoegdheden bestaan er en wat heb ik nodig?" },
      { label: "Kosten en duur", chatMessage: "Wat kost een lerarenopleiding en hoe lang duurt het?" },
    ],
    beslissen: [
      { label: "Opleidingen vergelijken", chatMessage: "Welke opleidingen passen bij mijn situatie?" },
      { label: "Subsidiemogelijkheden", chatMessage: "Welke subsidies en financieringsmogelijkheden zijn er?" },
      { label: "Zij-instroom uitgelegd", chatMessage: "Hoe werkt zij-instroom precies?" },
    ],
    matchen: [
      { label: "Vacatures in Rotterdam", chatMessage: "Welke onderwijsvacatures zijn er in Rotterdam?" },
      { label: "Sollicitatietips", chatMessage: "Heb je tips voor solliciteren in het onderwijs?" },
      { label: "Wat verwachten scholen?", chatMessage: "Waar letten scholen op bij nieuwe leraren?" },
    ],
    voorbereiden: [
      { label: "Wat moet ik regelen?", chatMessage: "Wat moet ik allemaal regelen voor mijn start als leraar?" },
      { label: "Eerste werkdag tips", chatMessage: "Hoe bereid ik me voor op mijn eerste dag voor de klas?" },
      { label: "Inwerkprogramma", chatMessage: "Wat kan ik verwachten van een inwerkprogramma?" },
    ],
  };
  return map[phase];
}

function getSlotTopics(slots: KnownSlots): TopicMenuItem[] {
  const items: TopicMenuItem[] = [];
  const st = slots.school_type;
  if (st === "PO") {
    items.push(
      { label: "Pabo-opleiding", chatMessage: "Vertel me meer over de Pabo-opleiding." },
      { label: "Zij-instroom PO", chatMessage: "Hoe werkt zij-instroom in het basisonderwijs?" },
    );
  } else if (st === "VO") {
    items.push(
      { label: "Eerstegraads vs tweedegraads", chatMessage: "Wat is het verschil tussen eerste- en tweedegraads bevoegdheid?" },
      { label: "Universitaire lerarenopleiding", chatMessage: "Hoe werkt de universitaire lerarenopleiding?" },
    );
  } else if (st === "MBO") {
    items.push(
      { label: "Lesgeven in het MBO", chatMessage: "Wat heb ik nodig om les te geven in het MBO?" },
      { label: "PDG-traject", chatMessage: "Wat is het PDG-traject en voor wie is het geschikt?" },
    );
  }
  if (slots.role_interest) {
    items.push({ label: `Meer over ${slots.role_interest}`, chatMessage: `Vertel me meer over de functie ${slots.role_interest} in het onderwijs.` });
  }
  return items;
}

const FAQ_TOPICS: TopicMenuItem[] = [
  { label: "Salaris leraar", chatMessage: "Wat verdient een leraar gemiddeld?" },
  { label: "Toelatingseisen", chatMessage: "Wat zijn de toelatingseisen voor lerarenopleidingen?" },
  { label: "Lerarentekort", chatMessage: "Hoe zit het met het lerarentekort in Rotterdam?" },
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
                  <button
                    key={i}
                    onClick={() => item.chatMessage && onSendMessage(item.chatMessage)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-primary/10 hover:text-primary transition-colors text-left"
                  >
                    <ChevronRight className="h-3 w-3 text-primary/60 shrink-0" />
                    <span>{item.label}</span>
                  </button>
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
      icon: MessageCircle,
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
        className="w-full flex items-center justify-between px-4 py-3 lg:hidden"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Onderwerpen</span>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${menuOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Desktop: always visible header */}
      <div className="hidden lg:flex items-center gap-2 px-4 py-3 border-b border-border">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Onderwerpen</span>
      </div>

      {/* Content */}
      <AnimatePresence>
        {(menuOpen || typeof window !== "undefined") && (
          <motion.div
            initial={false}
            className={`${menuOpen ? "block" : "hidden"} lg:block`}
          >
            {groups.map((group, i) => (
              <TopicGroupSection
                key={i}
                group={group}
                onSendMessage={onSendMessage}
                defaultOpen={i === 0}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
