"use client";

/**
 * VEER ELEGANCE — CompleteProfileForm
 *
 * Polished profile & address completion step for Google / new users prior to checkout.
 * Reuses existing public.profiles and public.addresses tables via standard APIs.
 *
 * Features:
 *   - Pre-fills name and read-only verified email.
 *   - Collects phone, delivery address, city, state, pincode.
 *   - Saves address as default via existing /api/addresses.
 *   - Automatically advances user to their original safe destination (e.g. /checkout).
 */

import React, { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getSafeRedirectUrl } from "@/lib/auth-redirect";
import { isValidPhone, isValidPostalCode } from "@/data/checkout";

interface CompleteProfileFormProps {
  initialFirstName?: string;
  initialLastName?:  string;
  userEmail:         string;
  next?:             string;
}

export default function CompleteProfileForm({
  initialFirstName = "",
  initialLastName  = "",
  userEmail,
  next,
}: CompleteProfileFormProps) {
  const [firstName,  setFirstName]  = useState(initialFirstName);
  const [lastName,   setLastName]   = useState(initialLastName);
  const [phone,      setPhone]      = useState("");
  const [address,    setAddress]    = useState("");
  const [apartment,  setApartment]  = useState("");
  const [city,       setCity]       = useState("");
  const [state,      setState]      = useState("");
  const [postalCode, setPostalCode] = useState("");
  const country = "India";

  const [errors,    setErrors]    = useState<Record<string, string>>({});
  const [apiError,  setApiError]  = useState<string | null>(null);
  const [loading,   setLoading]   = useState(false);

  function validate(): boolean {
    const errs: Record<string, string> = {};

    if (!firstName.trim())  errs.firstName  = "First name is required.";
    if (!lastName.trim())   errs.lastName   = "Last name is required.";
    if (!phone.trim())      errs.phone      = "Phone number is required.";
    else if (!isValidPhone(phone)) errs.phone = "Please enter a valid 10-digit phone number.";

    if (!address.trim())    errs.address    = "Street address is required.";
    if (!city.trim())       errs.city       = "City is required.";
    if (!state.trim())      errs.state      = "State is required.";
    if (!postalCode.trim()) errs.postalCode = "PIN code is required.";
    else if (!isValidPostalCode(postalCode)) errs.postalCode = "Please enter a valid 6-digit PIN code.";

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError(null);

    if (!validate()) return;
    setLoading(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setApiError("Authentication session expired. Please sign in again.");
        setLoading(false);
        return;
      }

      // 1. Update public.profiles first_name / last_name
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(
          {
            id:         user.id,
            first_name: firstName.trim(),
            last_name:  lastName.trim(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" },
        );

      if (profileError) {
        console.error("[CompleteProfile] Profile update error:", profileError.message);
      }

      // 2. Save address into public.addresses (as default) via existing address API
      const res = await fetch("/api/addresses", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          first_name:  firstName.trim(),
          last_name:   lastName.trim(),
          phone:       phone.trim(),
          address:     address.trim(),
          apartment:   apartment.trim() || undefined,
          city:        city.trim(),
          state:       state.trim(),
          postal_code: postalCode.trim(),
          country,
          is_default:  true,
        }),
      });

      const json = (await res.json()) as { success: boolean; error?: string };

      if (!res.ok || !json.success) {
        setApiError(json.error ?? "Failed to save delivery details. Please try again.");
        setLoading(false);
        return;
      }

      // 3. Return safely to destination
      const destination = getSafeRedirectUrl(next, "/checkout");
      window.location.href = destination;
    } catch {
      setApiError("Network error. Please check your connection and try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate style={{ width: "100%" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.125rem" }}>

        {/* Name row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem" }} className="auth-name-grid">
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <label htmlFor="cp-first-name" style={labelStyle}>First name</label>
            <input
              id="cp-first-name"
              type="text"
              autoComplete="given-name"
              value={firstName}
              onChange={e => { setFirstName(e.target.value); clearErr("firstName"); }}
              disabled={loading}
              aria-required="true"
              style={inputStyle(!!errors.firstName)}
              className="auth-input"
            />
            {errors.firstName && <p role="alert" style={errorStyle}>{errors.firstName}</p>}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <label htmlFor="cp-last-name" style={labelStyle}>Last name</label>
            <input
              id="cp-last-name"
              type="text"
              autoComplete="family-name"
              value={lastName}
              onChange={e => { setLastName(e.target.value); clearErr("lastName"); }}
              disabled={loading}
              aria-required="true"
              style={inputStyle(!!errors.lastName)}
              className="auth-input"
            />
            {errors.lastName && <p role="alert" style={errorStyle}>{errors.lastName}</p>}
          </div>
        </div>

        {/* Email (read-only) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <label htmlFor="cp-email" style={labelStyle}>Email address</label>
            <span style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.625rem", color: "var(--color-espresso-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Verified via Google
            </span>
          </div>
          <input
            id="cp-email"
            type="email"
            value={userEmail}
            readOnly
            disabled
            style={{
              ...inputStyle(false),
              background: "color-mix(in srgb, var(--color-espresso) 4%, transparent)",
              color:      "var(--color-espresso-muted)",
              cursor:     "default",
            }}
            className="auth-input"
          />
        </div>

        {/* Phone */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
          <label htmlFor="cp-phone" style={labelStyle}>Phone number</label>
          <input
            id="cp-phone"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={e => { setPhone(e.target.value); clearErr("phone"); }}
            placeholder="10-digit mobile number"
            inputMode="numeric"
            disabled={loading}
            aria-required="true"
            style={inputStyle(!!errors.phone)}
            className="auth-input"
          />
          {errors.phone && <p role="alert" style={errorStyle}>{errors.phone}</p>}
        </div>

        {/* Street Address */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
          <label htmlFor="cp-address" style={labelStyle}>Delivery address</label>
          <input
            id="cp-address"
            type="text"
            autoComplete="street-address"
            value={address}
            onChange={e => { setAddress(e.target.value); clearErr("address"); }}
            placeholder="Flat / House no., Building, Street"
            disabled={loading}
            aria-required="true"
            style={inputStyle(!!errors.address)}
            className="auth-input"
          />
          {errors.address && <p role="alert" style={errorStyle}>{errors.address}</p>}
        </div>

        {/* Apartment / Suite (optional) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
          <label htmlFor="cp-apartment" style={labelStyle}>
            Apartment / Suite <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span>
          </label>
          <input
            id="cp-apartment"
            type="text"
            autoComplete="address-line2"
            value={apartment}
            onChange={e => setApartment(e.target.value)}
            placeholder="Apartment, suite, landmark"
            disabled={loading}
            style={inputStyle(false)}
            className="auth-input"
          />
        </div>

        {/* City, State, Postal Code */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }} className="auth-city-grid">
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <label htmlFor="cp-city" style={labelStyle}>City</label>
            <input
              id="cp-city"
              type="text"
              autoComplete="address-level2"
              value={city}
              onChange={e => { setCity(e.target.value); clearErr("city"); }}
              disabled={loading}
              aria-required="true"
              style={inputStyle(!!errors.city)}
              className="auth-input"
            />
            {errors.city && <p role="alert" style={errorStyle}>{errors.city}</p>}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <label htmlFor="cp-state" style={labelStyle}>State</label>
            <input
              id="cp-state"
              type="text"
              autoComplete="address-level1"
              value={state}
              onChange={e => { setState(e.target.value); clearErr("state"); }}
              disabled={loading}
              aria-required="true"
              style={inputStyle(!!errors.state)}
              className="auth-input"
            />
            {errors.state && <p role="alert" style={errorStyle}>{errors.state}</p>}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <label htmlFor="cp-postal" style={labelStyle}>PIN code</label>
            <input
              id="cp-postal"
              type="text"
              autoComplete="postal-code"
              value={postalCode}
              onChange={e => { setPostalCode(e.target.value); clearErr("postalCode"); }}
              placeholder="6 digits"
              inputMode="numeric"
              disabled={loading}
              aria-required="true"
              style={inputStyle(!!errors.postalCode)}
              className="auth-input"
            />
            {errors.postalCode && <p role="alert" style={errorStyle}>{errors.postalCode}</p>}
          </div>
        </div>

        {/* Error message */}
        {apiError && <p role="alert" style={errorStyle}>{apiError}</p>}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          style={submitStyle(loading)}
          className="auth-submit-btn"
        >
          {loading ? "Saving details…" : "Continue →"}
        </button>
      </div>
    </form>
  );

  function clearErr(k: string) {
    setErrors(prev => {
      const n = { ...prev };
      delete n[k];
      return n;
    });
  }
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  fontFamily:    "var(--font-body), Manrope, sans-serif",
  fontSize:      "0.6875rem",
  fontWeight:    500,
  letterSpacing: "0.08em",
  color:         "var(--color-espresso)",
  textTransform: "uppercase",
};

