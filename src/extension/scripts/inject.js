(() => {
  const WRAP_FLAG = "__clearSignAIWrapped";
  const PROVIDER_FLAG = "__clearSignAIProviderWrapped";
  const TX_OUTBOUND_EVENT = "SIGNATURE_INTENT";
  const MESSAGE_OUTBOUND_EVENT = "MESSAGE_SIGNATURE_INTENT";
  const INBOUND_DECISION_EVENT = "SIGNATURE_DECISION";
  const HOLD_MS = 180;
  const DECISION_TIMEOUT_MS = 90_000;
  const pendingDecisions = new Map();

  console.log("✅ PaladinShield: Runtime Enforcement Active (signTransaction, signAllTransactions, signMessage)");

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function createRequestId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return `req_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  function bytesToHex(bytes) {
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  function bytesToBase64(bytes) {
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, chunk);
    }
    return btoa(binary);
  }

  function toU8(value) {
    if (!value) return new Uint8Array(0);
    if (value instanceof Uint8Array) return value;
    if (Array.isArray(value)) return Uint8Array.from(value);
    if (typeof value === "object" && typeof value.length === "number") return Uint8Array.from(value);
    return new Uint8Array(0);
  }

  function toHexPreview(value, maxBytes = 24) {
    try {
      const bytes = toU8(value);
      if (!bytes.length) return "(vacio)";
      const sliced = bytes.slice(0, maxBytes);
      const suffix = bytes.length > maxBytes ? "..." : "";
      return `${bytesToHex(sliced)}${suffix}`;
    } catch (_) {
      return "(no disponible)";
    }
  }

  function logSerializationDiagnostic() {}

  function safeToBase58(maybePublicKey) {
    try {
      if (maybePublicKey && typeof maybePublicKey.toBase58 === "function") {
        return maybePublicKey.toBase58();
      }
      return String(maybePublicKey || "");
    } catch (_) {
      return "";
    }
  }

  function serializeTransaction(transaction) {
    if (!transaction) return { hex: "", base64: "" };
    const serializeOptions = { requireAllSignatures: false, verifySignatures: false };

    try {
      if (typeof transaction.serialize === "function") {
        const serialized = transaction.serialize(serializeOptions);
        const bytes = toU8(serialized);
        return { hex: bytesToHex(bytes), base64: bytesToBase64(bytes) };
      }
    } catch (error) {
      logSerializationDiagnostic("serialize()", error, {
        txHasInstructions: Array.isArray(transaction?.instructions),
        txInstructionCount: Array.isArray(transaction?.instructions) ? transaction.instructions.length : 0,
      });
    }

    try {
      if (typeof transaction.serializeMessage === "function") {
        const serializedMessage = transaction.serializeMessage();
        const bytes = toU8(serializedMessage);
        return { hex: bytesToHex(bytes), base64: bytesToBase64(bytes) };
      }
    } catch (error) {
      logSerializationDiagnostic("serializeMessage()", error, {
        messagePreviewHex: toHexPreview(transaction?.message),
      });
    }

    return { hex: "", base64: "" };
  }

  function normalizeInstruction(ix, txIndex, ixIndex) {
    try {
      const dataBytes = toU8(ix?.data);
      const keys = Array.isArray(ix?.keys) ? ix.keys : [];

      return {
        txIndex,
        ixIndex,
        programId: safeToBase58(ix?.programId),
        dataHex: bytesToHex(dataBytes),
        dataBase64: bytesToBase64(dataBytes),
        keys: keys.map((key) => ({
          pubkey: safeToBase58(key?.pubkey),
          isSigner: Boolean(key?.isSigner),
          isWritable: Boolean(key?.isWritable),
        })),
      };
    } catch (error) {
      logSerializationDiagnostic("normalizeInstruction()", error, {
        txIndex,
        ixIndex,
        instructionDataPreviewHex: toHexPreview(ix?.data),
        programIdPreview: safeToBase58(ix?.programId),
      });
      return {
        txIndex,
        ixIndex,
        programId: "",
        dataHex: "",
        dataBase64: "",
        keys: [],
      };
    }
  }

  function buildPayload(method, args) {
    const txs =
      method === "signAllTransactions" ? (Array.isArray(args[0]) ? args[0] : []) : [args[0]].filter(Boolean);

    const transactions = txs.map((tx, txIndex) => {
      try {
        const serialized = serializeTransaction(tx);
        const instructions = Array.isArray(tx?.instructions) ? tx.instructions : [];

        return {
          txIndex,
          serializedHex: serialized.hex,
          serializedBase64: serialized.base64,
          instructionCount: instructions.length,
          instructions: instructions.map((ix, ixIndex) => normalizeInstruction(ix, txIndex, ixIndex)),
        };
      } catch (error) {
        logSerializationDiagnostic("buildPayload.map()", error, {
          txIndex,
          txPreviewHex: toHexPreview(tx),
        });
        return {
          txIndex,
          serializedHex: "",
          serializedBase64: "",
          instructionCount: 0,
          instructions: [],
        };
      }
    });

    const programIds = Array.from(
      new Set(
        transactions.flatMap((tx) =>
          (Array.isArray(tx.instructions) ? tx.instructions : [])
            .map((instruction) => instruction.programId)
            .filter(Boolean)
        )
      )
    );

    return {
      source: "clearsign-ai-injected",
      chain: "solana",
      origin: window.location.origin,
      action: "signature_intent_detected",
      method,
      timestamp: new Date().toISOString(),
      transactionCount: transactions.length,
      programIds,
      transactions,
      analysisInput: {
        method,
        programIds,
        transactions,
      },
    };
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

  function decodeMessageBytes(messageInput) {
    try {
      const bytes = toU8(messageInput);
      if (!bytes.length) return "";
      const decoder = new TextDecoder("utf-8", { fatal: false });
      return decoder.decode(bytes).replace(/\0/g, "").trim();
    } catch (_) {
      return "";
    }
  }

  function waitForUserDecision(requestId) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        pendingDecisions.delete(requestId);
        reject(new Error("PaladinShield: tiempo de espera agotado para aprobar la firma."));
      }, DECISION_TIMEOUT_MS);

      pendingDecisions.set(requestId, {
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

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.type !== INBOUND_DECISION_EVENT || !data.payload?.requestId) return;

    const requestId = data.payload.requestId;
    const pending = pendingDecisions.get(requestId);
    if (!pending) return;

    if (data.payload.decision === "approve") {
      pending.resolve(data.payload);
      return;
    }

    const reason = data.payload.reason || "Operacion bloqueada por PaladinShield.";
    pending.reject(new Error(reason));
  });

  function wrapMethod(provider, methodName) {
    const original = provider?.[methodName];
    if (typeof original !== "function" || original[WRAP_FLAG]) return;

    const wrapped = async function (...args) {
      const requestId = createRequestId();
      let payload;

      try {
        payload = buildPayload(methodName, args);
        payload.requestId = requestId;
      } catch (_) {
        payload = {
          requestId,
          source: "clearsign-ai-injected",
          chain: "solana",
          action: "signature_intent_detected",
          method: methodName,
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
      // Promise-gated proxy:
      // We intentionally pause the original wallet signing call until our extension
      // completes AI analysis and receives an explicit user decision. This is the
      // enforcement point that physically prevents malicious signatures from reaching
      // Phantom/Solflare before the user sees the risk verdict.
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
      const messageText = decodeMessageBytes(args[0]);
      const payload = {
        requestId,
        source: "clearsign-ai-injected",
        chain: "solana",
        origin: window.location.origin,
        action: "message_signature_intent_detected",
        method: "signMessage",
        timestamp: new Date().toISOString(),
        messageText,
        messageBase64: bytesToBase64(toU8(args[0])),
        messageHex: bytesToHex(toU8(args[0])),
        analysisInput: {
          method: "signMessage",
          origin: window.location.origin,
          messageText,
          messageBase64: bytesToBase64(toU8(args[0])),
          messageHex: bytesToHex(toU8(args[0])),
        },
      };

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
      // Si no puede redefinir, igual mantenemos el escaneo agresivo por intervalo.
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
})();
