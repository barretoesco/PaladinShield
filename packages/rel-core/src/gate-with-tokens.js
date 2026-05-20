/** @typedef {import('./types.js').RelGateOptions} RelGateOptions */
/** @typedef {import('./types.js').SignatureIntent} SignatureIntent */
/** @typedef {import('./types.js').PolicyVerdict} PolicyVerdict */

import { createRelGate, wrapSolanaProvider } from "./gate.js";
import {
  createDecisionToken,
  createDecisionTokenRegistry,
  acceptOperatorDecision,
} from "./decision-token.js";

/**
 * @typedef {ReturnType<typeof createDecisionTokenRegistry>} DecisionTokenRegistry
 */

/**
 * @typedef {Omit<RelGateOptions, 'requestUserDecision'> & {
 *   registry?: DecisionTokenRegistry,
 *   requestOperatorApproval: (ctx: {
 *     intent: SignatureIntent,
 *     verdict: PolicyVerdict,
 *     requestId: string,
 *     decisionToken: string,
 *     registry: DecisionTokenRegistry,
 *   }) => Promise<boolean>,
 *   onTokenSpoofBlocked?: (ctx: { requestId: string }) => void,
 * }} RelGateWithTokensOptions
 */

/**
 * Promise gate with built-in decision-token registration and validation.
 * Wallet hosts implement `requestOperatorApproval` (UI) — tokens stay in wallet runtime.
 *
 * @param {RelGateWithTokensOptions} options
 */
export function createRelGateWithTokens(options) {
  const registry = options.registry ?? createDecisionTokenRegistry();
  const { requestOperatorApproval, onTokenSpoofBlocked, ...gateOptions } = options;

  if (typeof requestOperatorApproval !== "function") {
    throw new Error("createRelGateWithTokens: requestOperatorApproval is required");
  }

  return createRelGate({
    ...gateOptions,
    requestUserDecision: async ({ intent, verdict, requestId }) => {
      const decisionToken = createDecisionToken();
      registry.register(requestId, decisionToken);

      const approved = await requestOperatorApproval({
        intent,
        verdict,
        requestId,
        decisionToken,
        registry,
      });

      if (!approved) {
        registry.consume(requestId);
        return "block";
      }

      if (acceptOperatorDecision("approve", decisionToken, registry, requestId)) {
        return "approve";
      }

      onTokenSpoofBlocked?.({ requestId });
      return "block";
    },
  });
}

/**
 * @param {Record<string, Function>} provider
 * @param {RelGateWithTokensOptions & { origin?: string }} options
 */
export function wrapSolanaProviderWithTokens(provider, options) {
  if (!provider || typeof provider !== "object") {
    throw new Error("wrapSolanaProviderWithTokens: invalid provider");
  }

  const runGate = createRelGateWithTokens(options);
  const origin = options.origin ?? "unknown";

  const WRAP_FLAG = "__paladinRelCoreWrapped";

  for (const method of [
    "signTransaction",
    "signAllTransactions",
    "signMessage",
    "signAndSendTransaction",
  ]) {
    const original = provider[method];
    if (typeof original !== "function" || original[WRAP_FLAG]) continue;

    const wrapped = function (...args) {
      return runGate(method, args, original.bind(provider), origin);
    };
    wrapped[WRAP_FLAG] = true;
    provider[method] = wrapped;
  }

  return provider;
}

/**
 * Reference helper — simulate a hostile spoof approve (returns false when blocked).
 * @param {DecisionTokenRegistry} registry
 * @param {string} requestId
 * @param {string} [spoofToken='spoof-token']
 */
export function simulateSpoofApprove(registry, requestId, spoofToken = "spoof-token") {
  return acceptOperatorDecision("approve", spoofToken, registry, requestId);
}