function inputStyle(hasError: boolean): React.CSSProperties {
  return {
    fontFamily:  "var(--font-body), Manrope, sans-serif",
    fontSize:    "0.9375rem",
    color:       "var(--color-espresso)",
    background:  "transparent",
    border:      `1.5px solid ${hasError ? "#b84c4c" : "var(--border)"}`,
    padding:     "0.75rem 0.875rem",
    outline:     "none",
    width:       "100%",
    boxSizing:   "border-box",
  };
}

function submitStyle(loading: boolean): React.CSSProperties {
  return {
    width:         "100%",
    padding:       "1rem 2rem",
    marginTop:     "0.5rem",
    background:    loading ? "var(--color-espresso-muted)" : "var(--color-espresso)",
    color:         "var(--color-ivory)",
    fontFamily:    "var(--font-body), Manrope, sans-serif",
    fontSize:      "0.75rem",
    fontWeight:    600,
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    border:        "none",
    cursor:        loading ? "not-allowed" : "pointer",
    opacity:       loading ? 0.7 : 1,
    transition:    "opacity 200ms ease, background 200ms ease",
  };
}

const errorStyle: React.CSSProperties = {
  fontFamily: "var(--font-body), Manrope, sans-serif",
  fontSize:   "0.8125rem",
  color:      "#b84c4c",
  lineHeight: 1.5,
  margin:     0,
};
