/**
 * VEER ELEGANCE — /admin/content
 *
 * Admin Content Editor (Mini CMS).
 * Protected route for store owners to manage editorial copy, founder bio,
 * brand philosophy, physical store details, and footer text without code changes.
 */

import type { Metadata }         from "next";
import { requireAdmin }          from "@/lib/admin";
import { getAllSiteContent }     from "@/lib/site-content";
import ContentEditorClient       from "@/components/admin/content/ContentEditorClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Site Content & CMS — Admin — Veer Elegance",
  description: "Manage editorial copy, founder narrative, and brand content.",
};

export default async function AdminContentPage() {
  await requireAdmin("/admin/content");

  const content = await getAllSiteContent();

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", paddingBottom: "4rem" }}>
      <ContentEditorClient initialContent={content} />
    </div>
  );
}
