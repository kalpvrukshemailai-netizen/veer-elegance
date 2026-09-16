/**
 * VEER ELEGANCE — GET/PUT/DELETE /api/addresses/[id]
 *
 * GET    — get a single address (ownership enforced)
 * PUT    — update a single address (ownership enforced)
 * DELETE — delete a single address (ownership enforced)
 *
 * Security: ownership is enforced server-side via .eq("user_id", user.id).
 * A customer can never read or modify another customer's address.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient }              from "@/lib/supabase/server";
import {
  getUserAddressById,
  updateAddress,
  deleteAddress,
} from "@/lib/addresses";
import type { AddressInput } from "@/lib/addresses";

// ─────────────────────────────────────────────────────────────────────────────

function requireAuth() {
  return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
}

// GET /api/addresses/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return requireAuth();

  const { id } = await params;
  const address = await getUserAddressById(id);
  if (!address) {
    return NextResponse.json({ success: false, error: "Address not found." }, { status: 404 });
  }
  return NextResponse.json({ success: true, address });
}

// PUT /api/addresses/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return requireAuth();

  const { id } = await params;
  let body: unknown;
  try { body = await request.json() as unknown; } catch {
    return NextResponse.json({ success: false, error: "Invalid request body." }, { status: 400 });
  }

  const result = await updateAddress(id, body as Partial<AddressInput>);
  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 500 });
  }
  return NextResponse.json({ success: true, address: result.address });
}

// DELETE /api/addresses/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return requireAuth();

  const { id } = await params;
  const result = await deleteAddress(id);
  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
