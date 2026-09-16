/**
 * Regression Test Suite for Google Auth, Safe Redirects & Profile Completion
 */

import { getSafeRedirectUrl, getSiteUrl, getAuthCallbackUrl } from "../lib/auth-redirect";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✓ PASSED: ${message}`);
}

console.log("=== Running Auth & Redirect Regression Tests ===\n");

// 1. Safe Redirect Validation (Requirement 16 & L)
assert(getSafeRedirectUrl("/checkout") === "/checkout", "Valid internal path /checkout is preserved");
assert(getSafeRedirectUrl("/account/orders/123") === "/account/orders/123", "Valid nested path is preserved");
assert(getSafeRedirectUrl("/shop/chains?category=gold") === "/shop/chains?category=gold", "Query params in safe path preserved");

// Open redirect attacks must be rejected and fall back safely
assert(getSafeRedirectUrl("https://malicious-site.com") === "/account", "External https URL rejected");
assert(getSafeRedirectUrl("http://malicious-site.com") === "/account", "External http URL rejected");
assert(getSafeRedirectUrl("//malicious-site.com") === "/account", "Protocol-relative // URL rejected");
assert(getSafeRedirectUrl("/\\malicious-site.com") === "/account", "Backslash-escaped /\\ URL rejected");
assert(getSafeRedirectUrl("javascript:alert(1)") === "/account", "javascript: scheme rejected");
assert(getSafeRedirectUrl("data:text/html,evil") === "/account", "data: scheme rejected");
assert(getSafeRedirectUrl(null) === "/account", "null input falls back to default");
assert(getSafeRedirectUrl(undefined) === "/account", "undefined input falls back to default");
assert(getSafeRedirectUrl("", "/checkout") === "/checkout", "empty input falls back to custom fallback");

// 2. Google OAuth Callback Construction Tests
const prevNodeEnv = process.env.NODE_ENV;
const prevSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

// Test Local Development
(process.env as Record<string, string>).NODE_ENV = "development";
delete process.env.NEXT_PUBLIC_SITE_URL;
assert(getSiteUrl() === "http://localhost:3000", "Local dev site URL defaults to http://localhost:3000");
assert(
  getAuthCallbackUrl("/checkout") === "http://localhost:3000/auth/callback?next=%2Fcheckout",
  "Local dev callback URL is http://localhost:3000/auth/callback?next=%2Fcheckout",
);

// Test Production Default
(process.env as Record<string, string>).NODE_ENV = "production";
delete process.env.NEXT_PUBLIC_SITE_URL;
assert(getSiteUrl() === "https://www.veerelegance.com", "Production site URL defaults to https://www.veerelegance.com");
assert(
  getAuthCallbackUrl("/checkout") === "https://www.veerelegance.com/auth/callback?next=%2Fcheckout",
  "Production callback URL is https://www.veerelegance.com/auth/callback?next=%2Fcheckout",
);

// Test Production with NEXT_PUBLIC_SITE_URL
process.env.NEXT_PUBLIC_SITE_URL = "https://www.veerelegance.com/";
assert(getSiteUrl() === "https://www.veerelegance.com", "Trailing slash is safely stripped from NEXT_PUBLIC_SITE_URL");
assert(
  getAuthCallbackUrl("/account") === "https://www.veerelegance.com/auth/callback?next=%2Faccount",
  "Callback URL with NEXT_PUBLIC_SITE_URL constructed correctly",
);

// Restore env
(process.env as Record<string, string>).NODE_ENV = prevNodeEnv ?? "development";
if (prevSiteUrl) process.env.NEXT_PUBLIC_SITE_URL = prevSiteUrl;
else delete process.env.NEXT_PUBLIC_SITE_URL;

// 3. Google User Name Extraction Logic (Requirement 6 & 14)
function extractGoogleName(meta: Record<string, unknown>, profile?: { first_name?: string | null; last_name?: string | null }) {
  const firstName =
    profile?.first_name ||
    (meta.first_name as string | undefined) ||
    (meta.given_name as string | undefined) ||
    ((meta.full_name || meta.name || "") as string).split(" ")[0] ||
    "";

  const lastName =
    profile?.last_name ||
    (meta.last_name as string | undefined) ||
    (meta.family_name as string | undefined) ||
    ((meta.full_name || meta.name || "") as string).split(" ").slice(1).join(" ") ||
    "";

  return { firstName, lastName, fullName: [firstName, lastName].filter(Boolean).join(" ") };
}

// Case 1: Standard Google metadata with full_name
const res1 = extractGoogleName({ full_name: "Aarav Sharma", email: "aarav@gmail.com" });
assert(res1.firstName === "Aarav" && res1.lastName === "Sharma" && res1.fullName === "Aarav Sharma", "Google full_name parsed properly into First and Last name");

// Case 2: Google metadata with given_name and family_name
const res2 = extractGoogleName({ given_name: "Priya", family_name: "Patel" });
assert(res2.firstName === "Priya" && res2.lastName === "Patel" && res2.fullName === "Priya Patel", "Google given/family name mapped correctly");

// Case 3: Existing manually edited profile takes precedence over Google metadata
const res3 = extractGoogleName({ full_name: "Google Name" }, { first_name: "CustomFirst", last_name: "CustomLast" });
assert(res3.firstName === "CustomFirst" && res3.lastName === "CustomLast", "Stored profile name takes precedence (non-destructive)");

console.log("\n✅ All regression assertions passed successfully!");
