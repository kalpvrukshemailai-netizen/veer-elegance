"use client";

/**
 * VEER ELEGANCE — Wholesale & Bulk Enquiry Form
 *
 * Client form component for wholesale, bulk, and retailer enquiries.
 * Features:
 *   - Inline validation with accessible error alerts
 *   - Preservation of field inputs on failure
 *   - Disabled state and loader during async submission
 *   - Refined luxury confirmation banner upon success
 *   - Works for both guest and authenticated users
 */

import React, { useState } from "react";
import type { EnquiryType } from "@/lib/enquiries";

const ENQUIRY_TYPES: EnquiryType[] = [
  "Wholesale",
  "Bulk Purchase",
  "Retailer",
  "Reseller",
  "Other",
];

interface FormValues {
  fullName:         string;
  businessName:     string;
  email:            string;
  phone:            string;
  city:             string;
  country:          string;
  enquiryType:      string;
  expectedQuantity: string;
  message:          string;
}

interface FormErrors {
  fullName?:         string;
  email?:            string;
  phone?:            string;
  enquiryType?:      string;
  expectedQuantity?: string;
  message?:          string;
}

const INITIAL_VALUES: FormValues = {
  fullName:         "",
  businessName:     "",
  email:            "",
  phone:            "",
  city:             "",
  country:          "India",
  enquiryType:      "Wholesale",
  expectedQuantity: "",
  message:          "",
};

