import { motion } from "framer-motion";

const journeySteps = [
  {
    phase: 1,
    title: "Interesseren",
    description: "Ontdek wat werken in het onderwijs inhoudt en of het bij je past.",
  },
  {
    phase: 2,
    title: "Oriënteren",
    description: "Verken de verschillende sectoren, rollen en mogelijkheden.",
  },
  {
    phase: 3,
    title: "Beslissen",
    description: "Maak een weloverwogen keuze over je richting in het onderwijs.",
  },
  {
    phase: 4,
    title: "Matchen",
    description: "Vind de perfecte match tussen jouw profiel en beschikbare vacatures.",
  },
  {
    phase: 5,
    title: "Voorbereiden",
    description: "Bereid je voor op je nieuwe carrière met de juiste opleiding en begeleiding.",
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

        {/* Horizontal timeline design */}
        <div className="relative">
          {/* Progress line */}
          <div className="absolute top-6 left-0 right-0 h-px bg-border hidden lg:block" />
          <div className="absolute top-6 left-0 w-1/2 h-px bg-primary hidden lg:block" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-6">
            {journeySteps.map((step, index) => (
              <motion.div
                key={step.phase}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                className="relative"
              >
                {/* Step indicator */}
                <div className="flex items-center gap-3 mb-4 lg:flex-col lg:items-start">
                  <div className="relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-2 border-border bg-background text-lg font-semibold text-foreground lg:mb-0">
                    {step.phase}
                  </div>
                  <div className="lg:hidden h-px flex-1 bg-border" />
                </div>

                {/* Content */}
                <div className="lg:pt-4">
                  <h3 className="text-base font-semibold text-foreground mb-1.5">
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
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
