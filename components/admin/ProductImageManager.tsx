"use client";

/**
 * VEER ELEGANCE — ProductImageManager
 *
 * Client component rendered inside the product edit/create form.
 * Handles:
 *  - File picking + client-side preview
 *  - Upload via server action
 *  - Gallery display (existing images)
 *  - Set primary image
 *  - Delete image
 *
 * For NEW products, the parent page must create the product first,
 * then redirect to edit — so productId is always a real UUID here.
 */

import {
  useRef, useState, useTransition, useOptimistic,
} from "react";
import type { ProductImage }  from "@/lib/product-images";
import {
  uploadImageAction,
  setPrimaryImageAction,
  deleteImageAction,
  type ImageActionState,
} from "@/app/admin/products/image-actions";

// ─────────────────────────────────────────────────────────────────────────────

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_MB        = 5;

interface ProductImageManagerProps {
  productId: string;
  images:    ProductImage[];
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ProductImageManager({ productId, images: serverImages }: ProductImageManagerProps) {
  const fileRef      = useRef<HTMLInputElement>(null);
  const [preview,   setPreview]   = useState<string | null>(null);
  const [file,      setFile]      = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  // Optimistic: track which image IDs are being deleted to hide them instantly
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [localImages, setLocalImages] = useState<ProductImage[]>(serverImages);

  // Keep localImages in sync if server re-renders with new images
  // (React will remount on server revalidation)

  // ── File selection ──────────────────────────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setError(null);
    setUploadMsg(null);

    // Client-side validation
    if (!ALLOWED_TYPES.includes(f.type)) {
      setError(`Unsupported type "${f.type}". Use JPG, PNG, or WEBP.`);
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`File too large (${(f.size / 1024 / 1024).toFixed(1)} MB). Max ${MAX_MB} MB.`);
      return;
    }

