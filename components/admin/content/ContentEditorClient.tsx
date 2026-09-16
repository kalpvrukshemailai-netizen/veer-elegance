"use client";

/**
 * VEER ELEGANCE — Admin Content Editor Client Component
 *
 * Provides a structured, section-based editorial management interface.
 * Controls About page, Founder, Philosophy, Wholesale, Physical Store,
 * Global Footer, Contact, Social, and Newsletter content.
 */

import React, { useState } from "react";
import Link from "next/link";
import {
  saveContentSectionAction,
  resetContentSectionAction,
} from "@/app/admin/content/actions";
import type { SiteContentBundle, DisplayTargetKey } from "@/lib/site-content";
import {
  DISPLAY_TARGET_OPTIONS,
  isValidStorefrontCustomUrl,
  normalizeStorefrontPath,
} from "@/lib/announcement-targeting";
import FounderPortraitUploader from "./FounderPortraitUploader";
import PopupImageUploader from "./PopupImageUploader";

interface ContentEditorClientProps {
  initialContent: SiteContentBundle;
}

type TabKey =
  | "announcement"
  | "popup"
  | "about"
  | "founder"
  | "philosophy"
  | "wholesale"
  | "store"
  | "footer"
  | "contact"
  | "social"
  | "newsletter"
  | "shipping";

interface TabConfig {
  key:   TabKey;
  label: string;
  badge: string;
}

const TABS: TabConfig[] = [
  { key: "announcement",label: "Offer Bar",         badge: "Marquee" },
  { key: "popup",       label: "Homepage Popup",    badge: "Ad Modal" },
  { key: "about",       label: "About Hero",        badge: "Story" },
  { key: "founder",     label: "The Founder",       badge: "Profile" },
  { key: "philosophy",  label: "Philosophy",        badge: "Pillars" },
  { key: "wholesale",   label: "Wholesale & B2B",   badge: "Enquiry" },
  { key: "store",       label: "Physical Store",    badge: "Studio" },
  { key: "footer",      label: "Global Footer",     badge: "Layout" },
  { key: "contact",     label: "Contact & Hours",   badge: "Support" },
  { key: "social",      label: "Social Links",      badge: "Media" },
  { key: "newsletter",  label: "Newsletter Copy",   badge: "Signup" },
  { key: "shipping",    label: "Shipping & Rates",  badge: "Delivery" },
];

