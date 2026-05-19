#!/usr/bin/env bash
set -euo pipefail
BASE="https://copilot.colosseum.com/api/v1"
PAT="$(tr -d '\r\n' < "${HOME}/.colosseum_copilot_pat" | head -c 4096)"
HDR=(-H "Authorization: Bearer ${PAT}")
echo "=== forenai ==="
curl -sS "${HDR[@]}" "${BASE}/projects/by-slug/forenai" | head -c 3500
echo ""
echo "=== csds ==="
curl -sS "${HDR[@]}" "${BASE}/projects/by-slug/csds" | head -c 3500
echo ""