    setFile(f);
    const reader = new FileReader();
    reader.onload = ev => setPreview(ev.target?.result as string);
    reader.readAsDataURL(f);
  }

  // ── Upload ──────────────────────────────────────────────────────────────────
  async function handleUpload() {
    if (!file) return;
    setError(null);
    setUploadMsg(null);
    setUploading(true);

    const fd = new FormData();
    fd.append("image", file);

    try {
      const result: ImageActionState = await uploadImageAction(productId, {}, fd);
      if (!result.success) {
        setError(result.error ?? "Upload failed.");
      } else {
        setUploadMsg("Image uploaded successfully.");
        setFile(null);
        setPreview(null);
        if (fileRef.current) fileRef.current.value = "";
        // Server revalidation will refresh the page / localImages
      }
    } catch {
      setError("Unexpected error. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  // ── Set primary ─────────────────────────────────────────────────────────────
  function handleSetPrimary(imageId: string) {
    setError(null);
    startTransition(async () => {
      const result = await setPrimaryImageAction(productId, imageId);
      if (!result.success) setError(result.error ?? "Failed to set primary.");
    });
  }

  // ── Delete ──────────────────────────────────────────────────────────────────
  function handleDelete(imageId: string) {
    if (!confirm("Remove this image? This cannot be undone.")) return;
    setError(null);
    setDeletingIds(prev => new Set([...prev, imageId]));

    startTransition(async () => {
      const result = await deleteImageAction(productId, imageId);
      if (!result.success) {
        setError(result.error ?? "Failed to delete image.");
        setDeletingIds(prev => { const n = new Set(prev); n.delete(imageId); return n; });
      }
    });
  }

  const visibleImages = localImages.filter(i => !deletingIds.has(i.id));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* ── Existing gallery ─────────────────────────────────────────── */}
      {visibleImages.length > 0 ? (
        <div>
          <p style={eyebrow}>Product Images</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.875rem" }}>
            {visibleImages.map((img, idx) => (
              <ImageCard
                key={img.id}
                img={img}
                isPrimary={img.sort_order === 0}
                isFirst={idx === 0}
                onSetPrimary={() => handleSetPrimary(img.id)}
                onDelete={() => handleDelete(img.id)}
                actionPending={isPending}
              />
            ))}
          </div>
        </div>
      ) : (
        <div style={{ border: "1px dashed var(--border)", padding: "2rem", textAlign: "center" }}>
          <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.8125rem", color: "var(--color-espresso-muted)", margin: 0, fontStyle: "italic" }}>
            No images yet. Upload the first image below.
          </p>
        </div>
      )}

      {/* ── Upload area ──────────────────────────────────────────────── */}
      <div>
        <p style={eyebrow}>Add Image</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>

          {/* File picker */}
          <label htmlFor={`img-upload-${productId}`}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.625rem 1.25rem", border: "1px solid var(--border)", background: "var(--color-parchment)", cursor: "pointer", fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-espresso)", width: "fit-content" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M7 1v8M3 5l4-4 4 4M1 11h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Choose File
          </label>
          <input
            ref={fileRef}
            id={`img-upload-${productId}`}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            style={{ display: "none" }}
            aria-label="Select product image to upload"
          />

          {/* Preview */}
          {preview && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
              <div style={{ width: "100px", height: "100px", border: "1px solid var(--border)", overflow: "hidden", flexShrink: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.8125rem", color: "var(--color-espresso)", margin: 0 }}>
                  {file?.name} &nbsp;·&nbsp;
                  <span style={{ color: "var(--color-espresso-muted)" }}>{(file!.size / 1024).toFixed(0)} KB</span>
                </p>
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={uploading}
                  style={{
                    padding: "0.5rem 1.25rem", background: uploading ? "var(--color-espresso-muted)" : "var(--color-espresso)",
                    color: "var(--color-ivory)", border: "none", fontFamily: "var(--font-body), Manrope, sans-serif",
                    fontSize: "0.625rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
                    cursor: uploading ? "not-allowed" : "pointer", width: "fit-content",
                  }}
                  aria-label="Upload selected image"
                >
                  {uploading ? "Uploading…" : "Upload Image"}
                </button>
              </div>
            </div>
          )}

          {/* File hint */}
          {!preview && (
            <p style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.6875rem", color: "var(--color-espresso-muted)", margin: 0 }}>
              JPG · PNG · WEBP · Max 5 MB
            </p>
          )}

          {/* Error */}
          {error && (
            <p role="alert" style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.8125rem", color: "#b84c4c", margin: 0 }}>
              {error}
            </p>
          )}

          {/* Success */}
          {uploadMsg && (
            <p role="status" style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.8125rem", color: "var(--color-espresso)", margin: 0 }}>
              ✓ {uploadMsg}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ImageCard ─────────────────────────────────────────────────────────────────

function ImageCard({
  img, isPrimary, onSetPrimary, onDelete, actionPending,
}: {
  img:           ProductImage;
  isPrimary:     boolean;
  isFirst:       boolean;
  onSetPrimary:  () => void;
  onDelete:      () => void;
  actionPending: boolean;
}) {
  return (
    <div style={{ position: "relative", width: "120px" }}>
      <div style={{ width: "120px", height: "120px", border: isPrimary ? "2px solid var(--color-espresso)" : "1px solid var(--border)", overflow: "hidden", background: "var(--color-parchment)" }}>
        {img.public_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img.public_url}
            alt="Product image"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            loading="lazy"
          />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.625rem", color: "var(--color-espresso-muted)" }}>No URL</span>
          </div>
        )}
      </div>

      {/* Primary badge */}
      {isPrimary && (
        <span style={{ position: "absolute", top: "4px", left: "4px", fontFamily: "var(--font-body), Manrope, sans-serif", fontSize: "0.5rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", background: "var(--color-espresso)", color: "var(--color-ivory)", padding: "0.15rem 0.375rem" }}>
          Primary
        </span>
      )}

      {/* Action buttons */}
      <div style={{ display: "flex", gap: "0.375rem", marginTop: "0.375rem" }}>
        {!isPrimary && (
          <button
            type="button"
            onClick={onSetPrimary}
            disabled={actionPending}
            style={actionBtn}
            title="Set as primary image"
            aria-label="Set as primary image"
          >
            ★
          </button>
        )}
        <button
          type="button"
          onClick={onDelete}
          disabled={actionPending}
          style={{ ...actionBtn, color: "#b84c4c" }}
          title="Remove image"
          aria-label="Remove this image"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const eyebrow: React.CSSProperties = {
  fontFamily:    "var(--font-body), Manrope, sans-serif",
  fontSize:      "0.5625rem",
  fontWeight:    700,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color:         "var(--color-espresso-muted)",
  marginBottom:  "0.625rem",
};

const actionBtn: React.CSSProperties = {
  flex:          1,
  padding:       "0.25rem",
  background:    "var(--color-parchment)",
  border:        "1px solid var(--border)",
  fontFamily:    "var(--font-body), Manrope, sans-serif",
  fontSize:      "0.75rem",
  color:         "var(--color-espresso)",
  cursor:        "pointer",
  textAlign:     "center",
};
