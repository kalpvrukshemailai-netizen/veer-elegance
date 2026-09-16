/**
 * VEER ELEGANCE — /api/admin/complete-the-look/search
 *
 * Candidate product search endpoint for admin Complete the Look builder.
 * Protected by requireAdmin().
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { searchCandidateProducts } from "@/lib/complete-the-look-server";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin("/admin");
    const { searchParams } = new URL(request.url);
    const baseProductId = searchParams.get("baseProductId");
    const q = searchParams.get("q") || "";
    const excludeRaw = searchParams.get("exclude") || "";
    const excludeIds = excludeRaw.split(",").map(s => s.trim()).filter(Boolean);

    const products = await searchCandidateProducts(baseProductId || undefined, {
      query: q,
      excludeIds,
      limit: 25,
    });

    return NextResponse.json({ success: true, products });
  } catch (err: any) {
    if (err?.digest?.startsWith?.("NEXT_REDIRECT")) throw err;
    return NextResponse.json(
      { success: false, error: err?.message || "Unauthorized" },
      { status: 401 }
    );
  }
}
