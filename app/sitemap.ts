/**
 * VEER ELEGANCE — sitemap.ts
 *
 * Generates a dynamic XML sitemap for Google and other search engines.
 *
 * Includes:
 *  - Static pages (homepage, shop, about, collections, all category pages)
 *  - Dynamic product pages (fetched live from Supabase)
 *
 * Sitemap is served at /sitemap.xml automatically by Next.js.
 * Google Search Console: submit https://veer-elegance.vercel.app/sitemap.xml
 */

import type { MetadataRoute } from "next";
import { getPublishedProducts } from "@/lib/products-db";
import { CATEGORIES } from "@/data/categories";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://veer-elegance.vercel.app";

export const revalidate = 3600; // Re-generate sitemap every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // ── 1. Static pages ─────────────────────────────────────────────────────────
  const staticPages: MetadataRoute.Sitemap = [
    {
      url:              `${BASE_URL}/`,
      lastModified:     new Date(),
      changeFrequency:  "daily",
      priority:         1.0,
    },
    {
      url:              `${BASE_URL}/shop`,
      lastModified:     new Date(),
      changeFrequency:  "daily",
      priority:         0.9,
    },
    {
      url:              `${BASE_URL}/collections`,
      lastModified:     new Date(),
      changeFrequency:  "weekly",
      priority:         0.8,
    },
    {
      url:              `${BASE_URL}/about`,
      lastModified:     new Date(),
      changeFrequency:  "monthly",
      priority:         0.7,
    },
  ];

  // ── 2. Category pages ────────────────────────────────────────────────────────
  const categoryPages: MetadataRoute.Sitemap = CATEGORIES
    .filter(c => c.published)
    .map(cat => ({
      url:             `${BASE_URL}/shop/${cat.slug}`,
      lastModified:    new Date(),
      changeFrequency: "daily" as const,
      priority:        0.85,
    }));

  // ── 3. Dynamic product pages from Supabase ───────────────────────────────────
  let productPages: MetadataRoute.Sitemap = [];
  try {
    const products = await getPublishedProducts();
    productPages = products.map(p => ({
      url:             `${BASE_URL}/product/${p.slug}`,
      lastModified:    p.updated_at ? new Date(p.updated_at) : new Date(),
      changeFrequency: "weekly" as const,
      priority:        0.75,
    }));
  } catch {
    // If DB is unavailable during build, sitemap still works with static pages
  }

  return [...staticPages, ...categoryPages, ...productPages];
}
