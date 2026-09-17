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
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://veer-elegance.vercel.app"
  ),
  title: {
    default:  "Veer Elegance — Premium Anti-Tarnish Jewellery",
    template: "%s — Veer Elegance",
  },
  description:
    "Discover Veer Elegance — thoughtfully crafted, premium everyday jewellery designed to last. Anti-tarnish stainless steel chains, rings, earrings, bracelets & bangles. Free shipping over ₹1,499.",
  keywords: [
    "anti-tarnish jewellery",
    "stainless steel jewellery India",
    "everyday jewellery",
    "premium jewellery online",
    "gold jewellery India",
    "Veer Elegance",
    "waterproof jewellery",
    "chains online India",
    "rings online India",
    "earrings online India",
    "bracelets online India",
    "bangles online India",
    "jewellery that doesn't tarnish",
    "affordable luxury jewellery",
  ],
  authors:  [{ name: "Veer Elegance", url: "https://veer-elegance.vercel.app" }],
  creator:  "Veer Elegance",
  openGraph: {
    type:        "website",
    locale:      "en_IN",
    url:         "https://veer-elegance.vercel.app",
    siteName:    "Veer Elegance",
    title:       "Veer Elegance — Premium Anti-Tarnish Jewellery",
    description: "Premium everyday anti-tarnish jewellery. Stainless steel chains, rings, earrings & bracelets. Free shipping on orders over ₹1,499.",
    images: [
      {
        url:    "/images/og-default.jpg",
        width:  1200,
        height: 630,
        alt:    "Veer Elegance — Premium Anti-Tarnish Jewellery",
      },
    ],
  },
  twitter: {
    card:        "summary_large_image",
    title:       "Veer Elegance — Premium Anti-Tarnish Jewellery",
    description: "Premium everyday anti-tarnish jewellery crafted to last.",
    images:      ["/images/og-default.jpg"],
  },
  robots: {
    index:          true,
    follow:         true,
    googleBot: {
      index:             true,
      follow:            true,
      "max-image-preview": "large",
      "max-snippet":       -1,
    },
  },
  alternates: {
    canonical: "https://veer-elegance.vercel.app",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "32x32" },
      { url: "/images/veer-elegance-logo.png", type: "image/png", sizes: "500x500" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
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

