"use client";

/**
 * VEER ELEGANCE — AddressForm
 *
 * Reusable client component for adding and editing saved addresses.
 * Used on /account/addresses/new and /account/addresses/[id]/edit.
 *
 * Design matches CheckoutForm field styles exactly — no visual redesign.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isValidPhone, isValidPostalCode } from "@/data/checkout";
import type { AddressRow } from "@/lib/addresses";

// ─────────────────────────────────────────────────────────────────────────────
// FIELD COMPONENT (matches checkout form pattern)
// ─────────────────────────────────────────────────────────────────────────────

function Field({
  id, label, value, onChange, error, optional, autoComplete, type = "text",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  optional?: boolean;
  autoComplete?: string;
  type?: string;
}) {
  const labelStyle: React.CSSProperties = {
    fontFamily:    "var(--font-body), Manrope, sans-serif",
    fontSize:      "0.6875rem",
    fontWeight:    600,
    letterSpacing: "0.12em",
    textTransform: "uppercase" as const,
    color:         error ? "#b84c4c" : "var(--color-espresso)",
    display:       "block",
    marginBottom:  "0.375rem",
  };
  const inputStyle: React.CSSProperties = {
    width:         "100%",
    padding:       "0.75rem 1rem",
    fontFamily:    "var(--font-body), Manrope, sans-serif",
    fontSize:      "0.9375rem",
    color:         "var(--color-espresso)",
    background:    "transparent",
    border:        `1.5px solid ${error ? "#b84c4c" : "var(--border)"}`,
    outline:       "none",
    borderRadius:  0,
    boxSizing:     "border-box" as const,
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <label htmlFor={id} style={labelStyle}>
        {label}{optional && <span style={{ fontWeight: 400, opacity: 0.6, marginLeft: "0.25rem" }}>(optional)</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={e => onChange(e.target.value)}
        style={inputStyle}
      />
      {error && (
        <span style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.75rem", color: "#b84c4c", marginTop: "0.3rem" }}>
          {error}
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FORM
// ─────────────────────────────────────────────────────────────────────────────

interface AddressFormProps {
  /** Pre-populated for edit mode; undefined for new address. */
  initial?: AddressRow;
  /** "new" | "edit" */
  mode: "new" | "edit";
}

interface FormState {
  label:       string;
  first_name:  string;
  last_name:   string;
  phone:       string;
  address:     string;
  apartment:   string;
  city:        string;
  state:       string;
  postal_code: string;
  country:     string;
  is_default:  boolean;
}

type FieldErrors = Partial<Record<keyof FormState, string>>;

