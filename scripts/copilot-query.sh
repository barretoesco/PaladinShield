#!/usr/bin/env bash
# Colosseum Copilot API — works in non-interactive shells (no reliance on full ~/.bashrc).
set -euo pipefail

BASE="${COLOSSEUM_COPILOT_API_BASE:-https://copilot.colosseum.com/api/v1}"

resolve_pat() {
  # 1) Manual export for this session (highest priority)
  if [[ -n "${COLOSSEUM_PAT:-}" ]]; then
    printf '%s' "$COLOSSEUM_PAT"
    return 0
  fi
  if [[ -n "${COLOSSEUM_COPILOT_PAT:-}" ]]; then
    printf '%s' "$COLOSSEUM_COPILOT_PAT"
    return 0
  fi
  # 2) Dedicated token file (recommended for agents / CI)
  local f
  for f in "${HOME}/.colosseum_copilot_pat" "${HOME}/.config/colosseum/copilot_pat" "./.colosseum/pat" "./scripts/colosseum-pat.local"; do
    if [[ -f "$f" && -s "$f" ]]; then
      tr -d '\r\n' <"$f" | head -c 4096
      return 0
    fi
  done
  # 3) Last resort: only Copilot lines from bashrc (may be stale)
  if [[ -f "${HOME}/.bashrc" ]]; then
    local line
    line=$(grep "^export COLOSSEUM_COPILOT_PAT=" "${HOME}/.bashrc" | grep -v TU_TOKEN | tail -1 || true)
    if [[ -n "$line" ]]; then
      line="${line#export COLOSSEUM_COPILOT_PAT=}"
      line="${line#\"}"
      line="${line%\"}"
      printf '%s' "$line"
      return 0
    fi
  fi
  return 1
}

PAT="$(resolve_pat)" || PAT=""
if [[ -z "$PAT" ]]; then
  echo "ERROR: No Colosseum PAT found."
  echo "Set COLOSSEUM_PAT or COLOSSEUM_COPILOT_PAT, or create one of:"
  echo "  ~/.colosseum_copilot_pat   (single line, paste PAT from https://arena.colosseum.org/copilot )"
  echo "  ./.colosseum/pat"
  echo "  ./scripts/colosseum-pat.local"
  exit 1
fi

HDR=(-H "Authorization: Bearer ${PAT}" -H "Content-Type: application/json")

http_get_status() {
  local url="$1"
  local code
  code=$(curl -sS -o /tmp/copilot_body.json -w "%{http_code}" "${HDR[@]}" "$url")
  printf '%s' "$code"
}

echo "=== GET /status ==="
CODE=$(http_get_status "${BASE}/status")
echo "HTTP=${CODE}"
cat /tmp/copilot_body.json
echo ""

if [[ "$CODE" != "200" ]]; then
  echo "Aborting searches (status not 200)."
  exit 1
fi

echo "=== POST /search/projects — PaladinShield-like (Solana extension wallet security) ==="
curl -sS "${HDR[@]}" -X POST "${BASE}/search/projects" -d '{
  "query": "PaladinShield Solana browser extension wallet signing security phishing deterministic",
  "limit": 10,
  "filters": {}
}' | tee /tmp/copilot_projects_paladinshield.json
echo ""

echo "=== POST /search/projects — Ayudantech ==="
curl -sS "${HDR[@]}" -X POST "${BASE}/search/projects" -d '{
  "query": "Ayudantech",
  "limit": 10,
  "filters": {}
}' | tee /tmp/copilot_projects_ayudantech.json
echo ""

echo "=== POST /search/archives (wallet / CSP / extensions) ==="
curl -sS "${HDR[@]}" -X POST "${BASE}/search/archives" -d '{
  "query": "browser extension wallet security phishing content security policy manifest",
  "limit": 5,
  "maxChunksPerDoc": 1
}' | tee /tmp/copilot_archives.json
echo ""

echo "Done. Raw JSON: /tmp/copilot_*.json"
