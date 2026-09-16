/**
 * VEER ELEGANCE — Supabase Server Client
 *
 * Creates a per-request Supabase client for use in:
 *   - Server Components
 *   - Server Actions
 *   - Route Handlers
 *
 * Uses Next.js App Router cookies() from "next/headers" to read and
 * write session cookies, enabling SSR-compatible auth state.
 *
 * Usage (Server Component or Server Action):
 *   import { createClient } from "@/lib/supabase/server";
 *   const supabase = await createClient();
 *
 * Notes:
 *   - Must be called inside an async context (cookies() is async).
 *   - Do NOT use this in Client Components — use @/lib/supabase/client.
 *   - A new client is created per request (correct for server contexts).
 */

import { createServerClient } from "@supabase/ssr";
import { cookies }            from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // setAll is called from a Server Component where cookies
            // cannot be mutated. The proxy (middleware) handles session
            // refresh — this catch prevents unnecessary error throws.
          }
        },
      },
    },
  );
}
