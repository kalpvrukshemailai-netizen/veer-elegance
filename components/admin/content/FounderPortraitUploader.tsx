"use client";

/**
 * VEER ELEGANCE — Founder Portrait Uploader Component
 *
 * Dedicated admin component for uploading, previewing, and managing
 * the founder portrait image with server-side Supabase Storage integration.
 */

import React, { useRef, useState } from "react";
import { uploadFounderImageAction } from "@/app/admin/content/actions";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_MB = 5;

interface FounderPortraitUploaderProps {
  imageUrl: string;
  onImageChange: (newUrl: string) => void;
}

export default function FounderPortraitUploader({
  imageUrl,
  onImageChange,
}: FounderPortraitUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showManualUrl, setShowManualUrl] = useState(false);

  // ── Handle file selection ───────────────────────────────────────────────────
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccessMsg(null);

    // Client-side validation
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(`Unsupported file type "${file.type || "unknown"}". Please choose a JPG, PNG, or WEBP.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size === 0) {
      setError("The selected file is empty. Please choose a valid image file.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size > MAX_MB * 1024 * 1024) {
      setError(
        `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed size is ${MAX_MB} MB.`,
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = (ev) => {
      setLocalPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  // ── Handle upload ───────────────────────────────────────────────────────────
  async function handleUpload() {
    if (!selectedFile) return;

    setError(null);
    setSuccessMsg(null);
    setUploading(true);

    const formData = new FormData();
    formData.append("image", selectedFile);

    try {
      const res = await uploadFounderImageAction({}, formData);

      if (!res.success || !res.publicUrl) {
        setError(res.error || "Failed to upload image. Please try again.");
      } else {
        onImageChange(res.publicUrl);
        setSuccessMsg(
          "Founder portrait uploaded successfully. Click \"Save Changes\" below to publish.",
        );
        setSelectedFile(null);
        setLocalPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred during upload.";
      setError(msg);
    } finally {
      setUploading(false);
    }
  }

  // ── Cancel staged selection ─────────────────────────────────────────────────
  function handleCancelSelection() {
    setSelectedFile(null);
    setLocalPreview(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ── Remove image ────────────────────────────────────────────────────────────
  function handleRemoveImage() {
    onImageChange("");
    setSelectedFile(null);
    setLocalPreview(null);
    setError(null);
    setSuccessMsg(
      "Portrait removed. The refined architectural monogram will be shown on /about. Click \"Save Changes\" to apply.",
    );
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const activeDisplayUrl = localPreview || imageUrl;

  return (
    <div
      style={{
        background: "var(--color-ivory)",
        border: "1px solid var(--border)",
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      {/* ── Label & Instructions ───────────────────────────────────────────── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
          <label
            style={{
              fontFamily: "var(--font-body), Manrope, sans-serif",
              fontSize: "0.6875rem",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--color-espresso)",
            }}
          >
            Founder Portrait Image
          </label>
          <span
            style={{
              fontFamily: "var(--font-body), Manrope, sans-serif",
              fontSize: "0.6875rem",
              color: "var(--color-espresso-muted)",
            }}
          >
            JPG · PNG · WEBP · Max 5 MB
          </span>
        </div>
        <p
          style={{
            fontFamily: "var(--font-body), Manrope, sans-serif",
            fontSize: "0.75rem",
            color: "var(--color-espresso-muted)",
            margin: "0.25rem 0 0 0",
          }}
        >
          Editorial portrait displayed on the /about page. If unconfigured, the architectural monogram seal is displayed.
        </p>
      </div>

      {/* ── Main Upload & Preview Area ─────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: "1.25rem",
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        {/* Preview Frame (4:5 Aspect Ratio) */}
        <div
          style={{
            width: "120px",
            height: "150px",
            background: "linear-gradient(135deg, var(--color-parchment-deep), var(--color-parchment))",
            border: "1px solid var(--border)",
            position: "relative",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 4px 12px -2px rgba(44, 24, 16, 0.04)",
          }}
        >
          {activeDisplayUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeDisplayUrl}
                alt="Founder portrait preview"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "top center",
                }}
              />
              {localPreview && (
                <span
                  style={{
                    position: "absolute",
                    top: "4px",
                    left: "4px",
                    background: "var(--color-espresso)",
                    color: "var(--color-ivory)",
                    fontSize: "0.5625rem",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    padding: "0.15rem 0.375rem",
                  }}
                >
                  Staged
                </span>
              )}
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "0.5rem" }}>
              <div
                style={{
                  width: "2rem",
                  height: "2rem",
                  borderRadius: "50%",
                  border: "1px solid var(--color-gold-muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 0.375rem auto",
                  background: "rgba(255, 255, 255, 0.5)",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-display), 'Cormorant Garamond', serif",
                    fontSize: "0.875rem",
                    fontStyle: "italic",
                    color: "var(--color-espresso)",
                  }}
                >
                  VE
                </span>
              </div>
              <span
                style={{
                  fontFamily: "var(--font-body), Manrope, sans-serif",
                  fontSize: "0.5625rem",
                  color: "var(--color-espresso-muted)",
                  display: "block",
                  lineHeight: 1.2,
                }}
              >
                Monogram Active
              </span>
            </div>
          )}
        </div>

        {/* Controls Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", flex: 1, minWidth: "220px" }}>
          {/* File Picker Trigger */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", flexWrap: "wrap" }}>
            <input
              ref={fileInputRef}
              id="founder-portrait-file-input"
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              onChange={handleFileSelect}
              style={{ display: "none" }}
            />

            {!selectedFile ? (
              <>
                <label
                  htmlFor="founder-portrait-file-input"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.5625rem 1.125rem",
                    border: "1px solid var(--border)",
                    background: "var(--color-parchment)",
                    cursor: "pointer",
                    fontFamily: "var(--font-body), Manrope, sans-serif",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--color-espresso)",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path
                      d="M7 1v8M3 5l4-4 4 4M1 11h12"
                      stroke="currentColor"
                      strokeWidth="1.3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {imageUrl ? "Replace Portrait" : "Choose Image"}
                </label>

                {imageUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    style={{
                      padding: "0.5625rem 0.875rem",
                      background: "transparent",
                      border: "1px solid var(--border)",
                      fontFamily: "var(--font-body), Manrope, sans-serif",
                      fontSize: "0.75rem",
                      fontWeight: 500,
                      color: "var(--color-espresso-muted)",
                      cursor: "pointer",
                    }}
                  >
                    Remove Image
                  </button>
                )}
              </>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", width: "100%" }}>
                <div
                  style={{
                    fontFamily: "var(--font-body), Manrope, sans-serif",
                    fontSize: "0.8125rem",
                    color: "var(--color-espresso)",
                  }}
                >
                  <strong>Selected:</strong> {selectedFile.name}{" "}
                  <span style={{ color: "var(--color-espresso-muted)" }}>
                    ({(selectedFile.size / 1024).toFixed(0)} KB)
                  </span>
                </div>

                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <button
                    type="button"
                    onClick={handleUpload}
                    disabled={uploading}
                    style={{
                      padding: "0.5625rem 1.25rem",
                      background: uploading ? "var(--color-espresso-muted)" : "var(--color-espresso)",
                      color: "var(--color-ivory)",
                      border: "none",
                      fontFamily: "var(--font-body), Manrope, sans-serif",
                      fontSize: "0.6875rem",
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      cursor: uploading ? "not-allowed" : "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    {uploading ? (
                      <>
                        <span
                          style={{
                            display: "inline-block",
                            width: "12px",
                            height: "12px",
                            border: "2px solid rgba(255,255,255,0.3)",
                            borderTopColor: "#fff",
                            borderRadius: "50%",
                            animation: "spin 1s linear infinite",
                          }}
                        />
                        Uploading…
                      </>
                    ) : (
                      "Upload Portrait"
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleCancelSelection}
                    disabled={uploading}
                    style={{
                      padding: "0.5625rem 0.875rem",
                      background: "transparent",
                      border: "1px solid var(--border)",
                      fontFamily: "var(--font-body), Manrope, sans-serif",
                      fontSize: "0.6875rem",
                      fontWeight: 500,
                      color: "var(--color-espresso-muted)",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Inline Feedback Alerts */}
          {error && (
            <div
              role="alert"
              style={{
                fontFamily: "var(--font-body), Manrope, sans-serif",
                fontSize: "0.8125rem",
                color: "#b84c4c",
                background: "rgba(184, 76, 76, 0.08)",
                border: "1px solid rgba(184, 76, 76, 0.2)",
                padding: "0.5rem 0.75rem",
              }}
            >
              {error}
            </div>
          )}

          {successMsg && (
            <div
              role="status"
              style={{
                fontFamily: "var(--font-body), Manrope, sans-serif",
                fontSize: "0.8125rem",
                color: "var(--color-espresso)",
                background: "rgba(184, 154, 104, 0.12)",
                border: "1px solid rgba(184, 154, 104, 0.3)",
                padding: "0.5rem 0.75rem",
              }}
            >
              ✓ {successMsg}
            </div>
          )}

          {/* Manual URL View / Compatibility Toggle */}
          <div style={{ marginTop: "0.25rem" }}>
            <button
              type="button"
              onClick={() => setShowManualUrl(!showManualUrl)}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                fontFamily: "var(--font-body), Manrope, sans-serif",
                fontSize: "0.6875rem",
                color: "var(--color-espresso-muted)",
                textDecoration: "underline",
                cursor: "pointer",
              }}
            >
              {showManualUrl ? "▲ Hide manual image URL" : "▼ View or edit image URL manually"}
            </button>

            {showManualUrl && (
              <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <input
                  type="text"
                  value={imageUrl ?? ""}
                  onChange={(e) => onImageChange(e.target.value)}
                  placeholder="https://... or /images/brand/founder.jpg"
                  style={{
                    background: "var(--color-parchment)",
                    border: "1px solid var(--border)",
                    color: "var(--color-espresso)",
                    padding: "0.5rem 0.75rem",
                    fontFamily: "var(--font-body), Manrope, sans-serif",
                    fontSize: "0.75rem",
                    outline: "none",
                    width: "100%",
                  }}
                />
                <span
                  style={{
                    fontSize: "0.625rem",
                    color: "var(--color-espresso-muted)",
                    fontFamily: "var(--font-body), Manrope, sans-serif",
                  }}
                >
                  Raw CDN URL saved into site_content. Leave empty to use the architectural monogram.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
