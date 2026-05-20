/** @typedef {import('./types.js').RelGateOptions} RelGateOptions */
/** @typedef {import('./types.js').SignatureIntent} SignatureIntent */
/** @typedef {import('./types.js').PolicyVerdict} PolicyVerdict */

import { isCriticalVerdict } from "./policy.js";
import { normalizeSigningIntent } from "./intent.js";

const WRAP_FLAG = "__paladinRelCoreWrapped";

/**
 * Promise gate: evaluate policy, optional user decision, then call original signer.
 * @param {RelGateOptions} options
 */
export function createRelGate(options) {
  if (typeof options?.evaluateIntent !== "function") {
    throw new Error("createRelGate: evaluateIntent is required");
  }
  if (typeof options?.requestUserDecision !== "function") {
    throw new Error("createRelGate: requestUserDecision is required");
  }

  const decisionTimeoutMs = options.decisionTimeoutMs ?? 90_000;
  const hardBlockOnCritical = options.hardBlockOnCritical !== false;

  return async function runRelGate(method, args, originalFn, origin = "unknown") {
    const mode =
      typeof options.resolveMode === "function"
        ? options.resolveMode()
        : (options.mode ?? "enforce");
    const intent = normalizeSigningIntent({
      method,
      args,
      origin,
      source: "paladinshield-rel",
    });

    const verdict = await options.evaluateIntent(intent);

    if (mode === "shadow") {
      options.onShadowVerdict?.(intent, verdict);
      return originalFn.apply(null, args);
    }

    if (hardBlockOnCritical && isCriticalVerdict(verdict)) {
      options.onBlocked?.(intent, verdict);
      throw new Error(verdict.mensaje || "PaladinShield REL: firma bloqueada por politica critica.");
    }

    /** @type {ReturnType<typeof setTimeout>|undefined} */
    let decisionTimeoutId;
    const decision = await Promise.race([
      options.requestUserDecision({ intent, verdict, requestId: intent.requestId || "" }),
      new Promise((_, reject) => {
        decisionTimeoutId = setTimeout(
          () => reject(new Error("PaladinShield REL: decision timeout.")),
          decisionTimeoutMs
        );
      }),
    ]).finally(() => {
      if (decisionTimeoutId !== undefined) clearTimeout(decisionTimeoutId);
    });

    if (decision !== "approve") {
      options.onBlocked?.(intent, verdict);
      throw new Error(verdict.mensaje || "PaladinShield REL: firma rechazada por el operador.");
    }

    return originalFn.apply(null, args);
  };
}

/**
 * Wrap a Solana-compatible provider (window.solana shape) with REL gates.
 * @param {Record<string, Function>} provider
 * @param {RelGateOptions & { origin?: string }} options
 */
export function wrapSolanaProvider(provider, options) {
  if (!provider || typeof provider !== "object") {
    throw new Error("wrapSolanaProvider: invalid provider");
  }

  const runGate = createRelGate(options);
  const origin = options.origin ?? "unknown";

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
