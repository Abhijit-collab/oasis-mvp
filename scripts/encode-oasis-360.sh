#!/usr/bin/env bash
# Stitch Oasis T1-T7 into one scrubbable 360 orbit MP4 (full quality + dense keyframes).
# Usage: ./scripts/encode-oasis-360.sh [source_dir] [output.mp4]
#
# Upload: aws s3 cp oasis-360.mp4 s3://oasis-metro/360-videos/oasis-360.mp4

set -euo pipefail

SOURCE_DIR="${1:-.}"
OUTPUT="${2:-oasis-360.mp4}"
CRF="${CRF:-18}"
GOP="${GOP:-6}"

if [[ "${ALL_INTRA:-0}" == "1" ]]; then
  GOP=1
fi

LIST="$SOURCE_DIR/oasis-360-list.txt"
cat > "$LIST" <<EOF
file '$SOURCE_DIR/AdoptXRWeb_Transistion1.mp4'
file '$SOURCE_DIR/AdoptXRWeb_Transistion2.mp4'
file '$SOURCE_DIR/AdoptXRWeb_Transistion3.mp4'
file '$SOURCE_DIR/AdoptXRWeb_Transistion4.mp4'
file '$SOURCE_DIR/AdoptXRWeb_Transistion5.mp4'
file '$SOURCE_DIR/AdoptXRWeb_Transistion6.mp4'
file '$SOURCE_DIR/AdoptXRWeb_Transistion7.mp4'
EOF

echo "Encoding $OUTPUT (CRF $CRF, GOP $GOP)..."

ffmpeg -y -f concat -safe 0 -i "$LIST" \
  -c:v libx264 -pix_fmt yuv420p \
  -crf "$CRF" \
  -g "$GOP" -keyint_min "$GOP" \
  -x264-params scenecut=0 \
  -movflags +faststart -an \
  "$OUTPUT"

echo "Done: $OUTPUT"
echo "Upload: aws s3 cp $OUTPUT s3://oasis-metro/360-videos/oasis-360.mp4"
