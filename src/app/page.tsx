import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Hero } from "@/components/sections/hero";
import { HomeIntro } from "@/components/marketing/home-intro";
import { HomeLoopNav } from "@/components/marketing/home-loop-nav";
import { HomeAudience } from "@/components/marketing/home-audience";
import { AiContentStudio } from "@/components/sections/ai-content-studio";
import { AnalyticsSection } from "@/components/sections/analytics-section";
import { HomePlan } from "@/components/marketing/home-plan";
import { CampaignsSection } from "@/components/sections/campaigns-section";
import { HowItWorks } from "@/components/sections/how-it-works";
import { ProductOverview } from "@/components/sections/product-overview";
import { AiSection } from "@/components/sections/ai-section";
import { HomeAgency } from "@/components/marketing/home-agency";
import { Pricing } from "@/components/sections/pricing";
import { HomeFaq } from "@/components/marketing/home-faq";
import { FinalCta } from "@/components/sections/final-cta";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <Hero />
        <HomeIntro />
        <HomeLoopNav />
        <HomeAudience />
        <AiContentStudio />
        <AnalyticsSection />
        <HomePlan />
        <CampaignsSection />
        <HowItWorks />
        <ProductOverview />
        <AiSection />
        <HomeAgency />
        <Pricing />
        <HomeFaq />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
