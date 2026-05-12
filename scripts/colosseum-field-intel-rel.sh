#!/usr/bin/env bash
# Intel de campo vs Colosseum Copilot — Runtime REL / forensic (requiere PAT válido).
set -euo pipefail

BASE="${COLOSSEUM_COPILOT_API_BASE:-https://copilot.colosseum.com/api/v1}"

resolve_pat() {
  if [[ -n "${COLOSSEUM_PAT:-}" ]]; then printf '%s' "$COLOSSEUM_PAT"; return; fi
  if [[ -n "${COLOSSEUM_COPILOT_PAT:-}" ]]; then printf '%s' "$COLOSSEUM_COPILOT_PAT"; return; fi
  local f
  for f in "${HOME}/.colosseum_copilot_pat" "./.colosseum/pat" "./scripts/colosseum-pat.local"; do
    if [[ -f "$f" && -s "$f" ]]; then
      tr -d '\r\n' <"$f" | head -c 4096
      return
    fi
  done
  return 1
}

PAT="$(resolve_pat)" || PAT=""
if [[ -z "$PAT" ]]; then
  echo "ERROR: sin PAT. export COLOSSEUM_COPILOT_PAT=... o escribe el token en ~/.colosseum_copilot_pat (una sola línea)."
  exit 1
fi

HDR=(-H "Authorization: Bearer ${PAT}" -H "Content-Type: application/json")

echo "=== GET /status ==="
curl -sS "${HDR[@]}" "${BASE}/status"
echo -e "\n"

post() {
  local label="$1"
  local body="$2"
  echo "=== ${label} ==="
  curl -sS "${HDR[@]}" -X POST "${BASE}/search/projects" -d "$body"
  echo -e "\n"
  sleep 1
}

# Búsquedas semánticas (corpus completo)
post "Q1_runtime_enforcement" '{"query":"Runtime Enforcement Layer browser extension block signature before wallet","limit":12,"filters":{}}'
post "Q2_promise_interception" '{"query":"Promise interception wrap signTransaction signAllTransactions gate Solana wallet","limit":12,"filters":{}}'
post "Q3_forensic_hash_integrity" '{"query":"forensic hash SHA-256 integrity certificate signing intent evidence","limit":12,"filters":{}}'

# Misma triada, solo ganadores
post "Q1_winners_runtime" '{"query":"Runtime Enforcement Layer browser extension block signature before wallet","limit":12,"filters":{"winnersOnly":true}}'
post "Q2_winners_promise" '{"query":"Promise interception wrap signTransaction Solana","limit":12,"filters":{"winnersOnly":true}}'
post "Q3_winners_forensic" '{"query":"forensic hash integrity certificate wallet attack evidence","limit":12,"filters":{"winnersOnly":true}}'

# Misma triada, solo acelerados
post "Q1_accel_runtime" '{"query":"Runtime Enforcement Layer browser extension block signature before wallet","limit":12,"filters":{"acceleratorOnly":true}}'
post "Q2_accel_promise" '{"query":"Promise interception signTransaction Solana extension","limit":12,"filters":{"acceleratorOnly":true}}'
post "Q3_accel_forensic" '{"query":"forensic hash integrity report browser security","limit":12,"filters":{"acceleratorOnly":true}}'

echo "Listo. Si viste 401, rota el PAT en https://arena.colosseum.org/copilot y vuelve a escribir ~/.colosseum_copilot_pat."
