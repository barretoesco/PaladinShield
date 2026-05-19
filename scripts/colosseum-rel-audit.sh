#!/usr/bin/env bash
# Colosseum Copilot — REL / roadmap / security layer corpus audit
set -euo pipefail
BASE="${COLOSSEUM_COPILOT_API_BASE:-https://copilot.colosseum.com/api/v1}"

resolve_pat() {
  if [[ -n "${COLOSSEUM_PAT:-}" ]]; then printf '%s' "$COLOSSEUM_PAT"; return; fi
  if [[ -n "${COLOSSEUM_COPILOT_PAT:-}" ]]; then printf '%s' "$COLOSSEUM_COPILOT_PAT"; return; fi
  if [[ -f "${HOME}/.colosseum_copilot_pat" ]]; then tr -d '\r\n' <"${HOME}/.colosseum_copilot_pat" | head -c 4096; return; fi
  if [[ -f "./.colosseum/pat" ]]; then tr -d '\r\n' <"./.colosseum/pat" | head -c 4096; return; fi
  exit 1
}

PAT="$(resolve_pat)"
HDR=(-H "Authorization: Bearer ${PAT}" -H "Content-Type: application/json")

echo "=== GET /status ==="
curl -sS "${HDR[@]}" "${BASE}/status"
echo ""
echo ""

runq() {
  local name="$1"
  local body="$2"
  echo "=== ${name} ==="
  curl -sS "${HDR[@]}" -X POST "${BASE}/search/projects" -d "$body"
  echo ""
  sleep 1
}

runq "B1_RPC_firewall_roadmap" '{"query":"Solana RPC firewall node filtering malicious transactions roadmap network security layer","limit":12,"filters":{}}'
runq "B2_hardware_wallet_enforcement" '{"query":"hardware wallet enforcement Ledger Solana security policy Trezor","limit":12,"filters":{}}'
runq "B3_MWA_mobile_wallet_adapter" '{"query":"Mobile Wallet Adapter MWA security Solana mobile dApp phishing","limit":12,"filters":{}}'
runq "C_security_layer_real_enforcement" '{"query":"security layer enforcement block signing Solana extension not just alerts","limit":12,"filters":{}}'
