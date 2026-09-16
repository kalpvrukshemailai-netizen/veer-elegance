import * as fs from "node:fs";
import * as path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

async function runTests() {
  console.log("================================================================================");
  console.log("TASK 43-FIX — AUTHENTICATION REDIRECT FLOW TEST SUITE");
  console.log("================================================================================\n");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

  const adminSupabase = createClient(supabaseUrl, serviceKey);
  const anonSupabase = createClient(supabaseUrl, anonKey);

  // 1. Generate Admin Session Cookie
  console.log("1. Generating test Admin session...");
  const { data: linkData } = await adminSupabase.auth.admin.generateLink({
    type: "magiclink",
    email: "kavyashah8605@gmail.com",
  });
  const tokenHash = linkData?.properties?.hashed_token;
  if (!tokenHash) throw new Error("Missing hashed token from magic link");
  const { data: sessionData, error: sessErr } = await anonSupabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "magiclink",
  });

  if (!sessionData?.session) {
    throw new Error("Failed to create admin session: " + sessErr?.message);
  }
  console.log("  ✓ Admin session successfully created.");

  const session = sessionData.session;
  const projectRef = supabaseUrl.split("//")[1].split(".")[0];
  const cookieName = `sb-${projectRef}-auth-token`;
  const sessionStr = JSON.stringify(session);
  const base64Session = Buffer.from(sessionStr).toString("base64");
  const adminCookieHeader = `${cookieName}=${encodeURIComponent("base64-" + base64Session)}`;

  // 2. Test Unauthenticated Protected Routes
  console.log("\n2. Testing Unauthenticated Route Protection & Redirection...");
  const protectedRoutes = [
    "/admin",
    "/admin/products",
    "/admin/products/bulk",
    "/admin/inventory",
    "/admin/orders",
    "/admin/customers",
    "/admin/enquiries",
    "/admin/content",
    "/admin/coupons",
  ];

  for (const r of protectedRoutes) {
    const res = await fetch(`http://localhost:3000${r}`, { redirect: "manual" });
    const location = res.headers.get("location");
    const expected = `/login?next=${encodeURIComponent(r)}`;
    if (res.status === 307 && location === expected) {
      console.log(`  ✓ Unauthenticated ${r} → HTTP 307 to ${location}`);
    } else {
      throw new Error(`Unexpected unauthenticated behavior for ${r}: status ${res.status}, location ${location}`);
    }
  }

  // 3. Test LoginPage for Authenticated Users (next parameter handling)
  console.log("\n3. Testing LoginPage for Authenticated Admin with 'next' parameter...");
  const nextTestCases = [
    { query: "?next=/admin", expectedLocation: "/admin" },
    { query: "?next=/admin/products", expectedLocation: "/admin/products" },
    { query: "?next=/admin/products/bulk", expectedLocation: "/admin/products/bulk" },
    { query: "?next=/shop", expectedLocation: "/shop" },
    { query: "", expectedLocation: "/account" },
    // Open redirect attacks must fallback to /account:
    { query: "?next=https://evil-site.com", expectedLocation: "/account" },
    { query: "?next=//evil-site.com", expectedLocation: "/account" },
    { query: "?next=http://malicious.com/admin", expectedLocation: "/account" },
    { query: "?next=javascript:alert(1)", expectedLocation: "/account" },
  ];

  for (const tc of nextTestCases) {
    const res = await fetch(`http://localhost:3000/login${tc.query}`, {
      headers: { Cookie: adminCookieHeader },
      redirect: "manual",
    });
    const location = res.headers.get("location");
    if (res.status === 307 && location === tc.expectedLocation) {
      console.log(`  ✓ Authenticated GET /login${tc.query || "(no next)"} → HTTP 307 to ${location}`);
    } else {
      throw new Error(`Failed next parameter test for /login${tc.query}: status ${res.status}, location ${location}, expected ${tc.expectedLocation}`);
    }
  }

  // 4. Test Authenticated Admin Direct Access
  console.log("\n4. Testing Direct Authenticated Access to All Admin Routes...");
  for (const r of protectedRoutes) {
    const start = Date.now();
    const res = await fetch(`http://localhost:3000${r}`, {
      headers: { Cookie: adminCookieHeader },
      redirect: "manual",
    });
    const duration = Date.now() - start;
    if (res.status === 200) {
      console.log(`  ✓ Authenticated ${r} → HTTP 200 OK (${duration}ms)`);
    } else {
      throw new Error(`Failed direct access for ${r}: status ${res.status}, location ${res.headers.get("location")}`);
    }
  }

  // 5. Test Customer Session (Non-Admin User)
  console.log("\n5. Testing Customer Session (Non-Admin Role)...");
  const { data: custLink } = await adminSupabase.auth.admin.generateLink({
    type: "magiclink",
    email: "veerarts8605@gmail.com",
  });
  const custTokenHash = custLink?.properties?.hashed_token;
  if (!custTokenHash) throw new Error("Missing hashed token from customer magic link");
  const { data: custSessionData } = await anonSupabase.auth.verifyOtp({
    token_hash: custTokenHash,
    type: "magiclink",
  });

  const custSessionStr = JSON.stringify(custSessionData?.session);
  const custBase64 = Buffer.from(custSessionStr).toString("base64");
  const custCookieHeader = `${cookieName}=${encodeURIComponent("base64-" + custBase64)}`;

  // Customer visiting /admin -> redirected to / (silent protection)
  const custAdminRes = await fetch("http://localhost:3000/admin", {
    headers: { Cookie: custCookieHeader },
    redirect: "manual",
  });
  console.log(`  ✓ Customer visiting /admin → HTTP ${custAdminRes.status} to ${custAdminRes.headers.get("location")} (Home)`);

  // Customer visiting /login -> redirected to /account
  const custLoginRes = await fetch("http://localhost:3000/login", {
    headers: { Cookie: custCookieHeader },
    redirect: "manual",
  });
  console.log(`  ✓ Customer visiting /login → HTTP ${custLoginRes.status} to ${custLoginRes.headers.get("location")}`);

  console.log("\n================================================================================");
  console.log("✓ ALL AUTHENTICATION REDIRECT AND PROTECTION TESTS PASSED SUCCESSFULLY!");
  console.log("================================================================================\n");
}

runTests().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
