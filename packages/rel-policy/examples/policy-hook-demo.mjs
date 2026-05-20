/**
 * PaladinShield REL — remote policyEngine hook demo (Node 18+).
 *
 * Shows how wallet hosts wire @paladinshield/rel-policy after local heuristics
 * in evaluateIntent(). Not production — mock/stub reference only.
 *
 * Run: node packages/rel-policy/examples/policy-hook-demo.mjs
 */

import { evaluateIntent, evaluateIntentHeuristics, isCriticalVerdict } from "../../rel-core/src/index.js";
import { createMockPolicyEngine, createRemotePolicyClient } from "../src/index.js";

const UNKNOWN_ROUTER = "CustomRouter1111111111111111111111111111111";

const mockEngine = createMockPolicyEngine({
  latencyMs: 10,
  rules: [
    {
      match: (intent) =>
        Array.isArray(intent.programIds) &&
        intent.programIds.some((id) => /CustomRouter/i.test(String(id))),
      verdict: {
        riesgo: "Alto",
        accion: "Bloquear",
        mensaje:
          "Accion: Router no verificado detectado por motor remoto mock. Analisis: Programa fuera de allowlist local; default-deny remoto aplica.",
      },
    },
  ],
});

/** @param {import('../../rel-core/src/types.js').SignatureIntent} intent */
async function evaluateWithRemotePolicy(intent) {
  const local = evaluateIntentHeuristics(intent);
  if (local) {
    return { source: "local", verdict: local };
  }

  const remote = await mockEngine(intent);
  return { source: "remote-mock", verdict: remote };
}

console.log("PaladinShield REL — policy hook demo (@paladinshield/rel-policy stub)\n");

console.log("--- 1) Local fast path (hostile audit) ---");
const hostile = await evaluateWithRemotePolicy({
  method: "signMessage",
  messageText: "AUDIT_TEST_MALICIOUS_SIGN drill",
});
console.log(`[${hostile.source}] ${hostile.verdict.riesgo}/${hostile.verdict.accion}`);

console.log("\n--- 2) Local fast path (generic signMessage — no remote needed) ---");
const signMessageLocal = await evaluateWithRemotePolicy({
  method: "signMessage",
  origin: "https://app.example.com",
  messageText: "Please confirm this routine account note for Tuesday standup.",
});
console.log(`[${signMessageLocal.source}] ${signMessageLocal.verdict.riesgo}/${signMessageLocal.verdict.accion}`);

console.log("\n--- 3) Remote mock (unknown program — local null) ---");
const unknownProgram = await evaluateWithRemotePolicy({
  method: "signTransaction",
  origin: "https://app.example.com",
  action: "signature_intent_detected",
  programIds: [UNKNOWN_ROUTER],
});
console.log(`[${unknownProgram.source}] ${unknownProgram.verdict.riesgo}/${unknownProgram.verdict.accion}`);
console.log(`critical=${isCriticalVerdict(unknownProgram.verdict)}`);

console.log("\n--- 4) evaluateIntent + createRemotePolicyClient (mock fetch) ---");
const remoteClient = createRemotePolicyClient({
  endpoint: "https://policy.example/v1/audit",
  fetchImpl: async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      riesgo: "Medio",
      accion: "Advertir",
      mensaje: "Accion: Remote semantic stub. Analisis: Payload requires operator review.",
    }),
  }),
});

const integrated = await evaluateIntent(
  {
    method: "signTransaction",
    origin: "https://app.example.com",
    action: "signature_intent_detected",
    programIds: ["StagingProgram111111111111111111111111111111"],
  },
  { policyEngine: remoteClient }
);
console.log(`[evaluateIntent+remote] ${integrated.riesgo}/${integrated.accion}`);

console.log("\nDemo completa — local-first, remote fallback, fail-closed client.");
