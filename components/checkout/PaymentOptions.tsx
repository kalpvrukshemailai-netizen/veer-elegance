"use client";

/**
 * VEER ELEGANCE — PaymentOptions
 *
 * Visual-only payment method selector.
 * NO real payment processing. NO card data collection.
 *
 * Selecting a method updates local state only.
 * "Card" selection shows a placeholder note that real payment
 * integration is pending — no card input fields rendered.
 */

import { PAYMENT_METHODS, type PaymentMethodId } from "@/data/checkout";

interface PaymentOptionsProps {
  value:    PaymentMethodId;
  onChange: (id: PaymentMethodId) => void;
}

export default function PaymentOptions({ value, onChange }: PaymentOptionsProps) {
  return (
    <div>
      <p style={{
        fontFamily:    "var(--font-body), Manrope, sans-serif",
        fontSize:      "0.6875rem",
        fontWeight:    600,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color:         "var(--color-espresso)",
        marginBottom:  "1rem",
      }}>
        Payment
      </p>

      <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
        <legend className="sr-only">Select payment method</legend>

        {/* Method tiles — 2×2 grid on desktop, 1 col on mobile */}
        <div style={{
          display:             "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 160px), 1fr))",
          gap:                 "0.625rem",
        }}>
          {PAYMENT_METHODS.map(method => {
            const isSelected = value === method.id;
            return (
              <label
                key={method.id}
                htmlFor={`payment-${method.id}`}
                style={{
                  display:       "flex",
                  alignItems:    "center",
                  gap:           "0.625rem",
                  padding:       "0.875rem 1rem",
                  border:        `1.5px solid ${isSelected ? "var(--color-espresso)" : "var(--border)"}`,
                  cursor:        "pointer",
                  transition:    "border-color 200ms ease",
                  background:    isSelected ? "color-mix(in srgb, var(--color-espresso) 4%, transparent)" : "transparent",
                }}
              >
                <input
                  type="radio"
                  id={`payment-${method.id}`}
                  name="payment-method"
                  value={method.id}
                  checked={isSelected}
                  onChange={() => onChange(method.id)}
                  style={{
                    width:       "16px",
                    height:      "16px",
                    flexShrink:  0,
                    accentColor: "var(--color-espresso)",
                    cursor:      "pointer",
                  }}
                />
                <span
                  aria-hidden="true"
                  style={{ fontSize: "1.125rem", lineHeight: 1 }}
                >
                  {method.icon}
                </span>
                <span style={{
                  fontFamily: "var(--font-body), Manrope, sans-serif",
                  fontSize:   "0.8125rem",
                  fontWeight: isSelected ? 500 : 400,
                  color:      "var(--color-espresso)",
                  lineHeight: 1.3,
                }}>
                  {method.label}
                </span>
              </label>
            );
          })}
        </div>

        {/* Razorpay handles final method selection in its checkout sheet */}
        <p style={{
          fontFamily:  "var(--font-body), Manrope, sans-serif",
          fontSize:    "0.6875rem",
          color:       "var(--color-espresso-muted)",
          fontStyle:   "italic",
          marginTop:   "0.875rem",
          lineHeight:  1.6,
        }}>
          Secure payment via Razorpay — UPI, Card, Net Banking and more available at checkout.
        </p>
      </fieldset>
    </div>
  );
}
