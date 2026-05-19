#!/usr/bin/env bash
# Brief PaladinShield → Colosseum Copilot (similarity retrieval; no grading endpoint).
set -eu

BASE="${COLOSSEUM_COPILOT_API_BASE:-https://copilot.colosseum.com/api/v1}"
resolve_pat() {
  for f in "${HOME}/.colosseum_copilot_pat" "${HOME}/.config/colosseum/copilot_pat"; do
    [[ -f "$f" && -s "$f" ]] && tr -d '\r\n' <"$f" | head -c 4096 && return 0
  done
  return 1
}
PAT="$(resolve_pat)" || { echo "ERROR: Falta ~/.colosseum_copilot_pat"; exit 1; }
HDR=(-H "Authorization: Bearer ${PAT}" -H "Content-Type: application/json")

echo "=== GET /status ==="
curl -sS "${HDR[@]}" "${BASE}/status"
echo ""

python3 <<'PY'
import json

brief = """PaladinShield ClearSign MV3 Chromium extension Solana Runtime Enforcement REL. Wraps wallet provider signTransaction signAllTransactions signMessage with Promise gate until Chrome extension service worker resolves allow/block; execution cannot reach wallet before verdict (default deny). Differentiated from simulate-only tools: deterministic execution hold at promise boundary.

Semantic motor: OpenAI Chat Completions model gpt-4o-mini, response_format json_object, bilingual Spanish verdict fields riesgo accion mensaje; system auditor prompt rejects origin-trust-alone; contrasts origin lexical hints vs instruction payloads; AyudaAlAdministrador for compromised benign-looking sites.

Forensics: forensic certificate narrative + canonical integrity blob + SHA-256 Paladin forensic hash; Evidence Hub downloads JSON/text; interoperable with external forensic consoles.

Operational: popup requests GET_CURRENT_STATE; broadcast on intercept; forensic auto-persist when Alto or Bloquear."""

payload = {"query": brief.strip(), "limit": 12, "filters": {}, "includeDiagnostics": True}
with open("/tmp/copilot_body1.json", "w") as f:
    json.dump(payload, f)

PY

echo "=== POST /search/projects (full brief + diagnostics) ==="
curl -sS "${HDR[@]}" -X POST "${BASE}/search/projects" -d @/tmp/copilot_body1.json \
  | tee /tmp/copilot_paladin_projects.json

echo ""
echo "=== POST /search/projects winnersOnly overlap ==="
python3 <<'PY'
import json

brief = "Solana browser extension intercept wallet signing phishing drainer detection default deny forensic evidence cryptographic hash MV3 REL promise gate semantic LLM verdict block before sign".strip()

with open("/tmp/copilot_body2.json", "w") as f:
    json.dump(
        {"query": brief, "limit": 12, "filters": {"winnersOnly": True}, "includeDiagnostics": True},
        f,
    )
PY

curl -sS "${HDR[@]}" -X POST "${BASE}/search/projects" -d @/tmp/copilot_body2.json \
  | tee /tmp/copilot_paladin_winners.json

echo ""
echo "=== POST /search/archives ==="
curl -sS "${HDR[@]}" -X POST "${BASE}/search/archives" -d '{
  "query": "browser extension wallet signing security user protection phishing",
  "limit": 5,
  "maxChunksPerDoc": 1
}' | tee /tmp/copilot_paladin_archives.json

echo ""
echo "Outputs: /tmp/copilot_body1.json brief | /tmp/copilot_paladin_projects.json | /tmp/copilot_paladin_winners.json | /tmp/copilot_paladin_archives.json"
