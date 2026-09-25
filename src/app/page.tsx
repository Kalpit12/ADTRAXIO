import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Hero } from "@/components/sections/hero";
import { SocialProof } from "@/components/sections/social-proof";
import { Problem } from "@/components/sections/problem";
import { ProductOverview } from "@/components/sections/product-overview";
import { AiSection } from "@/components/sections/ai-section";
import { AiContentStudio } from "@/components/sections/ai-content-studio";
import { CampaignsSection } from "@/components/sections/campaigns-section";
import { AnalyticsSection } from "@/components/sections/analytics-section";
import { HowItWorks } from "@/components/sections/how-it-works";
import { Pricing } from "@/components/sections/pricing";
import { FinalCta } from "@/components/sections/final-cta";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <Hero />
        <SocialProof />
        <Problem />
        <ProductOverview />
        <AiSection />
        <AiContentStudio />
        <CampaignsSection />
        <AnalyticsSection />
        <HowItWorks />
        <Pricing />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
