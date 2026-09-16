/**
 * VEER ELEGANCE — Supabase Session Refresh (Proxy Utility)
 *
 * Implements the updateSession function used by the root middleware.
 * Its sole responsibility is to refresh the Supabase auth token on
 * every eligible request so that:
 *   - Server Components always have an up-to-date session
 *   - Session expiry is handled transparently
 *
 * This file does NOT:
 *   - Protect any routes
 *   - Redirect unauthenticated users
 *   - Check roles or permissions
 *
 * Route protection is added in a later task when auth is built out.
 *
 * Pattern follows the current official Supabase Next.js SSR guide:
 * https://supabase.com/docs/guides/auth/server-side/nextjs
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  // Start with the unmodified response — we'll layer cookie mutations on top.
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Step 1: apply to request so downstream server code sees them
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          // Step 2: rebuild response with refreshed cookies
          supabaseResponse = NextResponse.next({ request });

          // Step 3: apply to response so the browser receives them
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // IMPORTANT: Do NOT remove this call.
  // getUser() triggers the token refresh and cookie mutation cycle.
  // Without it, sessions silently expire on the server side.
  // Do not use getSession() here — it does not validate the JWT.
  await supabase.auth.getUser();

  return supabaseResponse;
}
