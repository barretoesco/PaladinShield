/** @typedef {import('../../rel-core/src/types.js').PolicyVerdict} PolicyVerdict */
/** @typedef {import('../../rel-core/src/types.js').SignatureIntent} SignatureIntent */

import { buildUtilityFailSafeVerdict } from "./fail-safe.js";
import { normalizeVerdict, tryNormalizeVerdict } from "./normalize.js";

/**
 * @typedef {Object} RemotePolicyClientOptions
 * @property {string} endpoint POST target for intent JSON.
 * @property {typeof fetch} [fetchImpl=fetch]
 * @property {number} [timeoutMs=4000]
 * @property {Record<string, string>} [headers]
 * @property {(reason: string, intent: SignatureIntent) => PolicyVerdict} [buildFailSafeVerdict]
 */

/**
 * HTTP policyEngine adapter — POST intent, expect PolicyVerdict JSON.
 * Fail-closed (or utility-aware soft warn) on timeout / HTTP / parse errors.
 *
 * @param {RemotePolicyClientOptions} options
 * @returns {(intent: SignatureIntent) => Promise<PolicyVerdict>}
 */
export function createRemotePolicyClient(options) {
  const {
    endpoint,
    fetchImpl = globalThis.fetch,
    timeoutMs = 4000,
    headers = {},
    buildFailSafeVerdict = buildUtilityFailSafeVerdict,
  } = options;

  if (!endpoint || typeof endpoint !== "string") {
    throw new Error("createRemotePolicyClient: endpoint required");
  }

  if (typeof fetchImpl !== "function") {
    throw new Error("createRemotePolicyClient: fetchImpl must be a function");
  }

  return async function remotePolicyEngine(intent) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchImpl(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: JSON.stringify(intent),
        signal: controller.signal,
      });

      if (!response.ok) {
        return buildFailSafeVerdict(`HTTP ${response.status}`, intent);
      }

      const raw = await response.json();
      const verdict = tryNormalizeVerdict(raw);
      if (!verdict) {
        return buildFailSafeVerdict("invalid verdict JSON", intent);
      }

      return normalizeVerdict(verdict);
    } catch (error) {
      const reason =
        error instanceof Error && error.name === "AbortError"
          ? `timeout ${timeoutMs}ms`
          : String(error instanceof Error ? error.message : error);
      return buildFailSafeVerdict(reason, intent);
    } finally {
      clearTimeout(timer);
    }
  };
}
