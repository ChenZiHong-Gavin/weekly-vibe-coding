import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import AppsSection from "@/components/AppsSection";
import ProgressSection from "@/components/ProgressSection";
import AboutSection from "@/components/AboutSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-radial">
      <Navbar />
      <Hero />
      <AppsSection />
      <ProgressSection />
      <AboutSection />
      <Footer />
    </div>
  );
};

export default Index;
