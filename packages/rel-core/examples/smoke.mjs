/**
 * Runnable smoke example for @paladinshield/rel-core (Node 18+).
 * node packages/rel-core/examples/smoke.mjs
 */
import {
  evaluateIntentHeuristics,
  isCriticalVerdict,
  computePaladinForensicHash,
} from "../src/index.js";

const hostileMessage = {
  method: "signMessage",
  action: "message_signature_intent_detected",
  messageText: "SECURITY VERIFICATION REQUIRED NOW. Confirm OWNERSHIP immediately.",
};

const verdict = evaluateIntentHeuristics(hostileMessage);
console.log("Heuristic verdict:", verdict);
console.log("Critical:", isCriticalVerdict(verdict));

const hash = await computePaladinForensicHash({
  requestId: "smoke-001",
  timestamp: new Date().toISOString(),
  maliciousPayload: hostileMessage,
  semanticAnalysis: verdict,
});
console.log("Forensic hash (prefix):", hash.slice(0, 16) + "...");
