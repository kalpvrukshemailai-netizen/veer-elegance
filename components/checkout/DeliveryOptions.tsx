"use client";

/**
 * VEER ELEGANCE — DeliveryOptions
 *
 * Single delivery method: Standard Delivery.
 * Express Delivery has been completely removed from customer-facing checkout.
 * Authoritative shipping is computed using the shared calculateShipping engine.
 */

import { type DeliveryMethodId } from "@/data/checkout";
import { type ShippingConfig, calculateShipping, DEFAULT_SHIPPING_CONFIG } from "@/lib/shipping";

interface DeliveryOptionsProps {
  value?:          DeliveryMethodId;
  onChange?:       (id: DeliveryMethodId) => void;
  shippingConfig?: ShippingConfig;
  subtotal?:       number | null;
}

export default function DeliveryOptions({
  value = "standard",
  onChange,
  shippingConfig = DEFAULT_SHIPPING_CONFIG,
  subtotal = null,
}: DeliveryOptionsProps) {
  const methodResult = calculateShipping({
    postCouponSubtotal: subtotal,
    shippingConfig,
  });

  const costDisplay = methodResult.isFree ? (
    <span style={{ color: "#2e7d32", fontWeight: 700 }}>FREE</span>
  ) : (
    <span>
      {new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(methodResult.shippingCost)}
    </span>
  );

  return (
    <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
      <legend
        style={{
          fontFamily:    "var(--font-body), Manrope, sans-serif",
          fontSize:      "0.6875rem",
          fontWeight:    600,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color:         "var(--color-espresso)",
          marginBottom:  "1rem",
          display:       "block",
          width:         "100%",
        }}
      >
        Delivery
      </legend>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
        <label
          id="delivery-standard-card"
          htmlFor="delivery-standard"
          style={{
            display:    "flex",
            alignItems: "flex-start",
            gap:        "0.875rem",
            padding:    "1rem 1.125rem",
            border:     "1.5px solid var(--color-espresso)",
            cursor:     "default",
            background: "color-mix(in srgb, var(--color-espresso) 4%, transparent)",
          }}
        >
          {/* Radio input — always checked */}
          <input
            type="radio"
            id="delivery-standard"
            name="delivery-method"
            value="standard"
            checked={true}
            onChange={() => onChange?.("standard")}
            style={{
              width:       "16px",
              height:      "16px",
              flexShrink:  0,
              marginTop:   "1px",
              accentColor: "var(--color-espresso)",
              cursor:      "default",
            }}
          />

          <div style={{ flex: 1, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p
                style={{
                  fontFamily: "var(--font-body), Manrope, sans-serif",
                  fontSize:   "0.875rem",
                  fontWeight: 500,
                  color:      "var(--color-espresso)",
                  lineHeight: 1.3,
                }}
              >
                Standard Delivery
              </p>
              <p
                style={{
                  fontFamily: "var(--font-body), Manrope, sans-serif",
                  fontSize:   "0.75rem",
                  color:      "var(--color-espresso-muted)",
                  marginTop:  "0.25rem",
                  lineHeight: 1.5,
                }}
              >
                Delivered carefully to your door. 5–7 working days.
              </p>
            </div>

            {/* Cost */}
            <span
              id="delivery-standard-price"
              style={{
                fontFamily: "var(--font-body), Manrope, sans-serif",
                fontSize:   "0.875rem",
                fontWeight: 500,
                color:      "var(--color-espresso)",
                flexShrink: 0,
                marginLeft: "1rem",
              }}
            >
              {costDisplay}
            </span>
          </div>
        </label>
      </div>
    </fieldset>
  );
}
