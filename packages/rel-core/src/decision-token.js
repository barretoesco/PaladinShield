/**
 * Reference decision-token helpers for wallet hosts embedding REL.
 * MV3 extension implements the full pattern in background.js + inject.js.
 */

/**
 * @returns {string}
 */
export function createDecisionToken() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `dt_${Date.now()}_${Math.random().toString(16).padStart(2, "0")}`;
}

/**
 * In-memory registry — replace with secure wallet-side storage in production.
 */
export function createDecisionTokenRegistry() {
  /** @type {Map<string, string>} */
  const byRequestId = new Map();

  return {
    /**
     * @param {string} requestId
     * @param {string} decisionToken
     */
    register(requestId, decisionToken) {
      if (!requestId || !decisionToken) return;
      byRequestId.set(requestId, decisionToken);
    },

    /**
     * @param {string} requestId
     * @param {string} decisionToken
     */
    validate(requestId, decisionToken) {
      const expected = byRequestId.get(requestId);
      return Boolean(expected && expected === decisionToken);
    },

    /**
     * @param {string} requestId
     */
    consume(requestId) {
      byRequestId.delete(requestId);
    },
  };
}

/**
 * @param {string} decision
 * @param {string} decisionToken
 * @param {ReturnType<typeof createDecisionTokenRegistry>} registry
 * @param {string} requestId
 * @returns {boolean}
 */
export function acceptOperatorDecision(decision, decisionToken, registry, requestId) {
  if (!registry.validate(requestId, decisionToken)) {
    return false;
  }
  registry.consume(requestId);
  return decision === "approve";
}
