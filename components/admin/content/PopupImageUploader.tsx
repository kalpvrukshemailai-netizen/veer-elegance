"use client";

/**
 * VEER ELEGANCE — Popup Advertisement Image Uploader Component
 *
 * Dedicated admin component for uploading, previewing, and managing
 * the homepage promotional popup ad image with server-side Supabase Storage integration.
 */

import React, { useRef, useState } from "react";
import { uploadPopupImageAction, deletePopupImageAction } from "@/app/admin/content/actions";
import { Upload, Trash2, Eye, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_MB = 5;

interface PopupImageUploaderProps {
  imageUrl: string;
  onImageChange: (newUrl: string) => void;
}

export default function PopupImageUploader({
  imageUrl,
  onImageChange,
}: PopupImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
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
      const res = await uploadPopupImageAction({}, formData);

      if (!res.success || !res.publicUrl) {
        setError(res.error || "Failed to upload image. Please try again.");
      } else {
        // If an old storage image was in place, clean it up
        if (imageUrl && imageUrl !== res.publicUrl) {
          deletePopupImageAction(imageUrl).catch(() => {});
        }

        onImageChange(res.publicUrl);
        setSuccessMsg("Advertisement image uploaded successfully. Click \"Save Changes\" below to publish.");
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

  // ── Handle removal ──────────────────────────────────────────────────────────
  async function handleRemove() {
    const confirmed = window.confirm(
      "Are you sure you want to remove the current popup advertisement image?",
    );
    if (!confirmed) return;

    setError(null);
    setSuccessMsg(null);
    setDeleting(true);

    try {
      if (imageUrl) {
        await deletePopupImageAction(imageUrl);
      }
      onImageChange("");
      setSelectedFile(null);
      setLocalPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setSuccessMsg("Advertisement image removed.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to remove image.";
      setError(msg);
    } finally {
      setDeleting(false);
    }
  }

  const activeDisplayUrl = localPreview || imageUrl;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
        padding: "1.5rem",
        background: "var(--color-ivory)",
        border: "1px solid var(--border)",
      }}
    >
      <div>
        <h4
          style={{
            fontFamily: "var(--font-display), 'Cormorant Garamond', serif",
            fontSize: "1.125rem",
            color: "var(--color-espresso)",
            margin: "0 0 0.375rem",
          }}
        >
          Popup Advertisement Creative
        </h4>
        <p
          style={{
            fontFamily: "var(--font-body), Manrope, sans-serif",
            fontSize: "0.8125rem",
            color: "var(--color-espresso-muted)",
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          Upload a high-resolution promotional banner or flyer (recommended: 800×1000px portrait or 800×800px square).
          Max 5MB (JPG, PNG, WEBP).
        </p>
      </div>

      {/* ── Visual Preview Area ────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", alignItems: "flex-start" }}>
        {/* Preview Frame */}
        <div
          style={{
            width: "200px",
            aspectRatio: "4/5",
            background: "var(--color-parchment-deep)",
            border: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            position: "relative",
            flexShrink: 0,
          }}
        >
          {activeDisplayUrl ? (
            <img
              src={activeDisplayUrl}
              alt="Popup ad preview"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div style={{ textAlign: "center", padding: "1rem", color: "var(--color-espresso-muted)" }}>
              <Eye size={28} style={{ opacity: 0.4, marginBottom: "0.5rem" }} />
              <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.6875rem", margin: 0 }}>
                No image uploaded
              </p>
            </div>
          )}

          {localPreview && (
            <div
              style={{
                position: "absolute",
                top: "0.5rem",
                left: "0.5rem",
                background: "rgba(184, 154, 104, 0.92)",
                color: "#fff",
                fontSize: "0.5625rem",
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                padding: "0.2rem 0.4rem",
              }}
            >
              Unsaved Preview
            </div>
          )}
        </div>

        {/* Controls Column */}
        <div style={{ flex: 1, minWidth: "240px", display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* File Input button */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              onChange={handleFileSelect}
              style={{ display: "none" }}
              id="popup-ad-file-input"
            />
            <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || deleting}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.625rem 1rem",
                  background: "var(--color-espresso)",
                  color: "var(--color-ivory)",
                  border: "none",
                  fontFamily: "var(--font-body), Manrope, sans-serif",
                  fontSize: "0.6875rem",
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  cursor: uploading || deleting ? "not-allowed" : "pointer",
                }}
              >
                <Upload size={14} />
                {imageUrl ? "Replace Image…" : "Select Image…"}
              </button>

              {imageUrl && (
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={uploading || deleting}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.625rem 1rem",
                    background: "transparent",
                    color: "#b84c4c",
                    border: "1px solid #b84c4c",
                    fontFamily: "var(--font-body), Manrope, sans-serif",
                    fontSize: "0.6875rem",
                    fontWeight: 600,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    cursor: uploading || deleting ? "not-allowed" : "pointer",
                  }}
                >
                  <Trash2 size={14} />
                  {deleting ? "Removing…" : "Remove"}
                </button>
              )}
            </div>

            {selectedFile && (
              <p
                style={{
                  fontFamily: "var(--font-body), Manrope, sans-serif",
                  fontSize: "0.75rem",
                  color: "var(--color-espresso-muted)",
                  margin: "0.5rem 0 0",
                }}
              >
                Selected: <strong>{selectedFile.name}</strong> ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          {/* Upload Button (shown after file selected) */}
          {selectedFile && (
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <button
                type="button"
                onClick={handleUpload}
                disabled={uploading}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.625rem 1.25rem",
                  background: "var(--color-gold-muted)",
                  color: "#fff",
                  border: "none",
                  fontFamily: "var(--font-body), Manrope, sans-serif",
                  fontSize: "0.6875rem",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  cursor: uploading ? "not-allowed" : "pointer",
                }}
              >
                <RefreshCw size={14} className={uploading ? "animate-spin" : ""} />
                {uploading ? "Uploading to Storage…" : "Upload & Apply"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  setLocalPreview(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                disabled={uploading}
                style={{
                  padding: "0.625rem 0.875rem",
                  background: "transparent",
                  color: "var(--color-espresso-muted)",
                  border: "1px solid var(--border)",
                  fontFamily: "var(--font-body), Manrope, sans-serif",
                  fontSize: "0.6875rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          )}

          {/* Manual URL toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowManualUrl(!showManualUrl)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--color-gold-muted)",
                fontFamily: "var(--font-body), Manrope, sans-serif",
                fontSize: "0.75rem",
                textDecoration: "underline",
                cursor: "pointer",
                padding: 0,
              }}
            >
              {showManualUrl ? "Hide manual URL input" : "Or enter image URL directly"}
            </button>
            {showManualUrl && (
              <div style={{ marginTop: "0.5rem" }}>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => onImageChange(e.target.value)}
                  placeholder="https://... or /images/..."
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    background: "var(--color-parchment)",
                    border: "1px solid var(--border)",
                    fontFamily: "var(--font-body), Manrope, sans-serif",
                    fontSize: "0.8125rem",
                    color: "var(--color-espresso)",
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Status Messages ────────────────────────────────────────────── */}
      {error && (
        <div
          role="alert"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.75rem 1rem",
            background: "rgba(184, 76, 76, 0.08)",
            border: "1px solid #b84c4c",
            color: "#b84c4c",
            fontFamily: "var(--font-body), Manrope, sans-serif",
            fontSize: "0.8125rem",
          }}
        >
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div
          role="status"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.75rem 1rem",
            background: "rgba(74, 124, 89, 0.08)",
            border: "1px solid #4a7c59",
            color: "#3a5e44",
            fontFamily: "var(--font-body), Manrope, sans-serif",
            fontSize: "0.8125rem",
          }}
        >
          <CheckCircle size={16} style={{ flexShrink: 0 }} />
          <span>{successMsg}</span>
        </div>
      )}
    </div>
  );
}
