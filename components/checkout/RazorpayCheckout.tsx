"use client";

/**
 * VEER ELEGANCE — RazorpayCheckout
 *
 * ⚠️  TEST MODE ONLY
 *
 * Loads the Razorpay Standard Checkout script and opens the payment sheet.
 * This component renders nothing visible — it is an imperative trigger.
 *
 * Security:
 *   - key_id (publishable) comes from the server response — safe for browser
 *   - RAZORPAY_KEY_SECRET is NEVER present here
 *   - Payment success callback sends to /api/payments/verify (server verifies)
 *   - Cart is only cleared AFTER server-side signature verification succeeds
 */

import { useEffect, useRef } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// RAZORPAY WINDOW TYPE
// ─────────────────────────────────────────────────────────────────────────────

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: new (options: Record<string, any>) => { open(): void };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id:   string;
  razorpay_signature:  string;
}

export interface RazorpayCheckoutProps {
  /** Razorpay Order ID from /api/payments/create-order */
  razorpayOrderId: string;
  /** Amount in paise (from server — authoritative) */
  amount: number;
  currency: string;
  /** Publishable Key ID (safe for browser) */
  keyId: string;
  /** Supabase order UUID — sent to /api/payments/verify */
  supabaseOrderId: string;
  /** Customer name for pre-fill */
  customerName?: string;
  /** Customer email for pre-fill */
  customerEmail?: string;
  /** Customer phone for pre-fill */
  customerPhone?: string;
  /** Called after server verifies signature successfully */
  onSuccess: () => void;
  /** Called when signature verification fails */
  onFailure: (error: string) => void;
  /** Called when user closes Razorpay without paying */
  onCancel: () => void;
  /** External loading state setter so the parent can show "Processing..." */
  setLoading: (v: boolean) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// SCRIPT LOADER
// ─────────────────────────────────────────────────────────────────────────────

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.getElementById("razorpay-checkout-script")) {
      resolve(true);
      return;
    }
    const script    = document.createElement("script");
    script.id       = "razorpay-checkout-script";
    script.src      = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload   = () => resolve(true);
    script.onerror  = () => resolve(false);
    document.body.appendChild(script);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function RazorpayCheckout({
  razorpayOrderId,
  amount,
  currency,
  keyId,
  supabaseOrderId,
  customerName,
  customerEmail,
  customerPhone,
  onSuccess,
  onFailure,
  onCancel,
  setLoading,
}: RazorpayCheckoutProps) {
  const opened = useRef(false);

  useEffect(() => {
    if (opened.current) return;
    opened.current = true;

    let dismissed = false;

    async function openCheckout() {
      setLoading(true);

      const loaded = await loadRazorpayScript();
      if (!loaded || !window.Razorpay) {
        setLoading(false);
        onFailure("Could not load payment gateway. Please check your connection and try again.");
        return;
      }

      const options: Record<string, unknown> = {
        // ⚠️ TEST MODE — key starts with "rzp_test_"
        key:        keyId,
        order_id:   razorpayOrderId,
        amount:     amount,
        currency:   currency,
        name:       "Veer Elegance",
        description: "Jewellery Order — TEST MODE",
        image:      "/images/veer-elegance-logo.png",

        // Pre-fill customer info from checkout form
        prefill: {
          name:    customerName  ?? "",
          email:   customerEmail ?? "",
          contact: customerPhone ?? "",
        },

        theme: {
          color: "#2C1810",  // var(--color-espresso) — matches brand
        },

        // Called by Razorpay after customer completes payment
        // NOTE: This is NOT final confirmation. We send to /api/payments/verify next.
        handler: async (response: RazorpaySuccessResponse) => {
          dismissed = true;
          setLoading(true);
          try {
            const res = await fetch("/api/payments/verify", {
              method:  "POST",
              headers: { "Content-Type": "application/json" },
              body:    JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_signature:  response.razorpay_signature,
                supabaseOrderId,
              }),
            });

            const json = await res.json() as { success: boolean; error?: string };

            if (json.success) {
              // ✅ Server verified — caller clears cart and redirects
              onSuccess();
            } else {
              setLoading(false);
              onFailure(json.error ?? "Payment verification failed. Please contact support.");
            }
          } catch {
            setLoading(false);
            onFailure("Network error during payment verification. Please contact support.");
          }
        },

        modal: {
          ondismiss: () => {
            if (!dismissed) {
              setLoading(false);
              onCancel();
            }
          },
          escape:      false,  // prevent accidental close on Escape
          backdropclose: false,
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    }

    void openCheckout();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // This component renders nothing — it's a pure imperative trigger
  return null;
}
