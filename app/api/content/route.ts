/**
 * VEER ELEGANCE — Public Site Content API Route
 *
 * Provides fast read access to site_content sections for client components.
 */

import { NextResponse } from "next/server";
import { getSiteSectionContent, getAllSiteContent } from "@/lib/site-content";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const section = searchParams.get("section");

    if (section === "announcement" || section === "popup") {
      const data = await getSiteSectionContent(section);
      return NextResponse.json({ success: true, data });
    }

    const data = await getAllSiteContent();
    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : "Failed to fetch content";
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}
