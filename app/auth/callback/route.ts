/**
 * VEER ELEGANCE — /auth/callback
 *
 * OAuth Callback Route Handler for Supabase PKCE code exchange.
 *
 * Flow:
 *   1. Receives ?code=... and ?next=... from Supabase Google OAuth redirect.
 *   2. Validates 'next' parameter with getSafeRedirectUrl to prevent open redirects.
 *   3. Calls supabase.auth.exchangeCodeForSession(code).
 *   4. Populates empty public.profiles name fields from Google metadata (non-destructive).
 *   5. For checkout destinations, checks whether required address/phone details exist;
 *      if missing, directs to /account/complete-profile?next=/checkout.
 *   6. Safely redirects to the authenticated internal destination.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSafeRedirectUrl, getSiteUrl } from "@/lib/auth-redirect";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const rawNext = requestUrl.searchParams.get("next");
  const safeNext = getSafeRedirectUrl(rawNext, "/account");
  const origin = getSiteUrl(request);

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const user = data.user;

      // ── 1. Non-destructive Google profile name sync ─────────────────────────
      try {
        const meta = user.user_metadata ?? {};
        const metaFirstName = (
          meta.first_name ||
          meta.given_name ||
          (meta.full_name || meta.name || "").split(" ")[0] ||
          ""
        ).trim();

        const metaLastName = (
          meta.last_name ||
          meta.family_name ||
          (meta.full_name || meta.name || "").split(" ").slice(1).join(" ") ||
          ""
        ).trim();

        if (metaFirstName || metaLastName) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("first_name, last_name")
            .eq("id", user.id)
            .single();

          if (!profile) {
            // Insert profile if missing (trigger safety net)
            await supabase.from("profiles").insert({
              id:         user.id,
              first_name: metaFirstName || null,
              last_name:  metaLastName  || null,
              role:       "customer",
            });
          } else if (!profile.first_name && !profile.last_name) {
            // Only populate if both existing profile name fields are empty
            await supabase
              .from("profiles")
              .update({
                first_name: metaFirstName || null,
                last_name:  metaLastName  || null,
                updated_at: new Date().toISOString(),
              })
              .eq("id", user.id);
          }
        }
      } catch (profileErr) {
        console.error("[auth/callback] Profile sync error:", profileErr);
        // Non-blocking — continue with session redirect
      }

      // ── 2. Smart checkout profile completion check ──────────────────────────
      if (safeNext === "/checkout" || safeNext.startsWith("/checkout")) {
        try {
          const { data: addresses } = await supabase
            .from("addresses")
            .select("id, phone, address, city, state, postal_code")
            .eq("user_id", user.id);

          const hasCompleteAddress = Boolean(
            addresses &&
            addresses.length > 0 &&
            addresses.some(
              a =>
                Boolean(a.phone?.trim()) &&
                Boolean(a.address?.trim()) &&
                Boolean(a.city?.trim()) &&
                Boolean(a.state?.trim()) &&
                Boolean(a.postal_code?.trim()),
            ),
          );

          if (!hasCompleteAddress) {
            return NextResponse.redirect(
              `${origin}/account/complete-profile?next=${encodeURIComponent(safeNext)}`,
            );
          }
        } catch (addrErr) {
          console.error("[auth/callback] Address check error:", addrErr);
          // Non-blocking — proceed to checkout
        }
      }

      return NextResponse.redirect(`${origin}${safeNext}`);
    }

    if (error) {
      console.error("[auth/callback] OAuth exchange error:", error.message);
      const isConflict =
        error.message.toLowerCase().includes("conflict") ||
        error.message.toLowerCase().includes("already registered");
      const errParam = isConflict ? "oauth_conflict" : "oauth_failed";
      return NextResponse.redirect(
        `${origin}/login?error=${errParam}&next=${encodeURIComponent(safeNext)}`,
      );
    }
  }

  // Missing authorization code
  return NextResponse.redirect(
    `${origin}/login?error=missing_code&next=${encodeURIComponent(safeNext)}`,
  );
}
