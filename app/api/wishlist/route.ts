/**
 * VEER ELEGANCE — /api/wishlist
 *
 * REST endpoint for customer wishlist.
 * Strictly requires customer authentication:
 *   GET    → 401 if unauthenticated, otherwise returns { success: true, slugs: string[] }
 *   POST   → 401 if unauthenticated, adds single slug ({ slug }) to public.wishlists
 *   DELETE → 401 if unauthenticated, removes single slug ({ slug }) from public.wishlists
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getUserWishlistSlugs,
  addToUserWishlist,
  removeFromUserWishlist,
} from "@/lib/wishlist-server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Authentication required to view wishlist." },
      { status: 401 }
    );
  }

  const slugs = await getUserWishlistSlugs(user.id, supabase);
  return NextResponse.json({ success: true, slugs });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Authentication required to save to wishlist." },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ success: false, error: "Missing body." }, { status: 400 });
  }

  const { slug } = body as { slug?: unknown };
  if (typeof slug !== "string" || !slug.trim()) {
    return NextResponse.json({ success: false, error: "Product slug is required." }, { status: 400 });
  }

  const ok = await addToUserWishlist(user.id, slug.trim(), supabase);
  if (!ok) {
    return NextResponse.json({ success: false, error: "Failed to add to wishlist." }, { status: 500 });
  }

  const slugs = await getUserWishlistSlugs(user.id, supabase);
  return NextResponse.json({ success: true, slugs });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Authentication required to modify wishlist." },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ success: false, error: "Missing body." }, { status: 400 });
  }

  const { slug } = body as { slug?: unknown };
  if (typeof slug !== "string" || !slug.trim()) {
    return NextResponse.json({ success: false, error: "Product slug is required." }, { status: 400 });
  }

  const ok = await removeFromUserWishlist(user.id, slug.trim(), supabase);
  if (!ok) {
    return NextResponse.json({ success: false, error: "Failed to remove from wishlist." }, { status: 500 });
  }

  const slugs = await getUserWishlistSlugs(user.id, supabase);
  return NextResponse.json({ success: true, slugs });
}
