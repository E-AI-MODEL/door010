import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { JourneySection } from "@/components/home/JourneySection";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { AIWidgetSection } from "@/components/home/AIWidgetSection";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <JourneySection />
        <TestimonialsSection />
        <AIWidgetSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
