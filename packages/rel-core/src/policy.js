/** @typedef {import('./types.js').PolicyVerdict} PolicyVerdict */
/** @typedef {import('./types.js').SignatureIntent} SignatureIntent */

import { evaluateIntentHeuristics } from "../../../src/extension/scripts/policy-heuristics.js";

export {
  isUtilityOrigin,
  evaluateUtilityOriginBenign,
  evaluateHoneyPotRisk,
  evaluateMessageRisk,
  evaluatePayloadAuditMarkers,
  evaluateIntentHeuristics,
} from "../../../src/extension/scripts/policy-heuristics.js";

/** @param {PolicyVerdict|null|undefined} verdict */
export function isCriticalVerdict(verdict) {
  if (!verdict) return false;
  return verdict.riesgo === "Alto" || verdict.accion === "Bloquear";
}

/**
 * Default evaluateIntent: local heuristics first, optional async policyEngine hook.
 * @param {SignatureIntent} intent
 * @param {{ policyEngine?: (intent: SignatureIntent) => Promise<PolicyVerdict> }} [options]
 * @returns {Promise<PolicyVerdict>}
 */
export async function evaluateIntent(intent, options = {}) {
  const local = evaluateIntentHeuristics(intent);
  if (local) return local;

  if (typeof options.policyEngine === "function") {
    return options.policyEngine(intent);
  }

  return {
    riesgo: "Medio",
    accion: "Advertir",
    mensaje:
      "Accion: Intent de firma pendiente de revision. Analisis: Sin motor remoto configurado; default-deny recomienda autorizacion explicita.",
  };
}
