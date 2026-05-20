/** @typedef {import('../../rel-core/src/types.js').PolicyVerdict} PolicyVerdict */
/** @typedef {import('../../rel-core/src/types.js').SignatureIntent} SignatureIntent */

import { normalizeVerdict } from "./normalize.js";

/**
 * @typedef {Object} MockPolicyRule
 * @property {(intent: SignatureIntent) => boolean} match
 * @property {PolicyVerdict} verdict
 */

/**
 * @typedef {Object} MockPolicyEngineOptions
 * @property {number} [latencyMs=0] Simulated network latency.
 * @property {MockPolicyRule[]} [rules] First matching rule wins.
 * @property {PolicyVerdict} [defaultVerdict] When no rule matches.
 * @property {(intent: SignatureIntent) => void} [onEvaluate] Hook for tests/demos.
 */

const DEFAULT_MOCK_VERDICT = {
  riesgo: "Medio",
  accion: "Advertir",
  mensaje:
    "Accion: Mock remote policy — revision manual. Analisis: Heuristica local sin match; motor remoto de demo recomienda advertencia explicita.",
};

/**
 * Creates an async policyEngine for `evaluateIntent(intent, { policyEngine })`.
 * Use in wallet pilots before wiring a real semantic policy service.
 *
 * @param {MockPolicyEngineOptions} [options]
 * @returns {(intent: SignatureIntent) => Promise<PolicyVerdict>}
 */
export function createMockPolicyEngine(options = {}) {
  const {
    latencyMs = 0,
    rules = [],
    defaultVerdict = DEFAULT_MOCK_VERDICT,
    onEvaluate,
  } = options;

  return async function mockPolicyEngine(intent) {
    if (typeof onEvaluate === "function") {
      onEvaluate(intent);
    }

    if (latencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, latencyMs));
    }

    for (const rule of rules) {
      if (typeof rule.match === "function" && rule.match(intent)) {
        return normalizeVerdict(rule.verdict);
      }
    }

    return normalizeVerdict(defaultVerdict);
  };
}
