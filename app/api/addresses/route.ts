/**
 * VEER ELEGANCE — GET/POST /api/addresses
 *
 * GET  — list authenticated user's saved addresses
 * POST — create a new saved address
 *
 * Security: user_id is always taken from the server session.
 * The client never sends user_id — it is ignored if submitted.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient }              from "@/lib/supabase/server";
import { getUserAddresses, createAddress } from "@/lib/addresses";
import type { AddressInput }         from "@/lib/addresses";

// ─────────────────────────────────────────────────────────────────────────────

function requireAuth() {
  return NextResponse.json(
    { success: false, error: "Authentication required." },
    { status: 401 },
  );
}

// GET /api/addresses
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return requireAuth();

  const addresses = await getUserAddresses();
  return NextResponse.json({ success: true, addresses });
}

// POST /api/addresses
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return requireAuth();

  let body: unknown;
  try { body = await request.json() as unknown; } catch {
    return NextResponse.json({ success: false, error: "Invalid request body." }, { status: 400 });
  }

  const input = body as Partial<AddressInput>;
  if (!input.first_name || !input.last_name || !input.phone || !input.address ||
      !input.city || !input.state || !input.postal_code) {
    return NextResponse.json(
      { success: false, error: "Missing required address fields." },
      { status: 400 },
    );
  }

  const result = await createAddress(input as AddressInput);
  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 500 });
  }
  return NextResponse.json({ success: true, address: result.address }, { status: 201 });
}