export default function AddressForm({ initial, mode }: AddressFormProps) {
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
    label:       initial?.label       ?? "",
    first_name:  initial?.first_name  ?? "",
    last_name:   initial?.last_name   ?? "",
    phone:       initial?.phone       ?? "",
    address:     initial?.address     ?? "",
    apartment:   initial?.apartment   ?? "",
    city:        initial?.city        ?? "",
    state:       initial?.state       ?? "",
    postal_code: initial?.postal_code ?? "",
    country:     initial?.country     ?? "India",
    is_default:  initial?.is_default  ?? false,
  });

  const [errors, setErrors]       = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading]     = useState(false);

  const update = (field: keyof FormState) => (value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  function validate(): FieldErrors {
    const e: FieldErrors = {};
    if (!form.first_name.trim())  e.first_name  = "First name is required.";
    if (!form.last_name.trim())   e.last_name   = "Last name is required.";
    if (!form.phone.trim())       e.phone       = "Phone number is required.";
    else if (!isValidPhone(form.phone)) e.phone = "Please enter a valid 10-digit phone number.";
    if (!form.address.trim())     e.address     = "Address is required.";
    if (!form.city.trim())        e.city        = "City is required.";
    if (!form.state.trim())       e.state       = "State is required.";
    if (!form.postal_code.trim()) e.postal_code = "Postal code is required.";
    else if (!isValidPostalCode(form.postal_code)) e.postal_code = "Please enter a valid 6-digit postal code.";
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    const fieldErrors = validate();
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      const url    = mode === "new" ? "/api/addresses" : `/api/addresses/${initial!.id}`;
      const method = mode === "new" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label:       form.label.trim()       || undefined,
          first_name:  form.first_name.trim(),
          last_name:   form.last_name.trim(),
          phone:       form.phone.trim(),
          address:     form.address.trim(),
          apartment:   form.apartment.trim()   || undefined,
          city:        form.city.trim(),
          state:       form.state.trim(),
          postal_code: form.postal_code.trim(),
          country:     form.country.trim()     || "India",
          is_default:  form.is_default,
        }),
      });

      const json = await res.json() as { success: boolean; error?: string };
      if (!json.success) {
        setSubmitError(json.error ?? "Something went wrong. Please try again.");
        return;
      }

      router.push("/account/addresses");
      router.refresh();
    } catch {
      setSubmitError("Unable to save address. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  const sectionLabel: React.CSSProperties = {
    fontFamily:    "var(--font-body), Manrope, sans-serif",
    fontSize:      "0.6875rem",
    fontWeight:    600,
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    color:         "var(--color-espresso)",
    marginBottom:  "1rem",
  };

  const gridTwo: React.CSSProperties = {
    display:             "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 220px), 1fr))",
    gap:                 "0.875rem",
  };

  return (
    <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>

      {/* Label */}
      <div>
        <p style={sectionLabel}>Address Label</p>
        <Field
          id="addr-label" label="Label" optional
          value={form.label} onChange={update("label")}
          error={errors.label} autoComplete="off"
        />
      </div>

      {/* Name */}
      <div>
        <p style={sectionLabel}>Name</p>
        <div style={gridTwo}>
          <Field id="addr-first-name" label="First name" value={form.first_name}
            onChange={update("first_name")} error={errors.first_name} autoComplete="given-name" />
          <Field id="addr-last-name" label="Last name" value={form.last_name}
            onChange={update("last_name")} error={errors.last_name} autoComplete="family-name" />
        </div>
      </div>

      {/* Phone */}
      <div>
        <p style={sectionLabel}>Contact</p>
        <Field id="addr-phone" label="Phone number" type="tel" value={form.phone}
          onChange={update("phone")} error={errors.phone} autoComplete="tel" />
      </div>

      {/* Address */}
      <div>
        <p style={sectionLabel}>Address</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
          <Field id="addr-address" label="Street address" value={form.address}
            onChange={update("address")} error={errors.address} autoComplete="address-line1" />
          <Field id="addr-apartment" label="Apartment, suite, etc." optional value={form.apartment}
            onChange={update("apartment")} error={errors.apartment} autoComplete="address-line2" />
          <div style={gridTwo}>
            <Field id="addr-city" label="City" value={form.city}
              onChange={update("city")} error={errors.city} autoComplete="address-level2" />
            <Field id="addr-state" label="State" value={form.state}
              onChange={update("state")} error={errors.state} autoComplete="address-level1" />
          </div>
          <div style={gridTwo}>
            <Field id="addr-postal" label="Postal code" value={form.postal_code}
              onChange={update("postal_code")} error={errors.postal_code} autoComplete="postal-code" />
            <Field id="addr-country" label="Country" value={form.country}
              onChange={update("country")} error={errors.country} autoComplete="country-name" />
          </div>
        </div>
      </div>

      {/* Default */}
      <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
        <input
          id="addr-is-default"
          type="checkbox"
          checked={form.is_default}
          onChange={e => update("is_default")(e.target.checked)}
          style={{ width: "16px", height: "16px", accentColor: "var(--color-espresso)", cursor: "pointer", flexShrink: 0 }}
        />
        <span style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.875rem", color: "var(--color-espresso)" }}>
          Set as default address
        </span>
      </label>

      {/* Submit error */}
      {submitError && (
        <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.875rem", color: "#b84c4c" }}>
          {submitError}
        </p>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
        <button
          type="submit"
          disabled={loading}
          style={{
            fontFamily:    "var(--font-body), Manrope, sans-serif",
            fontSize:      "0.6875rem",
            fontWeight:    600,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color:         "var(--color-parchment)",
            background:    "var(--color-espresso)",
            border:        "none",
            padding:       "0.875rem 2.5rem",
            cursor:        loading ? "not-allowed" : "pointer",
            opacity:       loading ? 0.6 : 1,
          }}
        >
          {loading ? "Saving…" : mode === "new" ? "Save Address" : "Update Address"}
        </button>
        <a
          href="/account/addresses"
          style={{
            fontFamily:    "var(--font-body), Manrope, sans-serif",
            fontSize:      "0.6875rem",
            fontWeight:    600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color:         "var(--color-espresso-muted)",
            textDecoration: "none",
          }}
        >
          Cancel
        </a>
      </div>
    </form>
  );
}
