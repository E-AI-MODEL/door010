import { motion } from "framer-motion";
import { Quote } from "lucide-react";

const testimonials = [
  {
    quote: "Dankzij DOOR heb ik precies de juiste stappen kunnen zetten om zij-instromer te worden. De AI-coach hielp me bij elke vraag.",
    author: "Maria van der Berg",
    role: "Zij-instromer Wiskunde",
    sector: "VO",
    avatar: "M",
  },
  {
    quote: "Het platform gaf mij direct inzicht in alle vacatures die bij mijn profiel pasten. Binnen twee maanden had ik een baan.",
    author: "Thomas de Vries",
    role: "Docent Basisonderwijs",
    sector: "PO",
    avatar: "T",
  },
  {
    quote: "Als student was ik zoekende naar de juiste route. DOOR heeft mij door de hele oriëntatiefase geloodst met persoonlijk advies.",
    author: "Sophie Janssen",
    role: "Student Pabo",
    sector: "PO",
    avatar: "S",
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-card border border-border rounded-xl p-8 shadow-door"
            >
              {/* Quote icon */}
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <Quote className="h-5 w-5 text-primary" />
              </div>

              {/* Quote text */}
              <blockquote className="text-foreground mb-6">
                "{testimonial.quote}"
              </blockquote>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                  {testimonial.avatar}
                </div>
                <div>
                  <div className="font-medium text-foreground">{testimonial.author}</div>
                  <div className="text-sm text-muted-foreground">
                    {testimonial.role} • {testimonial.sector}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
