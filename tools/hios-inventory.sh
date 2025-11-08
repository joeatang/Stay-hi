#!/bin/bash
# File: tools/hios-inventory.sh
# HI-OS S-ARCH/5a — Repository Inventory (no deletions)
# Usage: bash tools/hios-inventory.sh
set -euo pipefail

# Locate repo root
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

OUT_DIR="HI_OS/reports"
OUT_MD="$OUT_DIR/REPO_INVENTORY.md"
TMP_DIR="$(mktemp -d)"

mkdir -p "$OUT_DIR"

# Helpers
list_with_meta () {
  local base="$1"
  local label="$2"
  if [ -d "$base" ]; then
    # path|bytes|md5
    find "$base" -type f ! -path '*/node_modules/*' | while read -r p; do
      b=$(wc -c < "$p")
      h=$( (command -v md5sum >/dev/null && md5sum "$p" | cut -d" " -f1) || (command -v md5 >/dev/null && md5 -q "$p") )
      printf "%s|%s|%s\n" "$p" "$b" "$h"
    done | sort > "$TMP_DIR/${label}.tsv"
  else
    : > "$TMP_DIR/${label}.tsv"
  fi
}

# Collect sets
list_with_meta "public"               "public_all"
list_with_meta "public/lib"           "public_lib"
list_with_meta "lib"                  "root_lib"          # legacy risk area
list_with_meta "."                    "repo_all"

# Derive filename maps (basename)
cut -d'|' -f1 "$TMP_DIR/public_lib.tsv" | while read -r p; do basename "$p"; done | sort > "$TMP_DIR/public_lib_names.txt" || true
cut -d'|' -f1 "$TMP_DIR/root_lib.tsv" | while read -r p; do basename "$p"; done | sort > "$TMP_DIR/root_lib_names.txt" || true

# Duplicate filename matches between root/lib and public/lib
comm -12 "$TMP_DIR/public_lib_names.txt" "$TMP_DIR/root_lib_names.txt" > "$TMP_DIR/dup_names.txt" || true

# Build identical-hash matches for same filename in both trees
# format: filename|public_path|root_path|hash
: > "$TMP_DIR/dup_identical.tsv"
while IFS= read -r NAME; do
  grep "/$NAME|" "$TMP_DIR/public_lib.tsv" > "$TMP_DIR/pub_hit.tsv" || true
  grep "/$NAME|" "$TMP_DIR/root_lib.tsv"   > "$TMP_DIR/root_hit.tsv" || true
  while IFS='|' read -r ppath pbytes phash; do
    while IFS='|' read -r rpath rbytes rhash; do
      if [ "$phash" = "$rhash" ]; then
        printf "%s|%s|%s|%s\n" "$NAME" "$ppath" "$rpath" "$phash" >> "$TMP_DIR/dup_identical.tsv"
      fi
    done < "$TMP_DIR/root_hit.tsv"
  done < "$TMP_DIR/pub_hit.tsv"
done < "$TMP_DIR/dup_names.txt"

# Totals
count_files () { [ -s "$1" ] && wc -l < "$1" || echo 0; }

TOTAL_PUBLIC_HTML=$(grep -E '\.html\|' "$TMP_DIR/public_all.tsv" | wc -l | tr -d ' ')
TOTAL_PUBLIC_LIB=$(count_files "$TMP_DIR/public_lib.tsv")
TOTAL_ROOT_LIB=$(count_files "$TMP_DIR/root_lib.tsv")
TOTAL_DUP_NAMES=$(count_files "$TMP_DIR/dup_names.txt")
TOTAL_DUP_IDENTICAL=$(count_files "$TMP_DIR/dup_identical.tsv")

# Render Markdown
{
  echo "# HI-OS S-ARCH/5a — Repository Inventory (Read-only)"
  echo
  echo "**Generated:** $(date -u +"%Y-%m-%d %H:%M:%SZ")  |  **Repo root:** \`$REPO_ROOT\`"
  echo
  echo "## Summary"
  echo "- Public HTML pages: **$TOTAL_PUBLIC_HTML**"
  echo "- Public libs (public/lib): **$TOTAL_PUBLIC_LIB**"
  echo "- Root libs (legacy risk): **$TOTAL_ROOT_LIB**"
  echo "- Duplicate filenames (root/lib vs public/lib): **$TOTAL_DUP_NAMES**"
  echo "- Identical files by hash (safe to retire at root): **$TOTAL_DUP_IDENTICAL**"
  echo
  echo "## Active Pages (public/*.html)"
  echo ""
  grep -E '\.html\|' "$TMP_DIR/public_all.tsv" \
    | awk -F'|' '{printf "- `%s`  (%s bytes)\n",$1,$2}'
  echo
  echo "## Active Libraries (public/lib/**)"
  echo ""
  awk -F'|' '{printf "- `%s`  (%s bytes)\n",$1,$2}' "$TMP_DIR/public_lib.tsv"
  echo
  echo "## Legacy/Do-Not-Use (repo-root lib/**)"
  echo ""
  if [ "$TOTAL_ROOT_LIB" -gt 0 ]; then
    awk -F'|' '{printf "- `%s`  (%s bytes)\n",$1,$2}' "$TMP_DIR/root_lib.tsv"
  else
    echo "- _(none found)_"
  fi
  echo
  echo "## Duplicate Filenames (root/lib ↔ public/lib)"
  echo ""
  if [ "$TOTAL_DUP_NAMES" -gt 0 ]; then
    awk '{printf "- %s\n",$0}' "$TMP_DIR/dup_names.txt"
  else
    echo "- _(none)_"
  fi
  echo
  echo "## Identical by Hash (safe retirement candidates at root/lib)"
  echo ""
  if [ "$TOTAL_DUP_IDENTICAL" -gt 0 ]; then
    echo "| filename | public path | root path | md5 |"
    echo "|---|---|---|---|"
    awk -F'|' '{printf "| %s | %s | %s | %s |\n",$1,$2,$3,$4}' "$TMP_DIR/dup_identical.tsv"
  else
    echo "- _(none)_"
  fi
  echo
  echo "## Notes"
  echo "- This report is **read-only** evidence. No files were altered."
  echo "- S-ARCH/5b will propose specific deletions **behind a PR** once Senior approves."
} > "$OUT_MD"

echo "[HI-OS][S-ARCH/5a] Inventory written to ${OUT_MD}"

# Clean temp
rm -rf "$TMP_DIR"