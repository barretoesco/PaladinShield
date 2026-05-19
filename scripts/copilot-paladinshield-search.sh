#!/usr/bin/env bash
# Targeted Colosseum Copilot search/projects for PaladinShield positioning.
set -euo pipefail
BASE="${COLOSSEUM_API_BASE:-https://copilot.colosseum.com/api/v1}"

resolve_pat() {
  if [[ -n "${COLOSSEUM_PAT:-}" ]]; then echo "$COLOSSEUM_PAT"; return; fi
  if [[ -n "${COLOSSEUM_COPILOT_PAT:-}" ]]; then echo "$COLOSSEUM_COPILOT_PAT"; return; fi
  for f in "$HOME/.colosseum_copilot_pat" ".colosseum/pat" "scripts/colosseum-pat.local"; do
    if [[ -f "$f" ]]; then tr -d '\r\n' < "$f" | head -c 4096; return; fi
  done
  echo "No PAT found" >&2
  exit 1
}

PAT=$(resolve_pat)
HDR=(-H "Authorization: Bearer ${PAT}" -H "Content-Type: application/json")

runq() {
  local name="$1"
  local body="$2"
  echo "=== $name ==="
  curl -sS "${HDR[@]}" -X POST "${BASE}/search/projects" -d "$body"
  echo ""
}

runq "Q1_ai_risk_llm" '{"query":"Solana Chrome extension AI analyze transaction risk before sign LLM translator","limit":12,"filters":{}}'
runq "Q2_phishing_signmessage" '{"query":"browser extension block phishing signMessage wallet injection Solana","limit":12,"filters":{}}'
runq "Q3_forensic_immutable" '{"query":"immutable forensic report wallet attack attempt persistent storage","limit":10,"filters":{}}'
runq "Q4_mv3_default_deny" '{"query":"Manifest V3 wallet extension security default deny pending signature","limit":10,"filters":{}}'
