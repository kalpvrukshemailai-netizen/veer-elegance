"use client";

/**
 * VEER ELEGANCE — CheckoutForm
 *
 * Main client component for the checkout page.
 * Owns all form state: customer info, shipping, delivery, payment.
 * Renders inline validation without browser alerts.
 * Two-column layout: form left, order summary right.
 *
 * Payment flow:
 *   1. Validate form
 *   2. POST /api/payments/create-order  → get razorpayOrderId + amount
 *   3. Open Razorpay Standard Checkout (TEST MODE)
 *   4. Razorpay calls handler with payment IDs + signature
 *   5. POST /api/payments/verify  → server verifies HMAC-SHA256 signature
 *   6. On success: clearCart() → /checkout/success
 *   7. On failure/cancel: show error, keep cart, allow retry
 *
 * Design: UNCHANGED from original — same styles, same layout, same error pattern.
 */

import React, { useState, useEffect } from "react";
import { useRouter }     from "next/navigation";
import Link              from "next/link";
import DeliveryOptions   from "./DeliveryOptions";
import PaymentOptions    from "./PaymentOptions";
import OrderSummary, { type AppliedCouponInfo } from "./OrderSummary";
import RazorpayCheckout  from "./RazorpayCheckout";
import { useCart }       from "@/components/cart/CartProvider";
import { createClient }  from "@/lib/supabase/client";
import {
  type CustomerInformation,
  type ShippingAddress,
  type DeliveryMethodId,
  type PaymentMethodId,
  type FieldErrors,
  isValidEmail,
  isValidPhone,
  isValidPostalCode,
} from "@/data/checkout";
import type { AddressRow } from "@/lib/addresses";
import { type ShippingConfig, DEFAULT_SHIPPING_CONFIG } from "@/lib/shipping";

// ─────────────────────────────────────────────────────────────────────────────
// STYLED FIELD COMPONENT — label + input + optional error
// ─────────────────────────────────────────────────────────────────────────────

