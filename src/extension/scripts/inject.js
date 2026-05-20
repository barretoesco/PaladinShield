import { normalizeSigningIntent, createRequestId } from "./intent-normalizer.js";

const WRAP_FLAG = "__clearSignAIWrapped";
const PROVIDER_FLAG = "__clearSignAIProviderWrapped";
const TX_OUTBOUND_EVENT = "SIGNATURE_INTENT";
const MESSAGE_OUTBOUND_EVENT = "MESSAGE_SIGNATURE_INTENT";
const HOLD_MS = 180;
const DECISION_HANDLER_REGISTER = "__paladinShieldRegisterDecisionToken";
const DECISION_HANDLER_ACCEPT = "__paladinShieldAcceptDecision";
const DECISION_TIMEOUT_MS = 90_000;
const pendingDecisions = new Map();

console.log(
  "✅ PaladinShield: Runtime Enforcement Active (signTransaction, signAllTransactions, signMessage, signAndSendTransaction)"
);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function publishPayload(payload) {
  console.log("[PaladinShield inject] SIGNATURE_INTENT → content bridge", payload?.requestId || "");
  window.postMessage(
    {
      type: TX_OUTBOUND_EVENT,
      payload,
    },
    "*"
  );
}

function publishMessagePayload(payload) {
  console.log("[PaladinShield inject] MESSAGE_SIGNATURE_INTENT → content bridge", payload?.requestId || "");
  window.postMessage(
    {
      type: MESSAGE_OUTBOUND_EVENT,
      payload,
    },
    "*"
  );
}

function waitForUserDecision(requestId) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      pendingDecisions.delete(requestId);
      reject(new Error("PaladinShield: tiempo de espera agotado para aprobar la firma."));
    }, DECISION_TIMEOUT_MS);

    pendingDecisions.set(requestId, {
      decisionToken: null,
      resolve: (decisionPayload) => {
        clearTimeout(timeoutId);
        pendingDecisions.delete(requestId);
        resolve(decisionPayload);
      },
      reject: (error) => {
        clearTimeout(timeoutId);
        pendingDecisions.delete(requestId);
        reject(error);
      },
    });
  });
}

function registerDecisionToken(requestId, decisionToken) {
  const pending = pendingDecisions.get(requestId);
  if (!pending || typeof decisionToken !== "string" || !decisionToken) return;
  pending.decisionToken = decisionToken;
}

function acceptDecision(requestId, decision, decisionToken, reason = "") {
  const pending = pendingDecisions.get(requestId);
  if (!pending) return;

  if (!pending.decisionToken || pending.decisionToken !== decisionToken) {
    console.warn(
      "[PaladinShield inject] Decision rejected: missing or invalid decision token (postMessage spoof blocked)."
    );
    return;
  }

  if (decision === "approve") {
    console.log("[PaladinShield inject] Decision approved — releasing Promise gate.");
    pending.resolve({ requestId, decision, reason, timestamp: new Date().toISOString() });
    return;
  }

  pending.reject(new Error(reason || "Operacion bloqueada por PaladinShield."));
}

window[DECISION_HANDLER_REGISTER] = registerDecisionToken;
window[DECISION_HANDLER_ACCEPT] = acceptDecision;

function wrapMethod(provider, methodName) {
  const original = provider?.[methodName];
  if (typeof original !== "function" || original[WRAP_FLAG]) return;

  const wrapped = async function (...args) {
    const requestId = createRequestId();
    let payload;

    try {
      payload = normalizeSigningIntent({
        method: methodName,
        args,
        origin: window.location.origin,
        requestId,
        source: "clearsign-ai-injected",
      });
    } catch (_) {
      payload = {
        requestId,
        source: "clearsign-ai-injected",
        chain: "solana",
        action: "signature_intent_detected",
        method: methodName,
        origin: window.location.origin,
        timestamp: new Date().toISOString(),
        transactionCount: 0,
        transactions: [],
        analysisInput: {
          method: methodName,
          transactions: [],
        },
      };
    }

    const decisionPromise = waitForUserDecision(requestId);
    publishPayload(payload);
    await sleep(HOLD_MS);
    await decisionPromise;
    return original.apply(this, args);
  };

  wrapped[WRAP_FLAG] = true;
  provider[methodName] = wrapped;
}

function wrapSignMessage(provider) {
  const original = provider?.signMessage;
  if (typeof original !== "function" || original[WRAP_FLAG]) return;

  const wrapped = async function (...args) {
    const requestId = createRequestId();
    const decisionPromise = waitForUserDecision(requestId);
    const payload = normalizeSigningIntent({
      method: "signMessage",
      args,
      origin: window.location.origin,
      requestId,
      source: "clearsign-ai-injected",
    });

    publishMessagePayload(payload);
    await sleep(HOLD_MS);
    await decisionPromise;
    return original.apply(this, args);
  };

  console.log("🛡️ PaladinShield: signMessage wrapped — same Promise gate as tx paths (phishing / SIWE-style prompts).");

  wrapped[WRAP_FLAG] = true;
  provider.signMessage = wrapped;
}

function wrapProvider(provider) {
  if (!provider || provider[PROVIDER_FLAG]) return;
  wrapMethod(provider, "signTransaction");
  wrapMethod(provider, "signAllTransactions");
  wrapMethod(provider, "signAndSendTransaction");
  wrapSignMessage(provider);
  provider[PROVIDER_FLAG] = true;
}

function aggressiveProviderCapture() {
  let currentProvider = window.solana;
  wrapProvider(currentProvider);

  try {
    Object.defineProperty(window, "solana", {
      configurable: true,
      enumerable: true,
      get() {
        return currentProvider;
      },
      set(nextProvider) {
        currentProvider = nextProvider;
        wrapProvider(nextProvider);
      },
    });
  } catch (_) {
    /* interval fallback below */
  }

  const timer = setInterval(() => {
    const liveProvider = window.solana;
    if (liveProvider) {
      wrapProvider(liveProvider);
    }
  }, 120);

  setTimeout(() => clearInterval(timer), 30_000);
}

aggressiveProviderCapture();
