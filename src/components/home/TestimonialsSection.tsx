import { motion } from "framer-motion";

const testimonials = [
  {
    quote: "Dankzij DOOR heb ik precies de juiste stappen kunnen zetten om zij-instromer te worden. De AI-coach hielp me bij elke vraag.",
    author: "Maria van der Berg",
    role: "Zij-instromer Wiskunde",
    sector: "VO",
  },
  {
    quote: "Het platform gaf mij direct inzicht in alle vacatures die bij mijn profiel pasten. Binnen twee maanden had ik een baan.",
    author: "Thomas de Vries",
    role: "Docent Basisonderwijs",
    sector: "PO",
  },
  {
    quote: "Als student was ik zoekende naar de juiste route. DOOR heeft mij door de hele oriëntatiefase geloodst met persoonlijk advies.",
    author: "Sophie Janssen",
    role: "Student Pabo",
    sector: "PO",
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-20 md:py-28 bg-muted/30">
      <div className="container">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-3xl md:text-4xl font-bold text-foreground mb-4"
          >
            Succesverhalen
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-lg text-muted-foreground max-w-2xl mx-auto"
          >
            Ontdek hoe anderen hun weg naar het onderwijs hebben gevonden met DOOR.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative bg-card border border-border rounded-lg p-6"
            >
              {/* Large quote mark */}
              <span className="absolute top-4 left-6 text-6xl text-border font-serif leading-none select-none">
                "
              </span>

              {/* Quote text */}
              <blockquote className="relative z-10 text-foreground pt-8 mb-6 leading-relaxed">
                {testimonial.quote}
              </blockquote>

              {/* Author */}
              <div className="border-t border-border pt-4">
                <div className="font-medium text-foreground text-sm">{testimonial.author}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {testimonial.role} · {testimonial.sector}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
