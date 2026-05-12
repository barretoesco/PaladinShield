#!/usr/bin/env bash
# Colosseum Copilot ONLY — reviews para posicionamiento PaladinShield (ejecutar desde WSL).
set -euo pipefail
BASE="${COLOSSEUM_COPILOT_API_BASE:-https://copilot.colosseum.com/api/v1}"
if [[ ! -f "${HOME}/.colosseum_copilot_pat" ]] || [[ ! -s "${HOME}/.colosseum_copilot_pat" ]]; then
  echo "ERROR: Falta ~/.colosseum_copilot_pat (no existe o vacio). Ejecuta desde WSL con el PAT vigente."
  exit 3
fi
PAT="$(tr -d '\r\n' < "${HOME}/.colosseum_copilot_pat" | head -c 4096)"
if [[ -z "$PAT" ]]; then echo "ERROR: PAT vacio tras leer el archivo"; exit 3; fi
HDR=(-H "Authorization: Bearer ${PAT}" -H "Content-Type: application/json")

echo "=== GET /status ==="
curl -sS "${HDR[@]}" "${BASE}/status"
echo ""

post() {
  local label="$1"
  local body="$2"
  echo "=== ${label} ==="
  curl -sS "${HDR[@]}" -X POST "${BASE}/search/projects" -d "${body}"
  echo ""
  sleep 2
}

post "SEARCH_PaladinShield" '{"query":"PaladinShield","limit":12,"filters":{}}'
post "SEARCH_ClearSign_AI" '{"query":"ClearSign AI solana wallet extension","limit":12,"filters":{}}'
post "SEARCH_REL_promise_gate" '{"query":"browser extension intercept signTransaction promise gate default deny Solana","limit":12,"filters":{}}'
post "SEARCH_winners_similar" '{"query":"solana browser extension simulation block drainer phishing","limit":12,"filters":{"winnersOnly":true}}'
echo "=== DONE (solo Copilot) ==="
