#!/usr/bin/env bash
# Colosseum Copilot — estrategia PaladinShield (status + búsquedas A + by-slug competidores).
set -euo pipefail
BASE="${COLOSSEUM_COPILOT_API_BASE:-https://copilot.colosseum.com/api/v1}"

resolve_pat() {
  if [[ -n "${COLOSSEUM_PAT:-}" ]]; then printf '%s' "$COLOSSEUM_PAT"; return; fi
  if [[ -n "${COLOSSEUM_COPILOT_PAT:-}" ]]; then printf '%s' "$COLOSSEUM_COPILOT_PAT"; return; fi
  for f in "${HOME}/.colosseum_copilot_pat" "${HOME}/.config/colosseum/copilot_pat" "./.colosseum/pat" "./scripts/colosseum-pat.local"; do
    if [[ -f "$f" && -s "$f" ]]; then tr -d '\r\n' <"$f" | head -c 4096; return; fi
  done
  echo "ERROR: No PAT" >&2
  exit 1
}

PAT="$(resolve_pat)"
HDR=(-H "Authorization: Bearer ${PAT}" -H "Content-Type: application/json")

echo "=== GET /status ==="
CODE=$(curl -sS -o /tmp/cs_status.json -w "%{http_code}" "${HDR[@]}" "${BASE}/status")
echo "HTTP=${CODE}"
cat /tmp/cs_status.json
echo ""

if [[ "$CODE" != "200" ]]; then
  echo "Abort: status not 200" >&2
  exit 1
fi

sleep 1

echo "=== A1: runtime enforcement interception forensics Solana security extension ==="
curl -sS "${HDR[@]}" -X POST "${BASE}/search/projects" -d '{
  "query": "runtime enforcement policy interception browser extension Solana wallet security forensics",
  "limit": 12,
  "filters": {},
  "includeDiagnostics": true
}'
echo ""

sleep 1
echo "=== A2: transaction interception deterministic gate default deny signing ==="
curl -sS "${HDR[@]}" -X POST "${BASE}/search/projects" -d '{
  "query": "intercept signing requests deterministic gate block wallet transaction before sign Solana",
  "limit": 12,
  "filters": {},
  "includeDiagnostics": true
}'
echo ""

sleep 1
echo "=== A3: forensic report export audit trail wallet security ==="
curl -sS "${HDR[@]}" -X POST "${BASE}/search/projects" -d '{
  "query": "forensic report JSON export immutable audit trail wallet phishing Solana",
  "limit": 12,
  "filters": {}
}'
echo ""

for slug in guardsol chaingpt iteration-0001; do
  sleep 1
  echo "=== GET /projects/by-slug/${slug} ==="
  curl -sS "${HDR[@]}" "${BASE}/projects/by-slug/${slug}" -w "\nHTTP_CODE:%{http_code}\n"
  echo ""
done