export default function WholesaleEnquiryForm({ buttonLabel = "Send Enquiry →" }: { buttonLabel?: string }) {
  const [values, setValues]         = useState<FormValues>(INITIAL_VALUES);
  const [errors, setErrors]         = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitted, setSubmitted]   = useState(false);

  function handleChange(field: keyof FormValues, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    if (serverError) setServerError(null);
  }

  function validate(): boolean {
    const errs: FormErrors = {};

    if (!values.fullName.trim()) {
      errs.fullName = "Full name is required.";
    }

    if (!values.email.trim()) {
      errs.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
      errs.email = "Please enter a valid email address.";
    }

    if (!values.phone.trim()) {
      errs.phone = "Phone number is required.";
    }

    if (!values.enquiryType.trim()) {
      errs.enquiryType = "Please select an enquiry type.";
    }

    if (values.expectedQuantity && values.expectedQuantity.trim() !== "") {
      const parsedQty = parseInt(values.expectedQuantity.trim(), 10);
      if (isNaN(parsedQty) || parsedQty <= 0) {
        errs.expectedQuantity = "Expected quantity must be a positive number.";
      }
    }

    if (!values.message.trim()) {
      errs.message = "Please enter a brief message describing your requirements.";
    }

    setErrors(errs);

    if (Object.keys(errs).length > 0) {
      const firstInvalid = document.querySelector("[aria-invalid='true']") as HTMLElement | null;
      firstInvalid?.focus();
      return false;
    }

    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    if (!validate()) return;

    setSubmitting(true);
    setServerError(null);

    try {
      const res = await fetch("/api/enquiries", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(values),
      });

      const data = (await res.json()) as { success: boolean; error?: string };

      if (!res.ok || !data.success) {
        setServerError(data.error || "Unable to submit enquiry. Please try again.");
        setSubmitting(false);
        return;
      }

      // Success
      setSubmitted(true);
      setValues(INITIAL_VALUES);
      setErrors({});
      setSubmitting(false);
    } catch {
      setServerError("Network error. Please check your connection and try again.");
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          background:    "var(--color-ivory)",
          border:        "1px solid var(--border)",
          padding:       "clamp(2.5rem, 5vw, 3.5rem) clamp(1.5rem, 4vw, 2.5rem)",
          textAlign:     "center",
          maxWidth:      "680px",
          margin:        "0 auto",
          boxShadow:     "0 20px 40px -15px rgba(44, 24, 16, 0.05)",
        }}
      >
        {/* Check Icon */}
        <div
          aria-hidden="true"
          style={{
            width:         "54px",
            height:        "54px",
            borderRadius:  "50%",
            border:        "1.5px solid var(--color-gold-muted)",
            display:       "flex",
            alignItems:    "center",
            justifyContent:"center",
            margin:        "0 auto 1.5rem",
            color:         "var(--color-gold-muted)",
          }}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
            <path
              d="M4.5 11l4.5 4.5 9-9"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <p
          style={{
            fontFamily:    "var(--font-body), Manrope, sans-serif",
            fontSize:      "0.6875rem",
            fontWeight:    600,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color:         "var(--color-gold-muted)",
            marginBottom:  "0.75rem",
          }}
        >
          Enquiry Received
        </p>

        <h3
          style={{
            fontFamily:   "var(--font-display), 'Cormorant Garamond', serif",
            fontSize:     "clamp(1.75rem, 3.5vw, 2.5rem)",
            fontWeight:   400,
            fontStyle:    "italic",
            color:        "var(--color-espresso)",
            marginBottom: "1rem",
            lineHeight:   1.2,
          }}
        >
          Thank you for reaching out.
        </h3>

        <p
          style={{
            fontFamily: "var(--font-body), Manrope, sans-serif",
            fontSize:   "0.875rem",
            color:      "var(--color-espresso-muted)",
            lineHeight: 1.7,
            maxWidth:   "440px",
            margin:     "0 auto 2rem",
          }}
        >
          Our concierge and wholesale team will review your requirements and get back to you shortly.
        </p>

        <button
          type="button"
          onClick={() => setSubmitted(false)}
          style={{
            background:    "transparent",
            border:        "1px solid var(--color-espresso)",
            color:         "var(--color-espresso)",
            padding:       "0.75rem 1.75rem",
            fontFamily:    "var(--font-body), Manrope, sans-serif",
            fontSize:      "0.6875rem",
            fontWeight:    600,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            cursor:        "pointer",
            transition:    "all 200ms ease",
          }}
        >
          Submit Another Enquiry
        </button>
      </div>
    );
  }

  return (
    <form
      id="enquiry-form"
      onSubmit={handleSubmit}
      noValidate
      style={{
        background: "var(--color-ivory)",
        border:     "1px solid var(--border)",
        padding:    "clamp(2rem, 4vw, 3rem) clamp(1.5rem, 4vw, 3rem)",
        maxWidth:   "800px",
        margin:     "0 auto",
        boxShadow:  "0 20px 40px -15px rgba(44, 24, 16, 0.05)",
      }}
    >
      {serverError && (
        <div
          role="alert"
          style={{
            background:   "rgba(184, 76, 76, 0.08)",
            border:       "1px solid #b84c4c",
            padding:      "0.875rem 1.25rem",
            marginBottom: "1.75rem",
            fontFamily:   "var(--font-body), Manrope, sans-serif",
            fontSize:     "0.8125rem",
            color:        "#b84c4c",
            lineHeight:   1.5,
          }}
        >
          {serverError}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "1.375rem" }}>
        {/* Row 1: Full Name & Business Name */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: "1.25rem" }}>
          <FormField
            id="enquiry-fullName"
            label="Full Name *"
            value={values.fullName}
            error={errors.fullName}
            onChange={(v) => handleChange("fullName", v)}
            placeholder="e.g. Elena Roy"
            autoComplete="name"
          />
          <FormField
            id="enquiry-businessName"
            label="Business / Boutique Name"
            optional
            value={values.businessName}
            onChange={(v) => handleChange("businessName", v)}
            placeholder="e.g. Maison Elegance"
            autoComplete="organization"
          />
        </div>

        {/* Row 2: Email & Phone */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: "1.25rem" }}>
          <FormField
            id="enquiry-email"
            label="Email Address *"
            type="email"
            value={values.email}
            error={errors.email}
            onChange={(v) => handleChange("email", v)}
            placeholder="contact@business.com"
            autoComplete="email"
          />
          <FormField
            id="enquiry-phone"
            label="Phone / WhatsApp Number *"
            type="tel"
            value={values.phone}
            error={errors.phone}
            onChange={(v) => handleChange("phone", v)}
            placeholder="+91 98765 43210"
            autoComplete="tel"
          />
        </div>

        {/* Row 3: City & Country */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: "1.25rem" }}>
          <FormField
            id="enquiry-city"
            label="City"
            optional
            value={values.city}
            onChange={(v) => handleChange("city", v)}
            placeholder="e.g. Mumbai"
            autoComplete="address-level2"
          />
          <FormField
            id="enquiry-country"
            label="Country"
            optional
            value={values.country}
            onChange={(v) => handleChange("country", v)}
            placeholder="e.g. India"
            autoComplete="country-name"
          />
        </div>

        {/* Row 4: Enquiry Type & Expected Quantity */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: "1.25rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <label
              htmlFor="enquiry-type"
              style={{
                fontFamily:    "var(--font-body), Manrope, sans-serif",
                fontSize:      "0.6875rem",
                fontWeight:    600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color:         errors.enquiryType ? "#b84c4c" : "var(--color-espresso)",
              }}
            >
              Enquiry Type *
            </label>
            <select
              id="enquiry-type"
              value={values.enquiryType}
              onChange={(e) => handleChange("enquiryType", e.target.value)}
              aria-invalid={!!errors.enquiryType}
              aria-describedby={errors.enquiryType ? "enquiry-type-error" : undefined}
              style={{
                fontFamily:  "var(--font-body), Manrope, sans-serif",
                fontSize:    "0.875rem",
                color:       "var(--color-espresso)",
                background:  "transparent",
                border:      `1.5px solid ${errors.enquiryType ? "#b84c4c" : "var(--border)"}`,
                padding:     "0.75rem 0.875rem",
                outline:     "none",
                width:       "100%",
                cursor:      "pointer",
              }}
            >
              {ENQUIRY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            {errors.enquiryType && (
              <p id="enquiry-type-error" role="alert" style={{ fontSize: "0.6875rem", color: "#b84c4c", margin: "0.2rem 0 0" }}>
                {errors.enquiryType}
              </p>
            )}
          </div>

          <FormField
            id="enquiry-quantity"
            label="Expected Units / Quantity"
            optional
            type="number"
            value={values.expectedQuantity}
            error={errors.expectedQuantity}
            onChange={(v) => handleChange("expectedQuantity", v)}
            placeholder="e.g. 50, 100+"
            inputMode="numeric"
          />
        </div>

        {/* Message */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
          <label
            htmlFor="enquiry-message"
            style={{
              fontFamily:    "var(--font-body), Manrope, sans-serif",
              fontSize:      "0.6875rem",
              fontWeight:    600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color:         errors.message ? "#b84c4c" : "var(--color-espresso)",
            }}
          >
            Message / Requirements *
          </label>
          <textarea
            id="enquiry-message"
            rows={4}
            value={values.message}
            onChange={(e) => handleChange("message", e.target.value)}
            placeholder="Tell us about your business, the categories you are interested in, and timeline..."
            aria-invalid={!!errors.message}
            aria-describedby={errors.message ? "enquiry-message-error" : undefined}
            style={{
              fontFamily:  "var(--font-body), Manrope, sans-serif",
              fontSize:    "0.875rem",
              color:       "var(--color-espresso)",
              background:  "transparent",
              border:      `1.5px solid ${errors.message ? "#b84c4c" : "var(--border)"}`,
              padding:     "0.75rem 0.875rem",
              outline:     "none",
              width:       "100%",
              boxSizing:   "border-box",
              resize:      "vertical",
            }}
          />
          {errors.message && (
            <p id="enquiry-message-error" role="alert" style={{ fontSize: "0.6875rem", color: "#b84c4c", margin: "0.2rem 0 0" }}>
              {errors.message}
            </p>
          )}
        </div>

        {/* Submit button */}
        <div style={{ marginTop: "0.75rem" }}>
          <button
            type="submit"
            disabled={submitting}
            style={{
              width:         "100%",
              padding:       "1.125rem 2rem",
              background:    submitting ? "var(--color-espresso-muted)" : "var(--color-espresso)",
              color:         "var(--color-ivory)",
              border:        "none",
              fontFamily:    "var(--font-body), Manrope, sans-serif",
              fontSize:      "0.75rem",
              fontWeight:    600,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              cursor:        submitting ? "not-allowed" : "pointer",
              opacity:       submitting ? 0.75 : 1,
              transition:    "background 200ms ease, opacity 200ms ease",
              display:       "flex",
              alignItems:    "center",
              justifyContent:"center",
              gap:           "0.5rem",
            }}
          >
            {submitting ? "Submitting Enquiry…" : (buttonLabel || "Send Enquiry →")}
          </button>
          <p
            style={{
              fontFamily:  "var(--font-body), Manrope, sans-serif",
              fontSize:    "0.6875rem",
              color:       "var(--color-espresso-muted)",
              textAlign:   "center",
              marginTop:   "0.875rem",
              lineHeight:  1.5,
            }}
          >
            Strict privacy. Your contact details are shared exclusively with the Veer Elegance partnership concierge.
          </p>
        </div>
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Form Field Sub-component
// ─────────────────────────────────────────────────────────────────────────────

function FormField({
  id,
  label,
  optional,
  type = "text",
  value,
  error,
  onChange,
  placeholder,
  autoComplete,
  inputMode,
}: {
  id:           string;
  label:        string;
  optional?:    boolean;
  type?:        string;
  value:        string;
  error?:       string;
  onChange:     (val: string) => void;
  placeholder?: string;
  autoComplete?:string;
  inputMode?:   React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
      <label
        htmlFor={id}
        style={{
          fontFamily:    "var(--font-body), Manrope, sans-serif",
          fontSize:      "0.6875rem",
          fontWeight:    600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color:         error ? "#b84c4c" : "var(--color-espresso)",
        }}
      >
        {label}
        {optional && (
          <span style={{ fontWeight: 400, marginLeft: "0.375rem", opacity: 0.6, textTransform: "none" }}>
            (optional)
          </span>
        )}
      </label>

      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        style={{
          fontFamily:  "var(--font-body), Manrope, sans-serif",
          fontSize:    "0.875rem",
          color:       "var(--color-espresso)",
          background:  "transparent",
          border:      `1.5px solid ${error ? "#b84c4c" : "var(--border)"}`,
          padding:     "0.75rem 0.875rem",
          outline:     "none",
          width:       "100%",
          boxSizing:   "border-box",
          transition:  "border-color 200ms ease",
        }}
      />

      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          style={{
            fontFamily: "var(--font-body), Manrope, sans-serif",
            fontSize:   "0.6875rem",
            color:      "#b84c4c",
            margin:     "0.2rem 0 0",
            lineHeight: 1.4,
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
