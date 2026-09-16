/**
 * VEER ELEGANCE — Next.js Middleware (Supabase Session Proxy)
 *
 * Intercepts eligible requests to refresh the Supabase auth session.
 * This ensures Server Components always receive a valid, up-to-date
 * session token without requiring client-side re-authentication.
 *
 * CURRENT STATE:
 *   - Session refresh only — no route protection.
 *   - All application routes remain publicly accessible.
 *
 * FUTURE:
 *   - Add route protection here when auth is implemented.
 *   - Example: redirect unauthenticated users away from /account.
 *
 * Matcher excludes:
 *   - Next.js internal routes (_next/static, _next/image)
 *   - All static file extensions (images, fonts, video, favicon, etc.)
 *   - This prevents unnecessary middleware overhead on asset requests.
 */

import { type NextRequest } from "next/server";
import { updateSession }    from "@/lib/supabase/proxy";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     *   - _next/static  (Next.js build output)
     *   - _next/image   (Next.js image optimisation)
     *   - favicon.ico, sitemap.xml, robots.txt
     *   - Common static file extensions
     *
     * This keeps the middleware focused on page/API requests only.
     */
    "/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp4|webm|woff|woff2|ttf|otf|eot)$).*)",
  ],
};