function Field({
  id,
  label,
  optional,
  type = "text",
  autoComplete,
  value,
  error,
  onChange,
  placeholder,
  inputMode,
}: {
  id:           string;
  label:        string;
  optional?:    boolean;
  type?:        string;
  autoComplete?:string;
  value:        string;
  error?:       string;
  onChange:     (v: string) => void;
  placeholder?: string;
  inputMode?:   React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
      <label
        htmlFor={id}
        style={{
          fontFamily:    "var(--font-body), Manrope, sans-serif",
          fontSize:      "0.6875rem",
          fontWeight:    500,
          letterSpacing: "0.08em",
          color:         error ? "#b84c4c" : "var(--color-espresso)",
        }}
      >
        {label}
        {optional && (
          <span style={{ fontWeight: 400, marginLeft: "0.375rem", opacity: 0.6 }}>
            (optional)
          </span>
        )}
      </label>

      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        style={{
          fontFamily:  "var(--font-body), Manrope, sans-serif",
          fontSize:    "0.9375rem",
          color:       "var(--color-espresso)",
          background:  "transparent",
          border:      `1.5px solid ${error ? "#b84c4c" : "var(--border)"}`,
          padding:     "0.75rem 0.875rem",
          outline:     "none",
          width:       "100%",
          boxSizing:   "border-box",
          transition:  "border-color 200ms ease",
        }}
        className="checkout-field-input"
      />

      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          aria-live="polite"
          style={{
            fontFamily:  "var(--font-body), Manrope, sans-serif",
            fontSize:    "0.6875rem",
            color:       "#b84c4c",
            lineHeight:  1.4,
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION HEADER
// ─────────────────────────────────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontFamily:    "var(--font-body), Manrope, sans-serif",
      fontSize:      "0.6875rem",
      fontWeight:    600,
      letterSpacing: "0.16em",
      textTransform: "uppercase",
      color:         "var(--color-espresso)",
      paddingBottom: "0.75rem",
      borderBottom:  "1px solid var(--border)",
      marginBottom:  "1.25rem",
    }}>
      {children}
    </p>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RAZORPAY ORDER RESPONSE
// ─────────────────────────────────────────────────────────────────────────────

interface RazorpayOrderResponse {
  success:         true;
  razorpayOrderId: string;
  amount:          number;
  currency:        string;
  keyId:           string;
  supabaseOrderId: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CHECKOUT FORM
// ─────────────────────────────────────────────────────────────────────────────

import { calculateCartSubtotal } from "@/lib/cart";

interface CheckoutFormProps {
  shippingConfig?: ShippingConfig;
}

export default function CheckoutForm({ shippingConfig = DEFAULT_SHIPPING_CONFIG }: CheckoutFormProps) {
  const { items, bundle, bundleNotice, clearCart } = useCart();
  const router = useRouter();

  const subtotalSummary = calculateCartSubtotal({ items, bundle, bundleNotice });
  const cartSubtotal = subtotalSummary.allPriced ? subtotalSummary.subtotal : null;

  // ── Form state ──────────────────────────────────────────────────────────
  const [customer, setCustomer] = useState<CustomerInformation>({
    email: "", phone: "",
  });
  const [shipping, setShipping] = useState<ShippingAddress>({
    firstName: "", lastName: "", address: "", apartment: "",
    city: "", state: "", postalCode: "", country: "India",
  });
  const [delivery, setDelivery] = useState<DeliveryMethodId>("standard");
  const [payment,  setPayment]  = useState<PaymentMethodId>("upi");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCouponInfo | null>(null);

  const postCouponSubtotal = cartSubtotal !== null
    ? Math.max(0, cartSubtotal - (appliedCoupon ? appliedCoupon.discountAmount : 0))
    : null;

  // ── Auth state ──────────────────────────────────────────────────────────────
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // ── Saved address state ─────────────────────────────────────────────────────
  const [savedAddresses, setSavedAddresses] = useState<AddressRow[]>([]);
  // "" = use new form; address UUID = use that saved address
  const [selectedAddressId, setSelectedAddressId] = useState<string>("new");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsAuthenticated(Boolean(user));
      if (user) {
        if (user.email) {
          setCustomer(p => ({ ...p, email: p.email || user.email! }));
        }
        const meta = user.user_metadata;
        if (meta) {
          const fName = (meta.first_name || meta.given_name || (meta.full_name || meta.name || "").split(" ")[0] || "").trim();
          const lName = (meta.last_name || meta.family_name || (meta.full_name || meta.name || "").split(" ").slice(1).join(" ") || "").trim();
          if (fName || lName) {
            setShipping(p => ({
              ...p,
              firstName: p.firstName || fName,
              lastName:  p.lastName || lName,
            }));
          }
        }
      }
    }).catch(() => {
      setIsAuthenticated(false);
    });

    fetch("/api/addresses")
      .then(r => r.ok ? r.json() as Promise<{ success: boolean; addresses: AddressRow[] }> : null)
      .then(json => {
        if (json?.success && json.addresses.length > 0) {
          setSavedAddresses(json.addresses);
          // Auto-select default address if one exists
          const def = json.addresses.find(a => a.is_default) ?? json.addresses[0];
          setSelectedAddressId(def.id);
          populateFromAddress(def);
        }
      })
      .catch(() => { /* not logged in or no addresses — ignore */ });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function populateFromAddress(addr: AddressRow) {
    setShipping({
      firstName:  addr.first_name,
      lastName:   addr.last_name,
      address:    addr.address,
      apartment:  addr.apartment ?? "",
      city:       addr.city,
      state:      addr.state,
      postalCode: addr.postal_code,
      country:    addr.country,
    });
    if (addr.phone) setCustomer(p => ({ ...p, phone: p.phone || addr.phone }));
    setShippingErrors({});
  }

  function handleAddressSelect(id: string) {
    setSelectedAddressId(id);
    if (id === "new") {
      setShipping({ firstName: "", lastName: "", address: "", apartment: "", city: "", state: "", postalCode: "", country: "India" });
      setShippingErrors({});
    } else {
      const addr = savedAddresses.find(a => a.id === id);
      if (addr) populateFromAddress(addr);
    }
  }

  // ── Razorpay state ───────────────────────────────────────────────────────
  const [razorpayOrder, setRazorpayOrder] = useState<RazorpayOrderResponse | null>(null);
  // Keep track of a pending order that can be re-used on payment retry
  // (avoids creating a new orphan order each time the user cancels)
  const retryOrderRef = React.useRef<{ supabaseOrderId: string; razorpayOrderId: string; amount: number; currency: string; keyId: string } | null>(null);

  // ── Async submit state ───────────────────────────────────────────────────
  const [submitting,  setSubmitting]  = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ── Validation errors ────────────────────────────────────────────────────
  const [customerErrors, setCustomerErrors] = useState<FieldErrors<CustomerInformation>>({});
  const [shippingErrors, setShippingErrors] = useState<FieldErrors<ShippingAddress>>({});

  // ── Helpers ──────────────────────────────────────────────────────────────
  function updateCustomer<K extends keyof CustomerInformation>(key: K, val: string) {
    setCustomer(p => ({ ...p, [key]: val }));
    if (customerErrors[key]) setCustomerErrors(p => ({ ...p, [key]: undefined }));
  }
  function updateShipping<K extends keyof ShippingAddress>(key: K, val: string) {
    setShipping(p => ({ ...p, [key]: val }));
    if (shippingErrors[key]) setShippingErrors(p => ({ ...p, [key]: undefined }));
  }

  // ── Validation ────────────────────────────────────────────────────────────
  function validate(): boolean {
    const ce: FieldErrors<CustomerInformation> = {};
    const se: FieldErrors<ShippingAddress>     = {};

    if (!customer.email.trim())            ce.email = "Email address is required.";
    else if (!isValidEmail(customer.email)) ce.email = "Please enter a valid email address.";

    if (!customer.phone.trim())            ce.phone = "Phone number is required.";
    else if (!isValidPhone(customer.phone)) ce.phone = "Please enter a valid 10-digit phone number.";

    if (!shipping.firstName.trim()) se.firstName = "First name is required.";
    if (!shipping.lastName.trim())  se.lastName  = "Last name is required.";
    if (!shipping.address.trim())   se.address   = "Address is required.";
    if (!shipping.city.trim())      se.city      = "City is required.";
    if (!shipping.state.trim())     se.state     = "State is required.";
    if (!shipping.country.trim())   se.country   = "Country is required.";

    if (!shipping.postalCode.trim())
      se.postalCode = "Postal code is required.";
    else if (!isValidPostalCode(shipping.postalCode))
      se.postalCode = "Please enter a valid 6-digit postal code.";

    setCustomerErrors(ce);
    setShippingErrors(se);

    const hasErrors = Object.keys(ce).length > 0 || Object.keys(se).length > 0;

    if (hasErrors) {
      const firstError = document.querySelector("[aria-invalid='true']") as HTMLElement | null;
      firstError?.focus();
    }

    return !hasErrors;
  }

  // ── Step 1: Create order → open Razorpay ─────────────────────────────────
  async function handlePlaceOrder(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;

    // Prevent duplicate submission
    if (submitting || razorpayOrder) return;

    setSubmitting(true);
    try {
      // ── Retry path: check if an existing pending order can be reused ──────
      // This avoids creating a new Supabase order (and orphan) on every cancel+retry.
      if (retryOrderRef.current) {
        const { supabaseOrderId } = retryOrderRef.current;
        const statusRes = await fetch(`/api/payments/order-status?orderId=${supabaseOrderId}`);
        if (statusRes.ok) {
          const statusJson = await statusRes.json() as {
            success: boolean;
            reusable: boolean;
            razorpayOrderId?: string;
            amount?: number;
            currency?: string;
            keyId?: string;
          };
          if (statusJson.success && statusJson.reusable && statusJson.razorpayOrderId) {
            // Re-use the existing Razorpay order — no new DB row needed
            setRazorpayOrder({
              success:         true,
              razorpayOrderId: statusJson.razorpayOrderId,
              amount:          statusJson.amount!,
              currency:        statusJson.currency!,
              keyId:           statusJson.keyId!,
              supabaseOrderId,
            });
            // Note: setSubmitting(false) not called — RazorpayCheckout manages it
            return;
          }
        }
        // Order is no longer reusable — fall through to create a new one
        retryOrderRef.current = null;
      }

      // ── Fresh order path ─────────────────────────────────────────────────
      const res = await fetch("/api/payments/create-order", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          cartItems:  items,
          bundle:     subtotalSummary.hasActiveBundle ? bundle : null,
          customer,
          shipping,
          deliveryId: delivery,
          couponCode: appliedCoupon?.code ?? null,
        }),
      });

      const json = await res.json() as
        | RazorpayOrderResponse
        | { success: false; error: string };

      if (!json.success) {
        const errorMsg = (json as { success: false; error: string }).error ?? "Unable to initiate payment. Please try again.";
        if (errorMsg.toLowerCase().includes("signed in") || res.status === 401) {
          router.push("/login?next=/checkout");
          return;
        }
        setSubmitError(errorMsg);
        setSubmitting(false);
        return;
      }

      // Store Razorpay order details — this triggers RazorpayCheckout to open
      setRazorpayOrder(json as RazorpayOrderResponse);
      // Note: setSubmitting(false) NOT called here — RazorpayCheckout manages loading state
    } catch {
      setSubmitError("Network error. Please check your connection and try again.");
      setSubmitting(false);
    }
  }

  // ── Step 2: Razorpay success → verify → clear cart ───────────────────────
  function handlePaymentSuccess() {
    // ✅ Server verified signature — safe to clear cart and redirect
    const orderId = razorpayOrder?.supabaseOrderId;
    clearCart();
    router.push(orderId ? `/checkout/success?orderId=${orderId}` : "/checkout/success");
  }

  // ── Razorpay failure ──────────────────────────────────────────────────────
  function handlePaymentFailure(error: string) {
    setSubmitError(error);
    setSubmitting(false);
    // Do NOT clear cart. Do NOT reset razorpayOrder — allow retry with same order.
  }

  // ── Razorpay cancel (user closed modal) ──────────────────────────────────
  function handlePaymentCancel() {
    // Keep cart, keep the pending order for potential retry
    setSubmitting(false);
    // Store the pending order so retry can re-use it (avoids creating orphan orders)
    if (razorpayOrder) {
      retryOrderRef.current = {
        supabaseOrderId: razorpayOrder.supabaseOrderId,
        razorpayOrderId: razorpayOrder.razorpayOrderId,
        amount:          razorpayOrder.amount,
        currency:        razorpayOrder.currency,
        keyId:           razorpayOrder.keyId,
      };
    }
    // Reset razorpayOrder so the form button is clickable again
    setRazorpayOrder(null);
    setSubmitError("Payment was cancelled. You can try again when ready.");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Razorpay Checkout trigger — renders nothing visible */}
      {razorpayOrder && (
        <RazorpayCheckout
          key={razorpayOrder.razorpayOrderId}
          razorpayOrderId={razorpayOrder.razorpayOrderId}
          amount={razorpayOrder.amount}
          currency={razorpayOrder.currency}
          keyId={razorpayOrder.keyId}
          supabaseOrderId={razorpayOrder.supabaseOrderId}
          customerName={`${shipping.firstName} ${shipping.lastName}`.trim()}
          customerEmail={customer.email}
          customerPhone={customer.phone}
          onSuccess={handlePaymentSuccess}
          onFailure={handlePaymentFailure}
          onCancel={handlePaymentCancel}
          setLoading={setSubmitting}
        />
      )}

      <form
        onSubmit={handlePlaceOrder}
        noValidate
        style={{ width: "100%" }}
      >
        <div className="checkout-columns">
          {/* ── LEFT: Form ──────────────────────────────────────────────── */}
          <div className="checkout-col-form">
            <div style={{ display: "flex", flexDirection: "column", gap: "clamp(2rem, 4vw, 3rem)" }}>

              {/* ── Contact ──────────────────────────────────────────────── */}
              <section aria-labelledby="section-contact">
                {isAuthenticated === false && (
                  <div
                    style={{
                      display:        "flex",
                      alignItems:     "center",
                      justifyContent: "space-between",
                      padding:        "0.75rem 1rem",
                      background:     "color-mix(in srgb, var(--color-gold-muted) 8%, transparent)",
                      border:         "1px solid color-mix(in srgb, var(--color-gold-muted) 25%, transparent)",
                      marginBottom:   "1.25rem",
                    }}
                  >
                    <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.8125rem", color: "var(--color-espresso)", margin: 0 }}>
                      Already have an account?
                    </p>
                    <Link
                      href="/login?next=/checkout"
                      style={{
                        fontFamily:     "var(--font-body), Manrope, sans-serif",
                        fontSize:       "0.75rem",
                        fontWeight:     600,
                        letterSpacing:  "0.1em",
                        textTransform:  "uppercase",
                        color:          "var(--color-espresso)",
                        textDecoration: "none",
                        borderBottom:   "1px solid currentColor",
                        paddingBottom:  "1px",
                      }}
                    >
                      Sign In →
                    </Link>
                  </div>
                )}

                <SectionHeader>
                  <span id="section-contact">Contact Information</span>
                </SectionHeader>
                <div className="checkout-grid-2">
                  <Field
                    id="email" label="Email address"
                    type="email" autoComplete="email"
                    value={customer.email} error={customerErrors.email}
                    onChange={v => updateCustomer("email", v)}
                    placeholder="you@example.com"
                  />
                  <Field
                    id="phone" label="Phone number"
                    type="tel" autoComplete="tel"
                    value={customer.phone} error={customerErrors.phone}
                    onChange={v => updateCustomer("phone", v)}
                    placeholder="10-digit mobile number"
                    inputMode="numeric"
                  />
                </div>
              </section>

              {/* ── Shipping ───────────────────────────────────────────── */}
              <section aria-labelledby="section-shipping">
                <SectionHeader>
                  <span id="section-shipping">Shipping Address</span>
                </SectionHeader>

                {/* Saved address picker — shown only when the user has saved addresses */}
                {savedAddresses.length > 0 && (
                  <div style={{ marginBottom: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {savedAddresses.map(addr => (
                      <label
                        key={addr.id}
                        htmlFor={`saved-addr-${addr.id}`}
                        style={{
                          display:     "flex",
                          alignItems:  "center",
                          gap:         "0.75rem",
                          padding:     "0.875rem 1rem",
                          border:      `1.5px solid ${selectedAddressId === addr.id ? "var(--color-espresso)" : "var(--border)"}`,
                          cursor:      "pointer",
                          background:  selectedAddressId === addr.id ? "color-mix(in srgb, var(--color-espresso) 4%, transparent)" : "transparent",
                          transition:  "border-color 200ms ease",
                        }}
                      >
                        <input
                          type="radio"
                          id={`saved-addr-${addr.id}`}
                          name="saved-address"
                          value={addr.id}
                          checked={selectedAddressId === addr.id}
                          onChange={() => handleAddressSelect(addr.id)}
                          style={{ width: "16px", height: "16px", accentColor: "var(--color-espresso)", flexShrink: 0 }}
                        />
                        <div style={{ flex: 1 }}>
                          <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.875rem", fontWeight: 500, color: "var(--color-espresso)", margin: 0 }}>
                            {addr.first_name} {addr.last_name}
                            {addr.label && <span style={{ fontWeight: 400, color: "var(--color-espresso-muted)", marginLeft: "0.5rem" }}>· {addr.label}</span>}
                            {addr.is_default && <span style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.5625rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-gold-muted)", marginLeft: "0.5rem" }}>Default</span>}
                          </p>
                          <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.8125rem", color: "var(--color-espresso-muted)", margin: 0 }}>
                            {addr.address}{addr.apartment ? `, ${addr.apartment}` : ""}, {addr.city}, {addr.postal_code}
                          </p>
                        </div>
                      </label>
                    ))}
                    <label
                      htmlFor="saved-addr-new"
                      style={{
                        display:    "flex",
                        alignItems: "center",
                        gap:        "0.75rem",
                        padding:    "0.875rem 1rem",
                        border:     `1.5px solid ${selectedAddressId === "new" ? "var(--color-espresso)" : "var(--border)"}`,
                        cursor:     "pointer",
                        background: selectedAddressId === "new" ? "color-mix(in srgb, var(--color-espresso) 4%, transparent)" : "transparent",
                        transition: "border-color 200ms ease",
                      }}
                    >
                      <input
                        type="radio"
                        id="saved-addr-new"
                        name="saved-address"
                        value="new"
                        checked={selectedAddressId === "new"}
                        onChange={() => handleAddressSelect("new")}
                        style={{ width: "16px", height: "16px", accentColor: "var(--color-espresso)", flexShrink: 0 }}
                      />
                      <span style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.875rem", color: "var(--color-espresso)" }}>
                        Use a different address
                      </span>
                    </label>
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                  <div className="checkout-grid-2">
                    <Field
                      id="firstName" label="First name"
                      autoComplete="given-name"
                      value={shipping.firstName} error={shippingErrors.firstName}
                      onChange={v => updateShipping("firstName", v)}
                    />
                    <Field
                      id="lastName" label="Last name"
                      autoComplete="family-name"
                      value={shipping.lastName} error={shippingErrors.lastName}
                      onChange={v => updateShipping("lastName", v)}
                    />
                  </div>
                  <Field
                    id="address" label="Address"
                    autoComplete="street-address"
                    value={shipping.address} error={shippingErrors.address}
                    onChange={v => updateShipping("address", v)}
                    placeholder="Street, building, flat"
                  />
                  <Field
                    id="apartment" label="Apartment / Suite" optional
                    autoComplete="address-line2"
                    value={shipping.apartment ?? ""} error={undefined}
                    onChange={v => updateShipping("apartment", v)}
                    placeholder="Apartment, suite, floor (optional)"
                  />
                  <div className="checkout-grid-3">
                    <Field
                      id="city" label="City"
                      autoComplete="address-level2"
                      value={shipping.city} error={shippingErrors.city}
                      onChange={v => updateShipping("city", v)}
                    />
                    <Field
                      id="state" label="State"
                      autoComplete="address-level1"
                      value={shipping.state} error={shippingErrors.state}
                      onChange={v => updateShipping("state", v)}
                    />
                    <Field
                      id="postalCode" label="Postal code"
                      autoComplete="postal-code"
                      value={shipping.postalCode} error={shippingErrors.postalCode}
                      onChange={v => updateShipping("postalCode", v)}
                      placeholder="6 digits"
                      inputMode="numeric"
                    />
                  </div>
                  <Field
                    id="country" label="Country"
                    autoComplete="country-name"
                    value={shipping.country} error={shippingErrors.country}
                    onChange={v => updateShipping("country", v)}
                  />
                </div>
              </section>

              {/* ── Delivery ─────────────────────────────────────────────── */}
              <section aria-labelledby="section-delivery">
                <DeliveryOptions
                  value={delivery}
                  onChange={setDelivery}
                  shippingConfig={shippingConfig}
                  subtotal={postCouponSubtotal}
                />
              </section>

              {/* ── Payment ──────────────────────────────────────────────── */}
              <section aria-labelledby="section-payment">
                <PaymentOptions value={payment} onChange={setPayment} />
              </section>

              {/* ── Pay Now ──────────────────────────────────────────────── */}
              <div>
                {submitError && (
                  <p
                    role="alert"
                    style={{
                      fontFamily:   "var(--font-body), Manrope, sans-serif",
                      fontSize:     "0.8125rem",
                      color:        "#b84c4c",
                      lineHeight:   1.5,
                      marginBottom: "1rem",
                      padding:      "0.75rem 1rem",
                      border:       "1px solid #b84c4c",
                      background:   "rgba(184,76,76,0.05)",
                    }}
                  >
                    {submitError}
                  </p>
                )}
                <button
                  id="checkout-pay-btn"
                  type="submit"
                  disabled={submitting}
                  style={{
                    width:         "100%",
                    padding:       "1.125rem 2rem",
                    background:    submitting ? "var(--color-espresso-muted)" : "var(--color-espresso)",
                    color:         "var(--color-ivory)",
                    fontFamily:    "var(--font-body), Manrope, sans-serif",
                    fontSize:      "0.8125rem",
                    fontWeight:    600,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    border:        "none",
                    cursor:        submitting ? "not-allowed" : "pointer",
                    opacity:       submitting ? 0.7 : 1,
                    display:       "flex",
                    alignItems:    "center",
                    justifyContent:"center",
                    gap:           "0.5rem",
                    transition:    "opacity 200ms ease, background 200ms ease",
                  }}
                  className="checkout-submit-btn"
                >
                  {submitting ? "Processing payment…" : "Pay Now"}
                  {!submitting && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                      <path d="M2 7h10M7.5 3.5L11 7l-3.5 3.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
                <p style={{
                  fontFamily:  "var(--font-body), Manrope, sans-serif",
                  fontSize:    "0.6875rem",
                  color:       "var(--color-espresso-muted)",
                  textAlign:   "center",
                  marginTop:   "0.875rem",
                  lineHeight:  1.6,
                  fontStyle:   "italic",
                }}>
                  Secure payment via Razorpay. By placing this order you agree to our Terms &amp; Conditions and Privacy Policy.
                </p>
              </div>


            </div>
          </div>

          {/* ── RIGHT: Order Summary ─────────────────────────────────────── */}
          <div className="checkout-col-summary">
            <OrderSummary
              selectedDelivery={delivery}
              shippingConfig={shippingConfig}
              appliedCoupon={appliedCoupon}
              onApplyCoupon={coupon => {
                setAppliedCoupon(coupon);
                retryOrderRef.current = null;
              }}
              onRemoveCoupon={() => {
                setAppliedCoupon(null);
                retryOrderRef.current = null;
              }}
            />
          </div>
        </div>
      </form>
    </>
  );
}