export default function ContentEditorClient({ initialContent }: ContentEditorClientProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("about");
  const [content, setContent] = useState<SiteContentBundle>(initialContent);

  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Field change handler for active section
  function handleChange(field: string, value: any) {
    setContent((prev) => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        [field]: value,
      },
    }));
    setStatusMsg(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);

    try {
      const sectionData = content[activeTab];
      const res = await saveContentSectionAction(activeTab, sectionData);
      if (res.success) {
        setStatusMsg({ type: "success", text: res.message || "Changes saved successfully." });
      } else {
        setStatusMsg({ type: "error", text: res.error || "Failed to save changes." });
      }
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err?.message || "An unexpected error occurred." });
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    const confirmed = window.confirm(
      `Are you sure you want to reset the "${TABS.find((t) => t.key === activeTab)?.label}" section back to its default copy?`,
    );
    if (!confirmed) return;

    setSaving(true);
    setStatusMsg(null);

    try {
      const res = await resetContentSectionAction(activeTab);
      if (res.success) {
        setStatusMsg({ type: "success", text: "Section reset to default copy." });
      } else {
        setStatusMsg({ type: "error", text: res.error || "Failed to reset section." });
      }
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err?.message || "An error occurred while resetting." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      {/* ── Top Header Bar ─────────────────────────────────────────────── */}
      <div
        style={{
          display:        "flex",
          justifyContent: "space-between",
          alignItems:     "center",
          flexWrap:       "wrap",
          gap:            "1rem",
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "var(--font-body), Manrope, sans-serif",
              fontSize:   "1.5rem",
              fontWeight: 600,
              color:      "var(--color-espresso)",
              margin:     "0 0 0.25rem 0",
            }}
          >
            Site Content &amp; CMS
          </h1>
          <p
            style={{
              fontFamily: "var(--font-body), Manrope, sans-serif",
              fontSize:   "0.8125rem",
              color:      "var(--color-espresso-muted)",
              margin:     0,
            }}
          >
            Manage brand storytelling, founder narrative, boutique studio details, and footer text.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <Link
            href="/about"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display:        "inline-flex",
              alignItems:     "center",
              gap:            "0.375rem",
              padding:        "0.5rem 0.875rem",
              background:     "var(--color-ivory)",
              border:         "1px solid var(--border)",
              color:          "var(--color-espresso)",
              fontSize:       "0.75rem",
              fontWeight:     600,
              textDecoration: "none",
              borderRadius:   "2px",
            }}
          >
            Preview /about ↗
          </Link>
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display:        "inline-flex",
              alignItems:     "center",
              gap:            "0.375rem",
              padding:        "0.5rem 0.875rem",
              background:     "var(--color-ivory)",
              border:         "1px solid var(--border)",
              color:          "var(--color-espresso)",
              fontSize:       "0.75rem",
              fontWeight:     600,
              textDecoration: "none",
              borderRadius:   "2px",
            }}
          >
            View Storefront ↗
          </Link>
        </div>
      </div>

      {/* ── Tab Navigation Pills ─────────────────────────────────────────── */}
      <div
        role="tablist"
        aria-label="Content sections"
        style={{
          display:      "flex",
          gap:          "0.375rem",
          overflowX:    "auto",
          paddingBottom:"0.25rem",
          borderBottom: "1px solid var(--border)",
        }}
      >
        {TABS.map((t) => {
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              role="tab"
              type="button"
              aria-selected={isActive}
              onClick={() => {
                setActiveTab(t.key);
                setStatusMsg(null);
              }}
              style={{
                display:       "inline-flex",
                alignItems:    "center",
                gap:           "0.5rem",
                padding:       "0.625rem 1rem",
                fontFamily:    "var(--font-body), Manrope, sans-serif",
                fontSize:      "0.8125rem",
                fontWeight:    isActive ? 700 : 500,
                color:         isActive ? "var(--color-espresso)" : "var(--color-espresso-muted)",
                background:    isActive ? "var(--color-ivory)" : "transparent",
                border:        "1px solid",
                borderColor:   isActive ? "var(--border)" : "transparent",
                borderBottom:  isActive ? "2px solid var(--color-espresso)" : "2px solid transparent",
                cursor:        "pointer",
                whiteSpace:    "nowrap",
                transition:    "all 150ms ease",
              }}
            >
              <span>{t.label}</span>
              <span
                style={{
                  fontSize:      "0.625rem",
                  padding:       "0.1rem 0.4rem",
                  borderRadius:  "9999px",
                  background:    isActive ? "var(--color-espresso)" : "rgba(0,0,0,0.06)",
                  color:         isActive ? "var(--color-ivory)" : "inherit",
                }}
              >
                {t.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Status Message Banner ────────────────────────────────────────── */}
      {statusMsg && (
        <div
          role="status"
          style={{
            padding:         "0.75rem 1rem",
            borderRadius:    "2px",
            fontSize:        "0.8125rem",
            fontFamily:      "var(--font-body), Manrope, sans-serif",
            background:      statusMsg.type === "success" ? "#F0FDF4" : "#FEF2F2",
            border:          `1px solid ${statusMsg.type === "success" ? "#BBF7D0" : "#FECACA"}`,
            color:           statusMsg.type === "success" ? "#166534" : "#991B1B",
            display:         "flex",
            justifyContent:  "space-between",
            alignItems:      "center",
          }}
        >
          <span>{statusMsg.text}</span>
          <button
            type="button"
            onClick={() => setStatusMsg(null)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", fontSize: "0.75rem" }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Active Section Editor Form ──────────────────────────────────── */}
      <form
        onSubmit={handleSave}
        style={{
          background:   "var(--color-ivory)",
          border:       "1px solid var(--border)",
          padding:      "clamp(1.5rem, 3vw, 2.25rem)",
          display:      "flex",
          flexDirection:"column",
          gap:          "1.5rem",
        }}
      >
        {/* ── TAB 0A: ANNOUNCEMENT BAR ─────────────────────────────────── */}
        {activeTab === "announcement" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <SectionIntro
              title="Homepage Offer Announcement Bar"
              description="Configure the continuous horizontal marquee scrolling bar displayed at the top of the homepage."
            />

            {/* Enable Toggle */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "1rem 1.25rem",
                background: "var(--color-parchment)",
                border: "1px solid var(--border)",
              }}
            >
              <div>
                <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.875rem", fontWeight: 600, color: "var(--color-espresso)", margin: "0 0 0.25rem" }}>
                  Announcement Bar Visibility
                </p>
                <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.75rem", color: "var(--color-espresso-muted)", margin: 0 }}>
                  Turn ON to display the scrolling offer banner at the top of the homepage.
                </p>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={Boolean(content.announcement?.enabled)}
                  onChange={(e) => handleChange("enabled", e.target.checked)}
                  style={{ width: "1.25rem", height: "1.25rem", accentColor: "var(--color-espresso)", cursor: "pointer" }}
                />
                <span style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: content.announcement?.enabled ? "#2e7d32" : "var(--color-espresso-muted)" }}>
                  {content.announcement?.enabled ? "Enabled" : "Disabled"}
                </span>
              </label>
            </div>

            {/* Offer Text */}
            <FormField
              label="Announcement / Offer Text"
              value={content.announcement?.text ?? ""}
              onChange={(val) => handleChange("text", val)}
              placeholder="e.g. ✨ Festive Offer: Enjoy 15% off with code VEER15 • Free delivery on orders over ₹1,499 • 100% Anti-Tarnish Stainless Steel"
              hint="This text will scroll continuously in an infinite horizontal loop across the top of the page."
            />

            {/* ── Display Targeting Section ───────────────────────────── */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
                padding: "1.25rem",
                background: "var(--color-parchment)",
                border: "1px solid var(--border)",
              }}
            >
              <div>
                <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.875rem", fontWeight: 600, color: "var(--color-espresso)", margin: "0 0 0.25rem" }}>
                  Display On (Page Targeting)
                </p>
                <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.75rem", color: "var(--color-espresso-muted)", margin: 0 }}>
                  Select where the announcement bar should appear. Admin pages are automatically excluded.
                </p>
              </div>

              {/* Grid of Checkbox Options */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                  gap: "0.75rem",
                }}
              >
                {DISPLAY_TARGET_OPTIONS.map((opt) => {
                  const currentTargets: DisplayTargetKey[] = content.announcement?.displayTargets ?? ["all"];
                  const isAllActive = currentTargets.includes("all");
                  const isChecked = opt.key === "all" ? isAllActive : !isAllActive && currentTargets.includes(opt.key);

                  return (
                    <label
                      key={opt.key}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "0.625rem",
                        padding: "0.75rem 0.875rem",
                        background: isChecked ? "var(--color-ivory)" : "color-mix(in srgb, var(--color-parchment-deep) 30%, transparent)",
                        border: isChecked ? "1px solid var(--color-espresso)" : "1px solid var(--border)",
                        cursor: "pointer",
                        transition: "all 150ms ease",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          let next: DisplayTargetKey[];
                          if (opt.key === "all") {
                            next = ["all"];
                          } else {
                            // If "all" was selected, clicking another option starts fresh with that option
                            const filtered = isAllActive ? [] : currentTargets.filter((k) => k !== "all");
                            if (filtered.includes(opt.key)) {
                              next = filtered.filter((k) => k !== opt.key);
                              if (next.length === 0) next = ["all"];
                            } else {
                              next = [...filtered, opt.key];
                            }
                          }
                          handleChange("displayTargets", next);
                        }}
                        style={{
                          marginTop: "0.125rem",
                          width: "1rem",
                          height: "1rem",
                          accentColor: "var(--color-espresso)",
                          cursor: "pointer",
                        }}
                      />
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span
                          style={{
                            fontFamily: "var(--font-body), Manrope, sans-serif",
                            fontSize: "0.8125rem",
                            fontWeight: isChecked ? 700 : 500,
                            color: "var(--color-espresso)",
                          }}
                        >
                          {opt.label}
                        </span>
                        <span
                          style={{
                            fontFamily: "var(--font-body), Manrope, sans-serif",
                            fontSize: "0.6875rem",
                            color: "var(--color-espresso-muted)",
                            lineHeight: 1.3,
                          }}
                        >
                          {opt.description}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>

              {/* ── Custom URLs Manager ───────────────────────────────── */}
              {(!content.announcement?.displayTargets?.includes("all")) &&
                content.announcement?.displayTargets?.includes("custom") && (
                  <div
                    style={{
                      marginTop: "0.5rem",
                      padding: "1.25rem",
                      background: "var(--color-ivory)",
                      border: "1px solid var(--border)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "1rem",
                    }}
                  >
                    <div>
                      <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.8125rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--color-espresso)", margin: "0 0 0.25rem" }}>
                        Custom URLs (Exact Storefront Paths)
                      </p>
                      <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.75rem", color: "var(--color-espresso-muted)", margin: 0 }}>
                        Specify exact internal paths (e.g. <code>/sale</code>, <code>/collections/diwali</code>). Wildcards are not supported.
                      </p>
                    </div>

                    {/* URL items list */}
                    {(content.announcement?.customUrls ?? []).map((url, idx) => {
                      const isValid = isValidStorefrontCustomUrl(url);
                      const isDuplicate = (content.announcement?.customUrls ?? []).filter((u, i) => i !== idx && normalizeStorefrontPath(u) === normalizeStorefrontPath(url)).length > 0;

                      return (
                        <div key={idx} style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                            <input
                              type="text"
                              value={url}
                              onChange={(e) => {
                                const list = [...(content.announcement?.customUrls ?? [])];
                                list[idx] = e.target.value;
                                handleChange("customUrls", list);
                              }}
                              onBlur={(e) => {
                                const list = [...(content.announcement?.customUrls ?? [])];
                                const trimmed = e.target.value.trim();
                                if (trimmed && isValidStorefrontCustomUrl(trimmed)) {
                                  list[idx] = normalizeStorefrontPath(trimmed);
                                  handleChange("customUrls", list);
                                }
                              }}
                              placeholder="/sale, /collections/festive"
                              style={{
                                flex: 1,
                                padding: "0.5rem 0.75rem",
                                background: "var(--color-parchment)",
                                border: (!isValid || isDuplicate) ? "1px solid #b84c4c" : "1px solid var(--border)",
                                fontFamily: "var(--font-body), Manrope, monospace",
                                fontSize: "0.8125rem",
                                color: "var(--color-espresso)",
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const list = (content.announcement?.customUrls ?? []).filter((_, i) => i !== idx);
                                handleChange("customUrls", list);
                              }}
                              style={{
                                padding: "0.5rem 0.875rem",
                                background: "transparent",
                                border: "1px solid #b84c4c",
                                color: "#b84c4c",
                                fontFamily: "var(--font-body), Manrope, sans-serif",
                                fontSize: "0.6875rem",
                                fontWeight: 700,
                                letterSpacing: "0.08em",
                                textTransform: "uppercase",
                                cursor: "pointer",
                              }}
                            >
                              Remove
                            </button>
                          </div>
                          {(!isValid && url.trim().length > 0) && (
                            <span style={{ fontSize: "0.6875rem", color: "#b84c4c" }}>
                              Must start with / and cannot contain wildcards (*) or external protocols.
                            </span>
                          )}
                          {isDuplicate && (
                            <span style={{ fontSize: "0.6875rem", color: "#b84c4c" }}>
                              Duplicate URL path. Please remove or change this entry.
                            </span>
                          )}
                        </div>
                      );
                    })}

                    {/* Add URL button */}
                    <div>
                      <button
                        type="button"
                        onClick={() => {
                          const list = [...(content.announcement?.customUrls ?? []), ""];
                          handleChange("customUrls", list);
                        }}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.375rem",
                          padding: "0.5rem 0.875rem",
                          background: "var(--color-espresso)",
                          color: "var(--color-ivory)",
                          border: "none",
                          fontFamily: "var(--font-body), Manrope, sans-serif",
                          fontSize: "0.6875rem",
                          fontWeight: 700,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          cursor: "pointer",
                        }}
                      >
                        + Add Custom URL
                      </button>
                    </div>
                  </div>
                )}
            </div>

            {/* Color Controls */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem" }}>
              <ColorField
                label="Background Color"
                value={content.announcement?.backgroundColor ?? "#2C1810"}
                onChange={(val) => handleChange("backgroundColor", val)}
                hint="Hex color for the announcement bar background (e.g. #2C1810)."
              />
              <ColorField
                label="Text Color"
                value={content.announcement?.textColor ?? "#FAF8F5"}
                onChange={(val) => handleChange("textColor", val)}
                hint="Hex color for the primary scrolling text (e.g. #FAF8F5)."
              />
              <ColorField
                label="Accent / Border Color"
                value={content.announcement?.accentColor ?? "#B89A68"}
                onChange={(val) => handleChange("accentColor", val)}
                hint="Hex color for decorative bullets or subtle borders (e.g. #B89A68)."
              />
            </div>

            {/* Live Preview Box */}
            <div style={{ marginTop: "0.5rem" }}>
              <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-espresso-muted)", margin: "0 0 0.5rem" }}>
                Live Visual Preview
              </p>
              <div
                style={{
                  background: content.announcement?.backgroundColor || "#2C1810",
                  color: content.announcement?.textColor || "#FAF8F5",
                  borderBottom: `1px solid ${content.announcement?.accentColor || "#B89A68"}40`,
                  padding: "0.625rem 1rem",
                  fontFamily: "var(--font-body), Manrope, sans-serif",
                  fontSize: "0.75rem",
                  letterSpacing: "0.08em",
                  fontWeight: 500,
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  textAlign: "center",
                }}
              >
                {content.announcement?.text || "Announcement text will appear here…"}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 0B: HOMEPAGE POPUP AD ─────────────────────────────────── */}
        {activeTab === "popup" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <SectionIntro
              title="Homepage Promotional Popup Ad"
              description="Configure the promotional ad modal displayed to visitors on the homepage."
            />

            {/* Enable Toggle */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "1rem 1.25rem",
                background: "var(--color-parchment)",
                border: "1px solid var(--border)",
              }}
            >
              <div>
                <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.875rem", fontWeight: 600, color: "var(--color-espresso)", margin: "0 0 0.25rem" }}>
                  Popup Modal Visibility
                </p>
                <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.75rem", color: "var(--color-espresso-muted)", margin: 0 }}>
                  Turn ON to display the popup ad on the homepage (shown at most once per session per visitor).
                </p>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={Boolean(content.popup?.enabled)}
                  onChange={(e) => handleChange("enabled", e.target.checked)}
                  style={{ width: "1.25rem", height: "1.25rem", accentColor: "var(--color-espresso)", cursor: "pointer" }}
                />
                <span style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: content.popup?.enabled ? "#2e7d32" : "var(--color-espresso-muted)" }}>
                  {content.popup?.enabled ? "Enabled" : "Disabled"}
                </span>
              </label>
            </div>

            {/* Popup Image Uploader */}
            <PopupImageUploader
              imageUrl={content.popup?.imageUrl ?? ""}
              onImageChange={(url) => handleChange("imageUrl", url)}
            />

            {/* Redirect URL */}
            <FormField
              label="Click Destination / Redirect URL"
              value={content.popup?.redirectUrl ?? ""}
              onChange={(val) => handleChange("redirectUrl", val)}
              placeholder="/shop, /collections/festive, /product/royal-box-chain, or https://..."
              hint="Where visitors are redirected when clicking the advertisement. Supports internal routes or external HTTPS URLs."
            />
          </div>
        )}

        {/* ── TAB A: ABOUT HERO ─────────────────────────────────────────── */}
        {activeTab === "about" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <SectionIntro title="About Page Hero" description="Controls the top headline and introduction on /about." />
            <FormField
              label="Eyebrow"
              value={content.about.aboutEyebrow}
              onChange={(val) => handleChange("aboutEyebrow", val)}
              placeholder="Our Story"
            />
            <FormField
              label="Main Heading / Title"
              value={content.about.aboutTitle}
              onChange={(val) => handleChange("aboutTitle", val)}
              placeholder="Veer Elegance"
            />
            <FormField
              label="Introductory Copy"
              value={content.about.aboutIntro}
              onChange={(val) => handleChange("aboutIntro", val)}
              isTextarea
              rows={4}
              placeholder="Born from an appreciation for understated luxury..."
            />
          </div>
        )}

        {/* ── TAB B: FOUNDER SECTION ───────────────────────────────────── */}
        {activeTab === "founder" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <SectionIntro title="The Founder" description="Editorial narrative, portrait, and quote for the founder spotlight." />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <FormField
                label="Eyebrow"
                value={content.founder.founderEyebrow}
                onChange={(val) => handleChange("founderEyebrow", val)}
                placeholder="Behind The Craft"
              />
              <FormField
                label="Founder Name"
                value={content.founder.founderName}
                onChange={(val) => handleChange("founderName", val)}
                placeholder="The Founder"
              />
            </div>
            <FormField
              label="Role / Title"
              value={content.founder.founderRole}
              onChange={(val) => handleChange("founderRole", val)}
              placeholder="Creative Director & Founder"
            />

            {/* Founder Portrait Upload & Preview Control */}
            <FounderPortraitUploader
              imageUrl={content.founder.founderImageUrl}
              onImageChange={(val) => handleChange("founderImageUrl", val)}
            />

            <FormField
              label="Founder Quote"
              value={content.founder.founderQuote}
              onChange={(val) => handleChange("founderQuote", val)}
              isTextarea
              rows={3}
              placeholder="Jewellery should not be reserved for rare occasions..."
            />
            <FormField
              label="Founder Story (Multi-paragraph)"
              value={content.founder.founderStory}
              onChange={(val) => handleChange("founderStory", val)}
              isTextarea
              rows={6}
              placeholder="Separate paragraphs with a blank line..."
              hint="Line breaks and paragraphs will be preserved on the public page."
            />
          </div>
        )}

        {/* ── TAB C: BRAND PHILOSOPHY ─────────────────────────────────── */}
        {activeTab === "philosophy" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <SectionIntro title="Brand Philosophy" description="Four core pillars featured in 'Why Veer Elegance'." />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1rem" }}>
              <FormField
                label="Section Eyebrow"
                value={content.philosophy.philosophyEyebrow}
                onChange={(val) => handleChange("philosophyEyebrow", val)}
                placeholder="Why Veer Elegance"
              />
              <FormField
                label="Section Headline"
                value={content.philosophy.philosophyTitle}
                onChange={(val) => handleChange("philosophyTitle", val)}
                placeholder="Designed to be Lived In."
              />
            </div>
            <FormField
              label="Subheading / Summary"
              value={content.philosophy.philosophyBody}
              onChange={(val) => handleChange("philosophyBody", val)}
              placeholder="Fine jewellery crafted with modern resilience and timeless simplicity."
            />

            <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "0.5rem 0" }} />

            {/* 4 Pillars */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <p style={{ fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", color: "var(--color-gold-muted)", margin: 0 }}>
                  Pillar 01
                </p>
                <FormField
                  label="Title"
                  value={content.philosophy.philosophyPoint1Title}
                  onChange={(val) => handleChange("philosophyPoint1Title", val)}
                />
                <FormField
                  label="Description"
                  value={content.philosophy.philosophyPoint1Body}
                  onChange={(val) => handleChange("philosophyPoint1Body", val)}
                  isTextarea
                  rows={3}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <p style={{ fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", color: "var(--color-gold-muted)", margin: 0 }}>
                  Pillar 02
                </p>
                <FormField
                  label="Title"
                  value={content.philosophy.philosophyPoint2Title}
                  onChange={(val) => handleChange("philosophyPoint2Title", val)}
                />
                <FormField
                  label="Description"
                  value={content.philosophy.philosophyPoint2Body}
                  onChange={(val) => handleChange("philosophyPoint2Body", val)}
                  isTextarea
                  rows={3}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <p style={{ fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", color: "var(--color-gold-muted)", margin: 0 }}>
                  Pillar 03
                </p>
                <FormField
                  label="Title"
                  value={content.philosophy.philosophyPoint3Title}
                  onChange={(val) => handleChange("philosophyPoint3Title", val)}
                />
                <FormField
                  label="Description"
                  value={content.philosophy.philosophyPoint3Body}
                  onChange={(val) => handleChange("philosophyPoint3Body", val)}
                  isTextarea
                  rows={3}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <p style={{ fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", color: "var(--color-gold-muted)", margin: 0 }}>
                  Pillar 04
                </p>
                <FormField
                  label="Title"
                  value={content.philosophy.philosophyPoint4Title}
                  onChange={(val) => handleChange("philosophyPoint4Title", val)}
                />
                <FormField
                  label="Description"
                  value={content.philosophy.philosophyPoint4Body}
                  onChange={(val) => handleChange("philosophyPoint4Body", val)}
                  isTextarea
                  rows={3}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── TAB D: WHOLESALE / BULK ───────────────────────────────────── */}
        {activeTab === "wholesale" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <SectionIntro title="Wholesale & Bulk Enquiries" description="Introductory copy for B2B buyer partnerships." />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1rem" }}>
              <FormField
                label="Eyebrow"
                value={content.wholesale.wholesaleEyebrow}
                onChange={(val) => handleChange("wholesaleEyebrow", val)}
                placeholder="B2B & Partnerships"
              />
              <FormField
                label="Title"
                value={content.wholesale.wholesaleTitle}
                onChange={(val) => handleChange("wholesaleTitle", val)}
                placeholder="Wholesale & Bulk Enquiries"
              />
            </div>
            <FormField
              label="Description"
              value={content.wholesale.wholesaleDescription}
              onChange={(val) => handleChange("wholesaleDescription", val)}
              isTextarea
              rows={3}
              placeholder="We partner with discerning boutiques..."
            />
            <FormField
              label="Submit Button Label"
              value={content.wholesale.wholesaleButtonLabel}
              onChange={(val) => handleChange("wholesaleButtonLabel", val)}
              placeholder="Submit Business Enquiry"
            />
          </div>
        )}

        {/* ── TAB E: PHYSICAL STORE ─────────────────────────────────────── */}
        {activeTab === "store" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <SectionIntro title="Physical Store & Studio" description="Flagship location details and customer visiting hours." />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1rem" }}>
              <FormField
                label="Eyebrow"
                value={content.store.storeEyebrow}
                onChange={(val) => handleChange("storeEyebrow", val)}
                placeholder="Studio & Physical Presence"
              />
              <FormField
                label="Section Heading"
                value={content.store.storeTitle}
                onChange={(val) => handleChange("storeTitle", val)}
                placeholder="Visit Our Flagship Studio"
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <FormField
                label="Studio / Store Name"
                value={content.store.storeName}
                onChange={(val) => handleChange("storeName", val)}
                placeholder="Veer Elegance Studio"
              />
              <FormField
                label="Street Address (optional)"
                value={content.store.storeAddress}
                onChange={(val) => handleChange("storeAddress", val)}
                placeholder="e.g. 102 Luxury Boulevard"
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1rem" }}>
              <FormField
                label="City"
                value={content.store.storeCity}
                onChange={(val) => handleChange("storeCity", val)}
                placeholder="Mumbai"
              />
              <FormField
                label="State"
                value={content.store.storeState}
                onChange={(val) => handleChange("storeState", val)}
                placeholder="Maharashtra"
              />
              <FormField
                label="Postal Code"
                value={content.store.storePostalCode}
                onChange={(val) => handleChange("storePostalCode", val)}
                placeholder="400001"
              />
              <FormField
                label="Country"
                value={content.store.storeCountry}
                onChange={(val) => handleChange("storeCountry", val)}
                placeholder="India"
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <FormField
                label="Phone (optional)"
                value={content.store.storePhone}
                onChange={(val) => handleChange("storePhone", val)}
                placeholder="+91 98765 43210"
              />
              <FormField
                label="Email"
                value={content.store.storeEmail}
                onChange={(val) => handleChange("storeEmail", val)}
                placeholder="concierge@veerelegance.com"
              />
            </div>
            <FormField
              label="Business Hours (one schedule per line)"
              value={content.store.storeBusinessHours}
              onChange={(val) => handleChange("storeBusinessHours", val)}
              isTextarea
              rows={3}
              placeholder="Monday – Saturday: 11:00 AM – 7:00 PM&#10;Sunday: By Private Appointment"
            />
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
              <FormField
                label="Google Maps URL (optional)"
                value={content.store.storeGoogleMapsUrl}
                onChange={(val) => handleChange("storeGoogleMapsUrl", val)}
                placeholder="https://maps.google.com/?q=..."
                hint="If provided, enables the 'Get Directions' link on the storefront."
              />
              <FormField
                label="Directions CTA Label"
                value={content.store.storeCtaLabel}
                onChange={(val) => handleChange("storeCtaLabel", val)}
                placeholder="Get Directions →"
              />
            </div>
            <FormField
              label="Appointment Note"
              value={content.store.storeAppointmentNote}
              onChange={(val) => handleChange("storeAppointmentNote", val)}
              isTextarea
              rows={2}
              placeholder="For wholesale viewings, advance appointments are recommended."
            />
          </div>
        )}

        {/* ── TAB F: GLOBAL FOOTER ──────────────────────────────────────── */}
        {activeTab === "footer" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <SectionIntro title="Global Footer Labels" description="Controls column headings across the global customer footer." />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <FormField
                label="Care Column Heading"
                value={content.footer.footerCareTitle}
                onChange={(val) => handleChange("footerCareTitle", val)}
                placeholder="Care & Services"
              />
              <FormField
                label="Contact Column Heading"
                value={content.footer.footerContactTitle}
                onChange={(val) => handleChange("footerContactTitle", val)}
                placeholder="Contact & Studio"
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1rem" }}>
              <FormField
                label="Newsletter Heading"
                value={content.footer.footerNewsletterTitle}
                onChange={(val) => handleChange("footerNewsletterTitle", val)}
                placeholder="Sign Up & Save"
              />
              <FormField
                label="Newsletter Description"
                value={content.footer.footerNewsletterDescription}
                onChange={(val) => handleChange("footerNewsletterDescription", val)}
                placeholder="Receive private previews of new anti-tarnish drops..."
              />
            </div>
          </div>
        )}

        {/* ── TAB G: CONTACT & HOURS ────────────────────────────────────── */}
        {activeTab === "contact" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <SectionIntro title="Contact & Customer Care" description="Customer concierge contact details." />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <FormField
                label="Concierge Email"
                value={content.contact.contactEmail}
                onChange={(val) => handleChange("contactEmail", val)}
                placeholder="concierge@veerelegance.com"
              />
              <FormField
                label="Support Phone (optional)"
                value={content.contact.contactPhone}
                onChange={(val) => handleChange("contactPhone", val)}
                placeholder="+91 98765 43210"
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <FormField
                label="WhatsApp Number/Link (optional)"
                value={content.contact.contactWhatsApp}
                onChange={(val) => handleChange("contactWhatsApp", val)}
                placeholder="+91 98765 43210"
              />
              <FormField
                label="Operating Hours (multiline)"
                value={content.contact.contactBusinessHours}
                onChange={(val) => handleChange("contactBusinessHours", val)}
                isTextarea
                rows={2}
                placeholder="Mon – Sat: 11:00 AM – 7:00 PM IST"
              />
            </div>
          </div>
        )}

        {/* ── TAB H: SOCIAL LINKS ───────────────────────────────────────── */}
        {activeTab === "social" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <SectionIntro
              title="Social Media Links"
              description="Links to brand channels. Only channels with valid URLs will be rendered on the website."
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <FormField
                label="Instagram URL"
                value={content.social.instagramUrl}
                onChange={(val) => handleChange("instagramUrl", val)}
                placeholder="https://instagram.com/veerelegance"
              />
              <FormField
                label="Facebook URL"
                value={content.social.facebookUrl}
                onChange={(val) => handleChange("facebookUrl", val)}
                placeholder="https://facebook.com/veerelegance"
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <FormField
                label="YouTube URL"
                value={content.social.youtubeUrl}
                onChange={(val) => handleChange("youtubeUrl", val)}
                placeholder="https://youtube.com/@veerelegance"
              />
              <FormField
                label="LinkedIn URL"
                value={content.social.linkedinUrl}
                onChange={(val) => handleChange("linkedinUrl", val)}
                placeholder="https://linkedin.com/company/veerelegance"
              />
            </div>
          </div>
        )}

        {/* ── TAB I: NEWSLETTER ─────────────────────────────────────────── */}
        {activeTab === "newsletter" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <SectionIntro title="Newsletter Signup Copy" description="Controls text in the footer newsletter module." />
            <FormField
              label="Newsletter Heading"
              value={content.newsletter.newsletterTitle}
              onChange={(val) => handleChange("newsletterTitle", val)}
              placeholder="Sign Up & Save"
            />
            <FormField
              label="Newsletter Description"
              value={content.newsletter.newsletterDescription}
              onChange={(val) => handleChange("newsletterDescription", val)}
              isTextarea
              rows={2}
              placeholder="Receive private previews of new anti-tarnish drops..."
            />
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
              <FormField
                label="Input Placeholder"
                value={content.newsletter.newsletterPlaceholder}
                onChange={(val) => handleChange("newsletterPlaceholder", val)}
                placeholder="Enter your email address"
              />
              <FormField
                label="Button Label"
                value={content.newsletter.newsletterButtonLabel}
                onChange={(val) => handleChange("newsletterButtonLabel", val)}
                placeholder="Join"
              />
            </div>
          </div>
        )}

        {/* ── 10. SHIPPING ────────────────────────────────────────────── */}
        {activeTab === "shipping" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <SectionIntro
              title="Shipping Charges & Free Delivery Threshold"
              description="Configure your standard delivery rate (in INR) and the minimum order subtotal required to qualify for free standard shipping. Affects all future customer checkouts."
            />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                <label
                  style={{
                    fontFamily:    "var(--font-body), Manrope, sans-serif",
                    fontSize:      "0.6875rem",
                    fontWeight:    700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color:         "var(--color-espresso)",
                  }}
                >
                  Standard Shipping Rate (₹ INR)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={content.shipping?.shippingRate ?? 49}
                  onChange={(e) => handleChange("shippingRate", Number(e.target.value))}
                  placeholder="e.g. 49"
                  style={{
                    background: "var(--color-parchment)",
                    border:     "1px solid var(--border)",
                    color:      "var(--color-espresso)",
                    padding:    "0.625rem 0.875rem",
                    fontFamily: "var(--font-body), Manrope, sans-serif",
                    fontSize:   "0.8125rem",
                    outline:    "none",
                  }}
                />
                <span style={{ fontSize: "0.6875rem", color: "var(--color-espresso-muted)", fontFamily: "var(--font-body), Manrope, sans-serif" }}>
                  Charged on Standard Delivery orders below the free shipping threshold.
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                <label
                  style={{
                    fontFamily:    "var(--font-body), Manrope, sans-serif",
                    fontSize:      "0.6875rem",
                    fontWeight:    700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color:         "var(--color-espresso)",
                  }}
                >
                  Free Shipping Threshold (₹ INR)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={content.shipping?.freeShippingThreshold ?? 1499}
                  onChange={(e) => handleChange("freeShippingThreshold", Number(e.target.value))}
                  placeholder="e.g. 1499"
                  style={{
                    background: "var(--color-parchment)",
                    border:     "1px solid var(--border)",
                    color:      "var(--color-espresso)",
                    padding:    "0.625rem 0.875rem",
                    fontFamily: "var(--font-body), Manrope, sans-serif",
                    fontSize:   "0.8125rem",
                    outline:    "none",
                  }}
                />
                <span style={{ fontSize: "0.6875rem", color: "var(--color-espresso-muted)", fontFamily: "var(--font-body), Manrope, sans-serif" }}>
                  Orders with subtotal at or above this amount receive FREE Standard shipping.
                </span>
              </div>
            </div>

            {/* Live Calculation Preview */}
            <div
              style={{
                marginTop:    "0.5rem",
                padding:      "1rem 1.25rem",
                background:   "var(--color-parchment-deep)",
                border:       "1px solid var(--border)",
                borderRadius: "2px",
              }}
            >
              <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-espresso)" }}>
                Live Checkout Calculation Preview
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", fontSize: "0.75rem", fontFamily: "var(--font-body), Manrope, sans-serif" }}>
                <div style={{ padding: "0.75rem", background: "var(--color-parchment)", border: "1px solid var(--border)" }}>
                  <p style={{ margin: "0 0 0.25rem 0", fontWeight: 600, color: "var(--color-espresso)" }}>
                    Standard (Subtotal ₹999 &lt; ₹{content.shipping?.freeShippingThreshold ?? 1499})
                  </p>
                  <p style={{ margin: 0, color: "var(--color-espresso-muted)" }}>
                    Shipping: <strong style={{ color: "var(--color-espresso)" }}>{Number(content.shipping?.shippingRate) > 0 ? `₹${content.shipping?.shippingRate}` : "FREE"}</strong>
                    <br />
                    Total Payable: <strong style={{ color: "var(--color-espresso)" }}>₹{999 + (Number(content.shipping?.freeShippingThreshold) > 0 && 999 < Number(content.shipping?.freeShippingThreshold) ? Number(content.shipping?.shippingRate || 0) : 0)}</strong>
                  </p>
                </div>
                <div style={{ padding: "0.75rem", background: "var(--color-parchment)", border: "1px solid var(--border)" }}>
                  <p style={{ margin: "0 0 0.25rem 0", fontWeight: 600, color: "var(--color-espresso)" }}>
                    Standard (Subtotal ₹{Math.max(1499, Number(content.shipping?.freeShippingThreshold) || 1499)} Free)
                  </p>
                  <p style={{ margin: 0, color: "var(--color-espresso-muted)" }}>
                    Shipping: <strong style={{ color: "#2e7d32" }}>FREE</strong>
                    <br />
                    Total Payable: <strong style={{ color: "var(--color-espresso)" }}>₹{Math.max(1499, Number(content.shipping?.freeShippingThreshold) || 1499)}</strong>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Action Buttons ────────────────────────────────────────────── */}
        <div
          style={{
            display:        "flex",
            justifyContent: "space-between",
            alignItems:     "center",
            paddingTop:     "1.25rem",
            borderTop:      "1px solid var(--border)",
            marginTop:      "0.5rem",
            flexWrap:       "wrap",
            gap:            "1rem",
          }}
        >
          <button
            type="button"
            onClick={handleReset}
            disabled={saving}
            style={{
              padding:       "0.625rem 1.125rem",
              background:    "transparent",
              border:        "1px solid var(--border)",
              color:         "var(--color-espresso-muted)",
              fontFamily:    "var(--font-body), Manrope, sans-serif",
              fontSize:      "0.75rem",
              fontWeight:    600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              cursor:        saving ? "not-allowed" : "pointer",
              borderRadius:  "2px",
            }}
          >
            Reset to Default Copy
          </button>

          <button
            type="submit"
            disabled={saving}
            style={{
              padding:       "0.75rem 2rem",
              background:    "var(--color-espresso)",
              border:        "1px solid var(--color-espresso)",
              color:         "var(--color-ivory)",
              fontFamily:    "var(--font-body), Manrope, sans-serif",
              fontSize:      "0.75rem",
              fontWeight:    700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              cursor:        saving ? "not-allowed" : "pointer",
              opacity:       saving ? 0.7 : 1,
              borderRadius:  "2px",
              boxShadow:     "0 4px 14px rgba(59, 28, 15, 0.15)",
              transition:    "opacity 150ms ease",
            }}
          >
            {saving ? "Saving Changes…" : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REUSABLE SUBCOMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function SectionIntro({ title, description }: { title: string; description: string }) {
  return (
    <div style={{ marginBottom: "0.5rem" }}>
      <h2
        style={{
          fontFamily: "var(--font-body), Manrope, sans-serif",
          fontSize:   "1.0625rem",
          fontWeight: 600,
          color:      "var(--color-espresso)",
          margin:     "0 0 0.25rem 0",
        }}
      >
        {title}
      </h2>
      <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.8125rem", color: "var(--color-espresso-muted)", margin: 0 }}>
        {description}
      </p>
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  isTextarea = false,
  rows = 3,
}: {
  label:        string;
  value:        string;
  onChange:     (val: string) => void;
  placeholder?: string;
  hint?:        string;
  isTextarea?:  boolean;
  rows?:        number;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
      <label
        style={{
          fontFamily:    "var(--font-body), Manrope, sans-serif",
          fontSize:      "0.6875rem",
          fontWeight:    700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color:         "var(--color-espresso)",
        }}
      >
        {label}
      </label>

      {isTextarea ? (
        <textarea
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          style={{
            background: "var(--color-parchment)",
            border:     "1px solid var(--border)",
            color:      "var(--color-espresso)",
            padding:    "0.625rem 0.875rem",
            fontFamily: "var(--font-body), Manrope, sans-serif",
            fontSize:   "0.8125rem",
            lineHeight: 1.6,
            outline:    "none",
            resize:     "vertical",
          }}
        />
      ) : (
        <input
          type="text"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            background: "var(--color-parchment)",
            border:     "1px solid var(--border)",
            color:      "var(--color-espresso)",
            padding:    "0.625rem 0.875rem",
            fontFamily: "var(--font-body), Manrope, sans-serif",
            fontSize:   "0.8125rem",
            outline:    "none",
          }}
        />
      )}

      {hint && (
        <span style={{ fontSize: "0.6875rem", color: "var(--color-espresso-muted)", fontFamily: "var(--font-body), Manrope, sans-serif" }}>
          {hint}
        </span>
      )}
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
  hint,
}: {
  label:    string;
  value:    string;
  onChange: (val: string) => void;
  hint?:    string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
      <label
        style={{
          fontFamily:    "var(--font-body), Manrope, sans-serif",
          fontSize:      "0.6875rem",
          fontWeight:    700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color:         "var(--color-espresso)",
        }}
      >
        {label}
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <input
          type="color"
          value={value?.startsWith("#") && (value.length === 7 || value.length === 4) ? value : "#2C1810"}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: "38px",
            height: "38px",
            border: "1px solid var(--border)",
            padding: "2px",
            background: "var(--color-parchment)",
            cursor: "pointer",
          }}
          aria-label={`${label} color picker`}
        />
        <input
          type="text"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#2C1810"
          style={{
            flex: 1,
            background: "var(--color-parchment)",
            border:     "1px solid var(--border)",
            color:      "var(--color-espresso)",
            padding:    "0.625rem 0.875rem",
            fontFamily: "var(--font-body), Manrope, sans-serif",
            fontSize:   "0.8125rem",
            outline:    "none",
          }}
        />
      </div>
      {hint && (
        <span style={{ fontSize: "0.6875rem", color: "var(--color-espresso-muted)", fontFamily: "var(--font-body), Manrope, sans-serif" }}>
          {hint}
        </span>
      )}
    </div>
  );
}
