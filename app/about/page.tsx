/**
 * VEER ELEGANCE — /about
 *
 * Luxury brand editorial page featuring:
 *   1. About Hero ("Our Story / Veer Elegance")
 *   2. The Founder narrative & portrait architecture
 *   3. Brand Philosophy ("Why Veer Elegance")
 *   4. Wholesale & Bulk Enquiries form
 *   5. Physical Store / Studio information
 *
 * Server Component with live CMS content and rich SEO metadata.
 */

import type { Metadata }         from "next";
import SiteNavbar                from "@/components/layout/SiteNavbar";
import AboutHero                 from "@/components/about/AboutHero";
import FounderSection            from "@/components/about/FounderSection";
import BrandPhilosophySection    from "@/components/about/BrandPhilosophySection";
import WholesaleSection          from "@/components/about/WholesaleSection";
import StoreSection              from "@/components/about/StoreSection";
import { getAllSiteContent }     from "@/lib/site-content";

// Cache for 5 minutes — content changes via Admin CMS which calls revalidatePath("/about")
export const revalidate = 300;

export const metadata: Metadata = {
  title: "About & Our Story — Veer Elegance",
  description:
    "Discover the story of Veer Elegance. Premium everyday anti-tarnish jewellery crafted with quiet elegance, enduring materials, and effortless luxury.",
  openGraph: {
    title: "About Veer Elegance — Our Story & Craftsmanship",
    description:
      "Everyday luxury jewellery crafted to never tarnish. Read our story and explore wholesale and boutique partnerships.",
  },
};

export default async function AboutPage() {
  const content = await getAllSiteContent();

  return (
    <div style={{ background: "var(--color-parchment)", minHeight: "100dvh" }}>
      {/* Light-theme navbar for cream background pages */}
      <SiteNavbar theme="light" />

      <main id="main-content" role="main">
        {/* 1. Hero */}
        <AboutHero content={content.about} />

        {/* 2. The Founder */}
        <FounderSection content={content.founder} />

        {/* 3. Brand Philosophy */}
        <BrandPhilosophySection content={content.philosophy} />

        {/* 4. Wholesale & Bulk Enquiries */}
        <WholesaleSection content={content.wholesale} />

        {/* 5. Physical Store */}
        <StoreSection content={content.store} />
      </main>
    </div>
  );
}
