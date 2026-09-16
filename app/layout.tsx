import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";
import { CartProvider }     from "@/components/cart/CartProvider";
import { WishlistProvider } from "@/components/wishlist/WishlistProvider";
import CartDrawer           from "@/components/cart/CartDrawer";
import SiteFooter           from "@/components/layout/SiteFooter";
import { getAllSiteContent } from "@/lib/site-content";

// ──────────────────────────────────────────────────────────────────────
// Veer Elegance brand fonts
// Cormorant Garamond → editorial display / luxury headlines
// Manrope            → navigation / body / labels / functional UI
// ──────────────────────────────────────────────────────────────────────
const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Veer Elegance — Premium Anti-Tarnish Jewellery",
  description:
    "Discover Veer Elegance — thoughtfully crafted, premium everyday jewellery designed to last. Anti-tarnish, understated, timeless.",
  keywords: ["jewellery", "anti-tarnish", "premium jewellery", "Veer Elegance", "everyday jewellery"],
  openGraph: {
    title: "Veer Elegance",
    description: "Premium everyday anti-tarnish jewellery.",
    type: "website",
  },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const siteContent = await getAllSiteContent();

  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${manrope.variable}`}
    >
      <body>
        <CartProvider>
          <WishlistProvider>
            {children}
            {/* Global customer footer — automatically excluded on /admin and streamlined on /checkout */}
            <SiteFooter content={siteContent} />
            {/* CartDrawer is mounted once at the root — accessible from every page */}
            <CartDrawer />
          </WishlistProvider>
        </CartProvider>
      </body>
    </html>
  );
}

