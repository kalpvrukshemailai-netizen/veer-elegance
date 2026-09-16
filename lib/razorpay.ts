/**
 * VEER ELEGANCE — Razorpay Server Utility
 *
 * ⚠️  TEST MODE ONLY
 *     Uses RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET from .env.local.
 *     Never use live keys until explicitly switching to production mode.
 *
 * Server-side ONLY — never import from:
 *   - Client Components ("use client")
 *   - NEXT_PUBLIC_* variables
 *   - Any file accessible to the browser bundle
 */

import Razorpay from "razorpay";
import crypto   from "crypto";

// ─────────────────────────────────────────────────────────────────────────────
// SINGLETON
// ─────────────────────────────────────────────────────────────────────────────

const keyId     = process.env.RAZORPAY_KEY_ID     ?? "";
const keySecret = process.env.RAZORPAY_KEY_SECRET  ?? "";

export const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

/**
 * Returns the Razorpay Key ID (publishable — safe to send to browser).
 * The secret is NEVER returned.
 */
export function getRazorpayKeyId(): string {
  return keyId;
}

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT SIGNATURE VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verifies Razorpay payment signature server-side.
 * Algorithm: HMAC-SHA256(razorpay_order_id + "|" + razorpay_payment_id, key_secret)
 *
 * Must ONLY be called server-side. Uses timingSafeEqual to prevent timing attacks.
 */
export function verifyPaymentSignature(
  razorpayOrderId:   string,
  razorpayPaymentId: string,
  signature:         string,
): boolean {
  try {
    const body     = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expected = crypto
      .createHmac("sha256", keySecret)
      .update(body)
      .digest("hex");

    const expectedBuf = Buffer.from(expected,  "hex");
    const receivedBuf = Buffer.from(signature, "hex");

    if (expectedBuf.length !== receivedBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, receivedBuf);
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// WEBHOOK SIGNATURE VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verifies Razorpay webhook signature using RAZORPAY_WEBHOOK_SECRET.
 * @param rawBody   — Raw request body string (not JSON-parsed)
 * @param signature — x-razorpay-signature header value
 */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.warn("[razorpay/webhook] RAZORPAY_WEBHOOK_SECRET not set — skipping verification.");
    return false;
  }
  try {
    const expected    = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
    const expectedBuf = Buffer.from(expected,  "hex");
    const receivedBuf = Buffer.from(signature, "hex");
    if (expectedBuf.length !== receivedBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, receivedBuf);
  } catch {
    return false;
  }
}
