"use client";

/**
 * VEER ELEGANCE — ProductForm
 *
 * Shared form for both CREATE and EDIT product routes.
 * Receives an optional `product` prop for editing — undefined = new product.
 *
 * Uses React 19 useActionState for progressive enhancement.
 * Grouped into logical sections: Basic Info, Pricing, Content, Flags, Media.
 *
 * FIX (2026-08-23):
 * Server actions no longer call redirect(). Instead they return
 * { success: true, id } and this component uses useRouter to navigate.
 * This prevents the NEXT_REDIRECT → silent form-reset bug.
 */

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter }                          from "next/navigation";
import { calculateDiscountPercent }           from "@/data/products";
import type { DbProduct }                     from "@/lib/products-db";
import type { ActionState }                   from "@/app/admin/products/actions";

// ─────────────────────────────────────────────────────────────────────────────

type ActionFn = (prev: ActionState, fd: FormData) => Promise<ActionState>;

interface ProductFormProps {
  action:              ActionFn;
  product?:            DbProduct;
  assignedCategories?: string[];
  mode:                "create" | "edit";
}

const INITIAL_STATE: ActionState = {};

const CATEGORIES = [
  { value: "chains",            label: "THE EVERYDAY — Chains" },
  { value: "rings",             label: "THE SIGNATURE — Rings" },
  { value: "earrings",          label: "THE GLOW — Earrings" },
  { value: "bracelets",         label: "THE MOTION — Bracelets" },
  { value: "bangles",           label: "THE HALO — Bangles" },
  { value: "mystery-box",       label: "THE UNKNOWN — Mystery Box" },
  { value: "gen-z-accessories", label: "THE REBEL — Gen-Z Accessories" },
];

// ─────────────────────────────────────────────────────────────────────────────

