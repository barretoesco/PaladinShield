/** @typedef {import('./types.js').RelGateOptions} RelGateOptions */
/** @typedef {import('./types.js').SignatureIntent} SignatureIntent */
/** @typedef {import('./types.js').PolicyVerdict} PolicyVerdict */

import { isCriticalVerdict } from "./policy.js";

const WRAP_FLAG = "__paladinRelCoreWrapped";

function createRequestId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `req_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function decodeMessageBytes(messageInput) {
  try {
    const bytes =
      messageInput instanceof Uint8Array
        ? messageInput
        : Array.isArray(messageInput)
          ? Uint8Array.from(messageInput)
          : new Uint8Array(0);
    if (!bytes.length) return "";
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes).replace(/\0/g, "").trim();
  } catch (_) {
    return "";
  }
}

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
    const requestId = createRequestId();
    /** @type {SignatureIntent} */
    const intent = {
      requestId,
      method,
      origin,
      timestamp: new Date().toISOString(),
    };

    if (method === "signMessage") {
      intent.action = "message_signature_intent_detected";
      intent.messageText = decodeMessageBytes(args[0]);
      intent.analysisInput = { method, messageText: intent.messageText };
    } else {
      intent.action = "signature_intent_detected";
      intent.transactions = Array.isArray(args[0]) ? args : [args[0]].filter(Boolean);
    }

    const verdict = await options.evaluateIntent(intent);

    if (hardBlockOnCritical && isCriticalVerdict(verdict)) {
      options.onBlocked?.(intent, verdict);
      throw new Error(verdict.mensaje || "PaladinShield REL: firma bloqueada por politica critica.");
    }

    /** @type {ReturnType<typeof setTimeout>|undefined} */
    let decisionTimeoutId;
    const decision = await Promise.race([
      options.requestUserDecision({ intent, verdict, requestId }),
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
