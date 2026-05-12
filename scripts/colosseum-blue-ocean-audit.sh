#!/usr/bin/env bash
set -euo pipefail
BASE="${COLOSSEUM_COPILOT_API_BASE:-https://copilot.colosseum.com/api/v1}"
resolve_pat() {
  [[ -n "${COLOSSEUM_PAT:-}" ]] && { printf '%s' "$COLOSSEUM_PAT"; return; }
  [[ -n "${COLOSSEUM_COPILOT_PAT:-}" ]] && { printf '%s' "$COLOSSEUM_COPILOT_PAT"; return; }
  tr -d '\r\n' <"${HOME}/.colosseum_copilot_pat" | head -c 4096
}
PAT="$(resolve_pat)"
HDR=(-H "Authorization: Bearer ${PAT}" -H "Content-Type: application/json")
echo "=== /status ==="
curl -sS "${HDR[@]}" "${BASE}/status"
echo -e "\n"
sleep 1
q() { echo "=== $1 ==="; curl -sS "${HDR[@]}" -X POST "${BASE}/search/projects" -d "$2"; echo -e "\n"; sleep 1; }
q "Q1_default_deny_promise" '{"query":"Default-deny promise gating wallet browser extension Solana block signing","limit":12,"filters":{}}'
q "Q2_forensic_hash_certificate" '{"query":"Forensic hash integrity certificate browser extension wallet Solana","limit":12,"filters":{}}'
q "Q3_signMessage_enforcement" '{"query":"signMessage enforcement layer wallet security Solana browser","limit":12,"filters":{}}'
echo "=== by-slug forenai ==="
curl -sS "${HDR[@]}" "${BASE}/projects/by-slug/forenai"
echo -e "\n"
sleep 1
echo "=== by-slug csds ==="
curl -sS "${HDR[@]}" "${BASE}/projects/by-slug/csds"
echo -e "\n"
