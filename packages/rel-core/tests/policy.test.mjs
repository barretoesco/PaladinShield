import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateIntentHeuristics,
  evaluateMessageRisk,
  isCriticalVerdict,
  computePaladinForensicHash,
} from "../src/index.js";

test("hostile audit signMessage pattern → Alto / Bloquear", () => {
  const verdict = evaluateIntentHeuristics({
    method: "signMessage",
    messageText: "AUDIT_TEST_MALICIOUS_SIGN payload",
  });
  assert.equal(verdict.riesgo, "Alto");
  assert.equal(verdict.accion, "Bloquear");
  assert.equal(isCriticalVerdict(verdict), true);
});

test("faucet origin with benign programIds → Bajo / Confiar", () => {
  const verdict = evaluateIntentHeuristics({
    origin: "https://spl-token-faucet.com",
    programIds: [
      "11111111111111111111111111111111",
      "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    ],
  });
  assert.equal(verdict.riesgo, "Bajo");
  assert.equal(verdict.accion, "Confiar");
  assert.equal(isCriticalVerdict(verdict), false);
});

test("social engineering message → critical", () => {
  const verdict = evaluateMessageRisk({
    messageText: "SECURITY VERIFICATION REQUIRED NOW. Confirm OWNERSHIP immediately.",
  });
  assert.equal(verdict.accion, "Bloquear");
  assert.equal(isCriticalVerdict(verdict), true);
});

test("signAndSendTransaction audit marker in tx payload → Alto / Bloquear", () => {
  const memoText = "AUDIT_TEST_MALICIOUS_SIGN_AND_SEND";
  const dataHex = [...new TextEncoder().encode(memoText)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const verdict = evaluateIntentHeuristics({
    method: "signAndSendTransaction",
    action: "signature_intent_detected",
    origin: "https://evil.example",
    transactions: [
      {
        metadata: { audit: "AUDIT_TEST_MALICIOUS_SIGN_AND_SEND" },
        instructions: [{ programId: "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr", dataHex, keys: [] }],
      },
    ],
  });

  assert.equal(verdict.riesgo, "Alto");
  assert.equal(verdict.accion, "Bloquear");
});

test("forensic hash is stable for identical payload", async () => {
  const inner = {
    requestId: "test-stable-001",
    timestamp: "2026-05-19T12:00:00.000Z",
    maliciousPayload: { method: "signMessage", messageText: "hello" },
    semanticAnalysis: { riesgo: "Medio", accion: "Advertir", mensaje: "Accion: x. Analisis: y." },
  };
  const a = await computePaladinForensicHash(inner);
  const b = await computePaladinForensicHash(inner);
  assert.equal(a, b);
  assert.match(a, /^[a-f0-9]{64}$/);
});
