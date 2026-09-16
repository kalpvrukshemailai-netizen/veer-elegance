/**
 * VEER ELEGANCE — Checkout Types
 *
 * Strongly typed checkout domain structures.
 * No backend connection yet — these are pure frontend form types.
 *
 * Architecture is ready for real payment/shipping integration
 * when a backend is added.
 */

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOMER INFORMATION
// ─────────────────────────────────────────────────────────────────────────────

export interface CustomerInformation {
  email: string;
  phone: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// SHIPPING ADDRESS
// ─────────────────────────────────────────────────────────────────────────────

export interface ShippingAddress {
  firstName:  string;
  lastName:   string;
  address:    string;
  apartment?: string;  // optional
  city:       string;
  state:      string;
  postalCode: string;
  country:    string;
}

// ─────────────────────────────────────────────────────────────────────────────
// DELIVERY METHOD
// ─────────────────────────────────────────────────────────────────────────────

export type DeliveryMethodId = "standard" | "express";

export interface DeliveryMethod {
  id:          DeliveryMethodId;
  label:       string;
  description: string;
  /**
   * Shipping cost in INR.
   * null = not yet configured — UI renders without a commercial amount.
   */
  cost:        number | null;
}

export const DELIVERY_METHODS: DeliveryMethod[] = [
  {
    id:          "standard",
    label:       "Standard Delivery",
    description: "Delivered carefully to your door. 5–7 working days.",
    cost:        null,  // dynamically calculated by lib/shipping based on order subtotal
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT METHOD
// ─────────────────────────────────────────────────────────────────────────────

export type PaymentMethodId = "card" | "upi" | "netbanking";

export interface PaymentMethod {
  id:    PaymentMethodId;
  label: string;
  icon:  string;   // emoji or SVG id — lightweight, no external deps
}

export const PAYMENT_METHODS: PaymentMethod[] = [
  { id: "card",       label: "Credit / Debit Card", icon: "💳" },
  { id: "upi",        label: "UPI",                 icon: "₹"  },
  { id: "netbanking", label: "Net Banking",          icon: "🏦" },
];

// ─────────────────────────────────────────────────────────────────────────────
// FORM VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

/** Returns true if the string is a plausible email address */
export function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

/** Returns true if the string is a plausible 10-digit Indian phone number */
export function isValidPhone(v: string): boolean {
  return /^[6-9]\d{9}$/.test(v.replace(/\s/g, ""));
}

/** Returns true if the string is a 6-digit Indian postal code */
export function isValidPostalCode(v: string): boolean {
  return /^\d{6}$/.test(v.trim());
}

// ─────────────────────────────────────────────────────────────────────────────
// CHECKOUT STATE (assembled)
// ─────────────────────────────────────────────────────────────────────────────

export interface CheckoutState {
  customer:  CustomerInformation;
  shipping:  ShippingAddress;
  delivery:  DeliveryMethodId;
  payment:   PaymentMethodId;
}
