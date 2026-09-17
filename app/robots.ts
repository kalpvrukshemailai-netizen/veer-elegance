/**
 * VEER ELEGANCE — robots.ts
 *
 * Controls which pages search engine crawlers can and cannot access.
 * - Admin panel, account pages, and checkout are blocked from indexing.
 * - All public storefront pages are crawlable.
 * - Points crawlers to the sitemap for efficient discovery.
 */

import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://veer-elegance.vercel.app";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: [
          "/admin/",
          "/account/",
          "/checkout/",
          "/api/",
          "/auth/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
