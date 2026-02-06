import { motion } from "framer-motion";
import { Heart, Compass, CheckCircle, Users, Briefcase } from "lucide-react";

const journeySteps = [
  {
    phase: 1,
    title: "Interesseren",
    description: "Ontdek wat werken in het onderwijs inhoudt en of het bij je past.",
    icon: Heart,
    color: "bg-rose-100 text-rose-600",
  },
  {
    phase: 2,
    title: "Oriënteren",
    description: "Verken de verschillende sectoren, rollen en mogelijkheden.",
    icon: Compass,
    color: "bg-amber-100 text-amber-600",
  },
  {
    phase: 3,
    title: "Beslissen",
    description: "Maak een weloverwogen keuze over je richting in het onderwijs.",
    icon: CheckCircle,
    color: "bg-emerald-100 text-emerald-600",
  },
  {
    phase: 4,
    title: "Matchen",
    description: "Vind de perfecte match tussen jouw profiel en beschikbare vacatures.",
    icon: Users,
    color: "bg-blue-100 text-blue-600",
  },
  {
    phase: 5,
    title: "Voorbereiden",
    description: "Bereid je voor op je nieuwe carrière met de juiste opleiding en begeleiding.",
    icon: Briefcase,
    color: "bg-violet-100 text-violet-600",
  },
];

export function JourneySection() {
  return (
    <section className="py-20 md:py-28 bg-background">
      <div className="container">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-3xl md:text-4xl font-bold text-foreground mb-4"
          >
            Jouw klantreis naar het onderwijs
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-lg text-muted-foreground max-w-2xl mx-auto"
          >
            DOOR begeleidt je door elke fase — van eerste interesse tot instroom in je nieuwe baan.
          </motion.p>
        </div>

        <div className="relative">
          {/* Connection line */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-border hidden lg:block" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 lg:gap-4">
            {journeySteps.map((step, index) => (
              <motion.div
                key={step.phase}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="relative"
              >
                <div className="bg-card border border-border rounded-xl p-6 h-full shadow-door hover:shadow-door-lg transition-shadow">
                  {/* Phase number */}
                  <div className="absolute -top-3 left-6 px-2 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded">
                    Fase {step.phase}
                  </div>

                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-lg ${step.color} flex items-center justify-center mb-4 mt-2`}>
                    <step.icon className="h-6 w-6" />
                  </div>

                  {/* Content */}
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
