#!/usr/bin/env bash
# Mirror media (SPEC.md §5) and the /nmo/ orientation mini-site (SPEC.md §9) from the live
# WordPress site into public/. Run this from a machine that can reach https://idssochi.org.
#
#   npm run mirror            # media + /nmo/
#   npm run mirror -- media   # media only
#   npm run mirror -- nmo     # /nmo/ only
#
# Media is downloaded as the ORIGINAL file into public/uploads/<year>/<month>/ (WordPress paths
# preserved). Favicon sizes are then generated with `npm run icons`.
set -euo pipefail

ORIGIN="${IDSSO_ORIGIN:-https://idssochi.org}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PUBLIC="$ROOT/public"
WHAT="${1:-all}"

MEDIA=(
  2025/12/cropped-IDSSO-Logo.png
  2025/12/IDSSO-Logo.png
  2025/12/cropped-Icon.png
  2025/12/cropped-Icon-32x32.png
  2025/12/cropped-Icon-192x192.png
  2025/12/cropped-Icon-180x180.png
  2025/12/UIC_Campus-scaled.jpg
  2025/12/IDSSO-Logo-1125Revised-2-edited.png
  2026/01/IDSSO-Bowling-edited.jpg
  2026/01/IMG_6783-1.jpg
  2026/04/DSCF2204-1-scaled.jpeg
  2025/12/IMG_50221-1024x1019-3.jpg
  2026/01/IMG_8307.jpg
  2025/12/thumbnail_Headshot1-edited.jpg
  2025/12/IMG_6769.gif
  2026/04/Charlotte-Tran.png
  2026/04/1742164843646.jpg
  2026/04/1706579831174.jpg
  2026/02/Generated-image-1.png
  2025/12/IDSSO-Constitution-December-15-Final-Formatted-Version.pdf
)

mirror_media() {
  echo "==> Mirroring media from $ORIGIN/wp-content/uploads/ into public/uploads/"
  local failed=0
  for rel in "${MEDIA[@]}"; do
    local dest="$PUBLIC/uploads/$rel"
    mkdir -p "$(dirname "$dest")"
    if curl -fsSL --retry 3 -o "$dest" "$ORIGIN/wp-content/uploads/$rel"; then
      printf '  ok   %s\n' "$rel"
    else
      printf '  FAIL %s\n' "$rel"
      failed=$((failed + 1))
      rm -f "$dest"
    fi
  done
  if [ "$failed" -gt 0 ]; then
    echo "!! $failed file(s) failed to download. The -32x32/-192x192/-180x180 icon variants can be regenerated with: npm run icons"
  fi
}

mirror_nmo() {
  echo "==> Mirroring $ORIGIN/nmo/ into public/nmo/ (verbatim; filenames with spaces preserved)"
  command -v wget >/dev/null || { echo "wget is required for the /nmo/ mirror"; exit 1; }
  local tmp
  tmp="$(mktemp -d)"
  (
    cd "$tmp"
    wget --mirror --no-parent --page-requisites --adjust-extension --convert-links=off \
         --restrict-file-names=nocontrol --no-host-directories --cut-dirs=0 \
         -e robots=off --quiet --show-progress "$ORIGIN/nmo/"
  )
  rm -rf "$PUBLIC/nmo"
  mkdir -p "$PUBLIC/nmo"
  cp -R "$tmp/nmo/." "$PUBLIC/nmo/"
  rm -rf "$tmp"
  # The only permitted edit (SPEC.md §9): make the absolute constitution link relative.
  grep -rl "https://idssochi.org/constitution/" "$PUBLIC/nmo" 2>/dev/null | while read -r f; do
    sed -i.bak 's#https://idssochi.org/constitution/#/constitution/#g' "$f" && rm -f "$f.bak"
  done
  echo "==> Verifying the 8 /nmo/ pages exist locally"
  for p in "" our-team about-idsso conduct-and-standards membership-benefits leadership-and-involvement our-constitution getting-started; do
    if [ -f "$PUBLIC/nmo/$p/index.html" ] || { [ -z "$p" ] && [ -f "$PUBLIC/nmo/index.html" ]; }; then
      printf '  ok   /nmo/%s\n' "${p:+$p/}"
    else
      printf '  MISSING /nmo/%s\n' "${p:+$p/}"
    fi
  done
}

case "$WHAT" in
  media) mirror_media ;;
  nmo)   mirror_nmo ;;
  all)   mirror_media; mirror_nmo ;;
  *) echo "usage: $0 [all|media|nmo]"; exit 2 ;;
esac

echo "==> Done. Next: npm run icons && npm run build && npm run links"
