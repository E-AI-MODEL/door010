import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { JourneySection } from "@/components/home/JourneySection";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { TestOnboardingPopup } from "@/components/onboarding/TestOnboardingPopup";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <TestOnboardingPopup />
      <Header />
      <main className="flex-1">
        <HeroSection />
        <JourneySection />
        <TestimonialsSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
