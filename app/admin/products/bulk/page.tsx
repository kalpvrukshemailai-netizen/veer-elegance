/**
 * VEER ELEGANCE — /admin/products/bulk
 *
 * Admin bulk product management route.
 * requireAdmin() server guard ensures only administrators can access this page.
 */

import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { getAdminProductsWithDetails } from "@/lib/products-db";
import BulkProductManager from "@/components/admin/BulkProductManager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bulk Product Management — Veer Elegance Admin",
};

export default async function AdminBulkProductsPage() {
  await requireAdmin("/admin/products/bulk");

  const products = await getAdminProductsWithDetails();

  return <BulkProductManager initialProducts={products} />;
}
