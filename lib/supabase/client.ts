/**
 * VEER ELEGANCE — Supabase Browser Client
 *
 * Creates a singleton Supabase client for use in Client Components.
 * Uses @supabase/ssr's createBrowserClient which handles cookie-based
 * session storage automatically for Next.js App Router.
 *
 * Usage:
 *   import { createClient } from "@/lib/supabase/client";
 *   const supabase = createClient();
 *
 * Notes:
 *   - Safe to call multiple times — returns the same instance.
 *   - Only NEXT_PUBLIC_* variables used here (safe for the browser).
 *   - Never import this in Server Components or Route Handlers.
 *     Use @/lib/supabase/server for those contexts.
 */

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
