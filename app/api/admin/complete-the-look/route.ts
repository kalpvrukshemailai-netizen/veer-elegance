/**
 * VEER ELEGANCE — /api/admin/complete-the-look
 *
 * Admin REST endpoint for Complete the Look management.
 * Protected by requireAdmin().
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import {
  getAdminCompleteTheLook,
  getAllAdminCompleteTheLooks,
  toggleCompleteTheLookStatus,
  upsertCompleteTheLook,
  deleteCompleteTheLook,
} from "@/lib/complete-the-look-server";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin("/admin");
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    if (productId) {
      const set = await getAdminCompleteTheLook(productId);
      return NextResponse.json({ success: true, set });
    }

    // When no productId provided, return all configured looks for the dedicated admin list
    const looks = await getAllAdminCompleteTheLooks();
    return NextResponse.json({ success: true, looks });
  } catch (err: any) {
    if (err?.digest?.startsWith?.("NEXT_REDIRECT")) throw err;
    return NextResponse.json(
      { success: false, error: err?.message || "Unauthorized" },
      { status: 401 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin("/admin");
    const body = await request.json();

    const {
      baseProductId,
      bundlePrice,
      enabled = false,
      couponAllowed = true,
      itemProductIds = [],
    } = body;

    const result = await upsertCompleteTheLook({
      baseProductId,
      bundlePrice,
      enabled,
      couponAllowed,
      itemProductIds,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, set: result.set });
  } catch (err: any) {
    if (err?.digest?.startsWith?.("NEXT_REDIRECT")) throw err;
    return NextResponse.json(
      { success: false, error: err?.message || "Unauthorized" },
      { status: 401 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin("/admin");
    const body = await request.json();
    const { id, setId, productId, baseProductId, enabled } = body || {};

    const targetId = id || setId || productId || baseProductId;
    if (!targetId || typeof enabled !== "boolean") {
      return NextResponse.json(
        { success: false, error: "Missing required fields (id/productId and enabled boolean)." },
        { status: 400 }
      );
    }

    const result = await toggleCompleteTheLookStatus(targetId, enabled);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, set: result.set });
  } catch (err: any) {
    if (err?.digest?.startsWith?.("NEXT_REDIRECT")) throw err;
    return NextResponse.json(
      { success: false, error: err?.message || "Unauthorized" },
      { status: 401 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin("/admin");
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    const setId     = searchParams.get("setId") || searchParams.get("id");

    const target = productId || setId;

    if (!target) {
      return NextResponse.json(
        { success: false, error: "Missing productId or setId query parameter." },
        { status: 400 }
      );
    }

    const result = await deleteCompleteTheLook(target);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err?.digest?.startsWith?.("NEXT_REDIRECT")) throw err;
    return NextResponse.json(
      { success: false, error: err?.message || "Unauthorized" },
      { status: 401 }
    );
  }
}
