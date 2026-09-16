#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# VEER ELEGANCE — Video Compression Script
# Compresses all category/hero videos for fast web delivery.
# Target: H.264 video, AAC audio, CRF 28, 720p max, fast start (moov atom).
# Run: bash scripts/compress-videos.sh
# ─────────────────────────────────────────────────────────────────────────────

INPUT_DIR="public/videos/products"
OUTPUT_DIR="public/videos/products"
BACKUP_DIR="public/videos/products/originals"

mkdir -p "$BACKUP_DIR"

VIDEOS=(
  "chain-rain.mp4"
  "ring-waterfall.mp4"
  "earrings-rain.mp4"
  "bracelet-ocean.mp4"
  "halo.mp4"
  "unknown.mp4"
  "rebel.mp4"
)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  VEER ELEGANCE — Video Compression"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

TOTAL_BEFORE=0
TOTAL_AFTER=0

for VIDEO in "${VIDEOS[@]}"; do
  INPUT="$INPUT_DIR/$VIDEO"
  TEMP="$INPUT_DIR/compressed_$VIDEO"
  BACKUP="$BACKUP_DIR/original_$VIDEO"

  if [ ! -f "$INPUT" ]; then
    echo "⚠️  Skipping $VIDEO — file not found"
    continue
  fi

  BEFORE=$(stat -f%z "$INPUT" 2>/dev/null || stat -c%s "$INPUT")
  TOTAL_BEFORE=$((TOTAL_BEFORE + BEFORE))
  BEFORE_MB=$(echo "scale=2; $BEFORE / 1048576" | bc)

  echo "🎬 Processing: $VIDEO ($BEFORE_MB MB)"

  ffmpeg -i "$INPUT" \
    -vf "scale='min(1280,iw)':-2" \
    -c:v libx264 \
    -crf 28 \
    -preset fast \
    -profile:v baseline \
    -level 3.1 \
    -movflags +faststart \
    -an \
    -y "$TEMP" 2>/dev/null

  if [ $? -eq 0 ]; then
    # Backup original
    cp "$INPUT" "$BACKUP"
    # Replace original with compressed
    mv "$TEMP" "$INPUT"

    AFTER=$(stat -f%z "$INPUT" 2>/dev/null || stat -c%s "$INPUT")
    TOTAL_AFTER=$((TOTAL_AFTER + AFTER))
    AFTER_MB=$(echo "scale=2; $AFTER / 1048576" | bc)
    SAVING=$(echo "scale=0; (1 - $AFTER / $BEFORE) * 100" | bc)

    echo "   ✅ Done: $BEFORE_MB MB → $AFTER_MB MB (saved ~$SAVING%)"
  else
    echo "   ❌ Failed to compress $VIDEO"
    rm -f "$TEMP"
  fi

  echo ""
done

TOTAL_BEFORE_MB=$(echo "scale=2; $TOTAL_BEFORE / 1048576" | bc)
TOTAL_AFTER_MB=$(echo "scale=2; $TOTAL_AFTER / 1048576" | bc)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  TOTAL: $TOTAL_BEFORE_MB MB → $TOTAL_AFTER_MB MB"
echo "  Originals saved to: $BACKUP_DIR"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
