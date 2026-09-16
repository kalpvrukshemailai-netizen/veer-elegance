/**
 * VEER ELEGANCE — Homepage (Server Component)
 *
 * Journey:
 *  1. Announcement  — continuous horizontal marquee offer banner (if enabled)
 *  2. Hero          — cinematic chain-rain autoplay video
 *  3. Explorer      — asymmetric circular category circles
 *  4. Spotlight     — editorial cinematic section for selected category
 *  5. Products      — featured products for the active category (Supabase live)
 *  6. Popup Ad      — promotional ad modal (if enabled & configured)
 *
 * HomepageSections is a "use client" wrapper that owns the shared
 * activeId state and passes it to CollectionExplorer + EditorialCategorySpotlight.
 *
 * FeaturedProducts is an async Server Component (reads Supabase via next/headers).
 * It CANNOT be imported into a "use client" component. Instead, we pre-render
 * one instance per category at the Server Component level here, wrap each in
 * Suspense, and pass them as the featuredByCategory prop to HomepageSections.
 * HomepageSections renders the correct one based on the active category tab.
 *
 * This is the canonical RSC composition pattern:
 *   Server Component ─→ passes ReactNode children ─→ Client Component renders them
 *
 * Caching / Revalidation:
 *   force-dynamic ensures admin changes (featured ON/OFF, marketing, publish/unpublish)
 *   are reflected on the next customer request with no manual redeploy.
 */

import SiteNavbar          from "@/components/layout/SiteNavbar";
import HeroSection         from "@/components/sections/HeroSection";
import HomepageSections    from "@/components/sections/HomepageSections";
import FeaturedProducts    from "@/components/sections/FeaturedProducts";
import HomepagePopup       from "@/components/sections/HomepagePopup";
import { Suspense }        from "react";
import { CATEGORIES }      from "@/data/categories";
import { getSiteSectionContent } from "@/lib/site-content";

// Disable Next.js static caching for this page.
// Admin changes to featured/published products and marketing are reflected immediately.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const initialCategory = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)]?.id || "rings";

  // Fetch marketing settings in parallel
  const [announcement, popup] = await Promise.all([
    getSiteSectionContent("announcement"),
    getSiteSectionContent("popup"),
  ]);

  return (
    <>
      <SiteNavbar announcement={announcement} />
      <main id="main-content" role="main">
        <HeroSection />
        <HomepageSections
          initialActiveId={initialCategory}
          featuredByCategory={{
            // Each FeaturedProducts instance is an async Server Component.
            // It fetches only published + featured + !archived products for its category.
            // If no products qualify, Suspense resolves to null instantly.
            chains: (
              <Suspense fallback={null}>
                <FeaturedProducts category="chains" />
              </Suspense>
            ),
            rings: (
              <Suspense fallback={null}>
                <FeaturedProducts category="rings" />
              </Suspense>
            ),
            earrings: (
              <Suspense fallback={null}>
                <FeaturedProducts category="earrings" />
              </Suspense>
            ),
            bracelets: (
              <Suspense fallback={null}>
                <FeaturedProducts category="bracelets" />
              </Suspense>
            ),
            bangles: (
              <Suspense fallback={null}>
                <FeaturedProducts category="bangles" />
              </Suspense>
            ),
            "mystery-box": (
              <Suspense fallback={null}>
                <FeaturedProducts category="mystery-box" />
              </Suspense>
            ),
            "gen-z-accessories": (
              <Suspense fallback={null}>
                <FeaturedProducts category="gen-z-accessories" />
              </Suspense>
            ),
          }}
        />
      </main>
      <HomepagePopup content={popup} />
    </>
  );
}
