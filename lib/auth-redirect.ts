/**
 * VEER ELEGANCE — Safe Redirect Utilities
 *
 * Validates and sanitizes internal redirect target paths (e.g. ?next=...)
 * to prevent open redirect vulnerabilities and constructs environment-aware
 * OAuth callback redirect URLs.
 *
 * Rules:
 *   - Must be a non-empty string.
 *   - Must start with '/' and NOT with '//' or '/\'.
 *   - Must NOT contain '://' (rejects external absolute URLs).
 *   - Must NOT begin with 'javascript:' or 'data:'.
 *   - Falls back to a safe internal path (default: '/account').
 */

export function getSafeRedirectUrl(
  raw?: string | string[] | null,
  fallback = "/account",
): string {
  const target = Array.isArray(raw) ? raw[0] : raw;
  if (!target || typeof target !== "string") return fallback;

  const trimmed = target.trim();
  if (
    trimmed.startsWith("/") &&
    !trimmed.startsWith("//") &&
    !trimmed.startsWith("/\\") &&
    !trimmed.includes("://") &&
    !trimmed.toLowerCase().startsWith("javascript:") &&
    !trimmed.toLowerCase().startsWith("data:")
  ) {
    return trimmed;
  }

  return fallback;
}

/**
 * Returns the environment-aware base site URL.
 * - In production: uses NEXT_PUBLIC_SITE_URL or https://www.veerelegance.com (or non-localhost origin if in browser)
 * - In local development: uses window.location.origin or http://localhost:3000
 */
export function getSiteUrl(request?: Request): string {
  // 1. Explicit environment variable
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    const envUrl = process.env.NEXT_PUBLIC_SITE_URL.trim().replace(/\/$/, "");
    if (envUrl) return envUrl;
  }

  // 2. Server Request headers (if provided in route handlers)
  if (request) {
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
    const proto =
      request.headers.get("x-forwarded-proto") ||
      (host?.includes("localhost") || host?.includes("127.0.0.1") ? "http" : "https");
    if (host) {
      return `${proto}://${host}`;
    }
  }

  // 3. Browser window origin (client-side execution)
  if (typeof window !== "undefined" && window.location?.origin) {
    const origin = window.location.origin;
    // In browser, if domain is not localhost/127.0.0.1, use active origin
    if (!origin.includes("localhost") && !origin.includes("127.0.0.1")) {
      return origin;
    }
    // In local dev browser, return the local origin
    if (process.env.NODE_ENV !== "production") {
      return origin;
    }
  }

  // 4. Default fallback based on environment
  if (process.env.NODE_ENV === "production") {
    return "https://www.veerelegance.com";
  }

  return "http://localhost:3000";
}

/**
 * Constructs the canonical OAuth callback URL with optional internal return path.
 * In production: https://www.veerelegance.com/auth/callback?next=...
 * In local dev:  http://localhost:3000/auth/callback?next=...
 */
export function getAuthCallbackUrl(next?: string | string[] | null): string {
  const baseUrl = getSiteUrl();
  const safeNext = getSafeRedirectUrl(next, "/account");
  return `${baseUrl}/auth/callback?next=${encodeURIComponent(safeNext)}`;
}