export default function ProductForm({
  action, product, assignedCategories, mode,
}: ProductFormProps) {
  const router                             = useRouter();
  const [state, dispatch, pending]         = useActionState(action, INITIAL_STATE);
  const formRef                            = useRef<HTMLFormElement>(null);

  const isEdit    = mode === "edit";
  const fe        = state.fieldErrors ?? {};

  // Initialize selected categories from assignedCategories or legacy product.category
  const initialCategories = assignedCategories && assignedCategories.length > 0
    ? assignedCategories
    : product?.category
      ? [product.category]
      : [];

  const [selectedCategories, setSelectedCategories] = useState<string[]>(initialCategories);
  const [primaryCategory, setPrimaryCategory]       = useState<string>(
    product?.category || (initialCategories[0] ?? "")
  );

  // Price & MRP live input state for discount preview & instant validation
  const [priceInput, setPriceInput] = useState<string>(
    product?.price !== null && product?.price !== undefined ? String(product.price) : ""
  );
  const [mrpInput, setMrpInput] = useState<string>(
    product?.mrp !== null && product?.mrp !== undefined ? String(product.mrp) : ""
  );

  const parsedPrice = priceInput.trim() !== "" ? parseFloat(priceInput) : null;
  const parsedMrp   = mrpInput.trim() !== ""   ? parseFloat(mrpInput) : null;
  const liveDiscount = calculateDiscountPercent(parsedMrp, parsedPrice);
  const isMrpLessThanPrice =
    parsedMrp !== null &&
    parsedPrice !== null &&
    !isNaN(parsedMrp) &&
    !isNaN(parsedPrice) &&
    parsedMrp < parsedPrice;

  // ── After successful create: navigate to the new product's edit page ───────
  // After successful update: stay (form shows success indicator).
  useEffect(() => {
    if (state.success && state.id) {
      if (!isEdit) {
        // Create mode → go to edit so owner can add images immediately
        router.push(`/admin/products/${state.id}/edit`);
      }
      // Edit mode → page will revalidate in-place; no navigation needed
    }
  }, [state.success, state.id, isEdit, router]);

  return (
    <form
      ref={formRef}
      action={dispatch}
      style={{ display: "flex", flexDirection: "column", gap: "2rem", maxWidth: "720px" }}
      noValidate   // we show custom inline messages; browser tooltip bubbles look bad
    >

      {/* ── Global error banner ───────────────────────────────────────── */}
      {state.error && (
        <div
          role="alert"
          aria-live="assertive"
          style={{ padding: "0.875rem 1rem", background: "rgba(184,76,76,0.06)", border: "1px solid #b84c4c" }}
        >
          <p style={{ ...body, color: "#b84c4c", margin: 0 }}>{state.error}</p>
        </div>
      )}

      {/* ── Global success banner (edit mode only) ─────────────────────── */}
      {state.success && isEdit && (
        <div
          role="status"
          aria-live="polite"
          style={{ padding: "0.875rem 1rem", background: "rgba(60,120,60,0.06)", border: "1px solid #3a7a3a" }}
        >
          <p style={{ ...body, color: "#3a7a3a", margin: 0 }}>✓ Product saved successfully.</p>
        </div>
      )}

      {/* ── SECTION: Basic Information ────────────────────────────────── */}
      <FormSection title="Basic Information">
        <FormRow>
          <FormField label="Product Name" required error={fe.name}>
            <input
              name="name"
              type="text"
              required
              defaultValue={product?.name ?? ""}
              placeholder="e.g. Heart Layered Chain"
              style={{ ...inputStyle, ...(fe.name ? inputError : {}) }}
              aria-required="true"
              aria-describedby={fe.name ? "err-name" : undefined}
              aria-invalid={!!fe.name}
            />
          </FormField>

          <FormField label="Slug" required hint="URL identifier — lowercase, hyphens only" error={fe.slug}>
            <input
              name="slug"
              type="text"
              required
              defaultValue={product?.slug ?? ""}
              placeholder="e.g. heart-layered-chain"
              style={{ ...inputStyle, ...(fe.slug ? inputError : {}) }}
              aria-required="true"
              aria-describedby={fe.slug ? "err-slug" : undefined}
              aria-invalid={!!fe.slug}
            />
          </FormField>
        </FormRow>

        {/* ── Categories Multi-Select ─────────────────────────────────── */}
        <FormField
          label="Categories"
          required
          hint="Select all collections this piece belongs to (at least 1 required)"
          error={fe.categories}
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: "0.625rem", marginTop: "0.25rem" }}>
            {CATEGORIES.map((c) => {
              const isChecked = selectedCategories.includes(c.value);
              return (
                <label
                  key={c.value}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.625rem",
                    padding: "0.625rem 0.875rem",
                    background: isChecked ? "rgba(184,154,104,0.12)" : "var(--color-ivory)",
                    border: isChecked ? "1px solid var(--color-gold-muted)" : "1px solid var(--border)",
                    cursor: "pointer",
                    transition: "all 150ms ease",
                  }}
                >
                  <input
                    type="checkbox"
                    name="categories"
                    value={c.value}
                    checked={isChecked}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      let next: string[];
                      if (checked) {
                        next = [...selectedCategories, c.value];
                        if (!primaryCategory) setPrimaryCategory(c.value);
                      } else {
                        next = selectedCategories.filter((x) => x !== c.value);
                        if (primaryCategory === c.value) {
                          setPrimaryCategory(next[0] || "");
                        }
                      }
                      setSelectedCategories(next);
                    }}
                    style={{ accentColor: "var(--color-espresso)", width: "1rem", height: "1rem" }}
                  />
                  <span style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.8125rem", color: "var(--color-espresso)", fontWeight: isChecked ? 600 : 400 }}>
                    {c.label}
                  </span>
                </label>
              );
            })}
          </div>
        </FormField>

        {/* ── Primary Category Selection ─────────────────────────────────── */}
        <FormField
          label="Primary Category"
          required
          hint="Used for single-attribution reporting, breadcrumbs, and default merchandising"
          error={fe.primary_category || fe.category}
        >
          <select
            name="primary_category"
            value={primaryCategory}
            onChange={(e) => setPrimaryCategory(e.target.value)}
            required
            disabled={selectedCategories.length === 0}
            style={{ ...inputStyle, ...(fe.primary_category || fe.category ? inputError : {}) }}
            aria-required="true"
          >
            {selectedCategories.length === 0 ? (
              <option value="" disabled>Select at least one category above first</option>
            ) : (
              selectedCategories.map((catId) => {
                const catObj = CATEGORIES.find((c) => c.value === catId);
                return (
                  <option key={catId} value={catId}>
                    {catObj?.label || catId}
                  </option>
                );
              })
            )}
          </select>
          {/* Legacy fallback input */}
          <input type="hidden" name="category" value={primaryCategory} />
        </FormField>

        <FormField label="Display Order" hint="Lower number = appears first within its category">
          <input
            name="display_order"
            type="number"
            min="1"
            max="9999"
            defaultValue={product?.display_order ?? 999}
            style={{ ...inputStyle, width: "120px" }}
          />
        </FormField>
      </FormSection>

      {/* ── SECTION: Pricing ──────────────────────────────────────────── */}
      <FormSection title="Pricing">
        <FormRow>
          {/* Selling Price */}
          <FormField
            label="Selling Price (₹ INR)"
            hint="Actual price charged at checkout and in orders"
            error={fe.price}
          >
            <input
              name="price"
              type="number"
              min="0"
              step="0.01"
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              placeholder="e.g. 699"
              style={{ ...inputStyle, width: "180px", ...(fe.price ? inputError : {}) }}
              aria-invalid={!!fe.price}
            />
          </FormField>

          {/* MRP / Compare-at Price */}
          <FormField
            label="MRP / Original Price (₹ INR)"
            hint="Compare-at price (must be ≥ selling price). Leave blank if none."
            error={fe.mrp}
          >
            <input
              name="mrp"
              type="number"
              min="0"
              step="0.01"
              value={mrpInput}
              onChange={(e) => setMrpInput(e.target.value)}
              placeholder="e.g. 999"
              style={{
                ...inputStyle,
                width: "180px",
                ...(fe.mrp || isMrpLessThanPrice ? inputError : {}),
              }}
              aria-invalid={!!fe.mrp || isMrpLessThanPrice}
            />
          </FormField>

          {/* Currency */}
          <FormField label="Currency">
            <select name="currency" defaultValue={product?.currency ?? "INR"} style={{ ...inputStyle, width: "120px" }}>
              <option value="INR">INR ₹</option>
            </select>
          </FormField>
        </FormRow>

        {/* Live Discount Calculation Feedback */}
        {isMrpLessThanPrice && (
          <div style={{ padding: "0.625rem 0.875rem", background: "rgba(184, 76, 76, 0.08)", border: "1px solid #b84c4c" }}>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "#b84c4c", fontFamily: "var(--font-body), Manrope, sans-serif", fontWeight: 600 }}>
              ⚠️ MRP (₹{parsedMrp}) cannot be less than Selling Price (₹{parsedPrice}). Please correct before saving.
            </p>
          </div>
        )}

        {liveDiscount !== null && !isMrpLessThanPrice && (
          <div style={{ padding: "0.625rem 0.875rem", background: "rgba(74, 124, 89, 0.08)", border: "1px solid #4a7c59", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.875rem" }}>🏷️</span>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "#2e7d32", fontFamily: "var(--font-body), Manrope, sans-serif", fontWeight: 600 }}>
              Customer sees: <strong>₹{parsedPrice}</strong> <span style={{ textDecoration: "line-through", opacity: 0.7 }}>₹{parsedMrp}</span> ({liveDiscount}% OFF badge)
            </p>
          </div>
        )}
      </FormSection>

      {/* ── SECTION: Content ──────────────────────────────────────────── */}
      <FormSection title="Content">
        <FormField label="Short Description" hint="One-line teaser for product cards (280 chars max)">
          <textarea
            name="short_description"
            rows={2}
            maxLength={280}
            defaultValue={product?.short_description ?? ""}
            placeholder="Brief editorial description"
            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
          />
        </FormField>

        <FormField label="Description" hint="Full product detail page description">
          <textarea
            name="description"
            rows={5}
            defaultValue={product?.description ?? ""}
            placeholder="Full editorial copy"
            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
          />
        </FormField>

        <FormField label="Material" hint="Only add if verified — e.g. 925 Sterling Silver">
          <input
            name="material"
            type="text"
            defaultValue={product?.material ?? ""}
            placeholder="Leave empty until confirmed by brand team"
            style={inputStyle}
          />
        </FormField>
      </FormSection>

      {/* ── SECTION: Product Flags & Options ─────────────────────────── */}
      <FormSection title="Product Flags & Options">
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <ToggleField
            name="show_care_instructions"
            label="Include Care Instructions"
            hint="Show the standard jewellery care guidance on this product's page."
            defaultChecked={product?.show_care_instructions ?? false}
          />
          <ToggleField
            name="anti_tarnish"
            label="Anti-Tarnish"
            hint="Only enable if confirmed by brand team"
            defaultChecked={product?.anti_tarnish ?? true}
          />
          <ToggleField
            name="featured"
            label="Featured"
            hint="Shows in homepage editorial grid"
            defaultChecked={product?.featured ?? false}
          />
          <ToggleField
            name="published"
            label="Published"
            hint="Visible to customers on the store"
            defaultChecked={product?.published ?? false}
          />
        </div>
      </FormSection>

      {/* ── Submit ────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", paddingTop: "0.5rem", borderTop: "1px solid var(--border)" }}>
        <button
          type="submit"
          disabled={pending}
          style={{
            padding:       "0.75rem 2rem",
            background:    pending ? "var(--color-espresso-muted)" : "var(--color-espresso)",
            color:         "var(--color-ivory)",
            border:        "none",
            fontFamily:    "var(--font-body), Manrope, sans-serif",
            fontSize:      "0.75rem",
            fontWeight:    600,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            cursor:        pending ? "not-allowed" : "pointer",
            opacity:       pending ? 0.7 : 1,
            transition:    "opacity 200ms ease, background 200ms ease",
          }}
          aria-busy={pending}
        >
          {pending
            ? (isEdit ? "Saving…" : "Creating Product…")
            : (isEdit ? "Save Changes"  : "Create Product")
          }
        </button>

        <a
          href="/admin/products"
          style={{ ...body, color: "var(--color-espresso-muted)", textDecoration: "none", fontWeight: 500 }}
        >
          Cancel
        </a>
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <h2 style={{
        fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.625rem", fontWeight: 700,
        letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--color-espresso)",
        margin: 0, paddingBottom: "0.75rem", borderBottom: "1px solid var(--border)",
      }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function FormRow({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap" }}>{children}</div>;
}

function FormField({
  label, required = false, hint, error, children,
}: {
  label: string; required?: boolean; hint?: string; error?: string; children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem", flex: 1, minWidth: "200px" }}>
      <label style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.6875rem", fontWeight: 600, color: "var(--color-espresso)", letterSpacing: "0.04em" }}>
        {label}{required && <span style={{ color: "#b84c4c", marginLeft: "2px" }}>*</span>}
      </label>
      {hint && <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.6rem", color: "var(--color-espresso-muted)", margin: 0, lineHeight: 1.4 }}>{hint}</p>}
      {children}
      {error && (
        <p
          role="alert"
          style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.6875rem", color: "#b84c4c", margin: 0 }}
        >
          {error}
        </p>
      )}
    </div>
  );
}

function ToggleField({
  name, label, hint, defaultChecked,
}: {
  name: string; label: string; hint?: string; defaultChecked: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
      {/* Hidden input sends "false" when checkbox is unchecked */}
      <input type="hidden" name={name} value="false" />
      <input
        type="checkbox"
        name={name}
        value="true"
        id={`flag-${name}`}
        defaultChecked={defaultChecked}
        style={{ marginTop: "2px", width: "14px", height: "14px", accentColor: "var(--color-espresso)", cursor: "pointer" }}
      />
      <label htmlFor={`flag-${name}`} style={{ cursor: "pointer", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
        <span style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-espresso)" }}>{label}</span>
        {hint && <span style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.6875rem", color: "var(--color-espresso-muted)" }}>{hint}</span>}
      </label>
    </div>
  );
}

// ─── Shared styles ─────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width:      "100%",
  padding:    "0.625rem 0.75rem",
  fontFamily: "var(--font-body), Manrope, sans-serif",
  fontSize:   "0.875rem",
  color:      "var(--color-espresso)",
  background: "var(--color-parchment)",
  border:     "1px solid var(--border)",
  outline:    "none",
  boxSizing:  "border-box",
};

const inputError: React.CSSProperties = {
  border:     "1px solid #b84c4c",
  background: "rgba(184,76,76,0.04)",
};

const body: React.CSSProperties = {
  fontFamily: "var(--font-body), Manrope, sans-serif",
  fontSize:   "0.875rem",
};
