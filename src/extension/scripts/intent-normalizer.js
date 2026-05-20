/**
 * Canonical signing-intent normalization — shared by MV3 inject and @paladinshield/rel-core.
 * Produces structured payloads for policy heuristics (programIds, instructions, messageText).
 */

export function createRequestId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `req_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function toU8(value) {
  if (!value) return new Uint8Array(0);
  if (value instanceof Uint8Array) return value;
  if (Array.isArray(value)) return Uint8Array.from(value);
  if (typeof value === "object" && typeof value.length === "number") return Uint8Array.from(value);
  return new Uint8Array(0);
}

export function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function bytesToBase64(bytes) {
  if (typeof btoa === "function") {
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, chunk);
    }
    return btoa(binary);
  }

  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }

  return "";
}

export function safeToBase58(maybePublicKey) {
  try {
    if (maybePublicKey && typeof maybePublicKey.toBase58 === "function") {
      return maybePublicKey.toBase58();
    }
    return String(maybePublicKey || "");
  } catch (_) {
    return "";
  }
}

export function decodeMessageBytes(messageInput) {
  try {
    const bytes = toU8(messageInput);
    if (!bytes.length) return "";
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes).replace(/\0/g, "").trim();
  } catch (_) {
    return "";
  }
}

export function serializeTransaction(transaction) {
  if (!transaction) return { hex: "", base64: "" };
  const serializeOptions = { requireAllSignatures: false, verifySignatures: false };

  try {
    if (typeof transaction.serialize === "function") {
      const serialized = transaction.serialize(serializeOptions);
      const bytes = toU8(serialized);
      return { hex: bytesToHex(bytes), base64: bytesToBase64(bytes) };
    }
  } catch (_) {
    /* fall through */
  }

  try {
    if (typeof transaction.serializeMessage === "function") {
      const serializedMessage = transaction.serializeMessage();
      const bytes = toU8(serializedMessage);
      return { hex: bytesToHex(bytes), base64: bytesToBase64(bytes) };
    }
  } catch (_) {
    /* fall through */
  }

  return { hex: "", base64: "" };
}

export function normalizeInstruction(ix, txIndex, ixIndex) {
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
  } catch (_) {
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

/**
 * @param {string} method
 * @param {unknown[]} args
 * @returns {Array<Record<string, unknown>>}
 */
export function normalizeTransactionRecords(method, args) {
  const txs =
    method === "signAllTransactions" ? (Array.isArray(args[0]) ? args[0] : []) : [args[0]].filter(Boolean);

  return txs.map((tx, txIndex) => {
    try {
      const serialized = serializeTransaction(tx);
      const instructions = Array.isArray(tx?.instructions) ? tx.instructions : [];

      return {
        txIndex,
        serializedHex: serialized.hex,
        serializedBase64: serialized.base64,
        instructionCount: instructions.length,
        metadata: tx?.metadata && typeof tx.metadata === "object" ? tx.metadata : undefined,
        instructions: instructions.map((ix, ixIndex) => normalizeInstruction(ix, txIndex, ixIndex)),
      };
    } catch (_) {
      return {
        txIndex,
        serializedHex: "",
        serializedBase64: "",
        instructionCount: 0,
        instructions: [],
      };
    }
  });
}

/**
 * @param {Array<Record<string, unknown>>} transactions
 * @returns {string[]}
 */
export function collectProgramIds(transactions) {
  return Array.from(
    new Set(
      transactions.flatMap((tx) =>
        (Array.isArray(tx.instructions) ? tx.instructions : [])
          .map((instruction) => instruction.programId)
          .filter(Boolean)
      )
    )
  );
}

/**
 * Normalize any wallet signing call into a SignatureIntent-shaped object for policy evaluation.
 *
 * @param {{
 *   method: string,
 *   args: unknown[],
 *   origin?: string,
 *   requestId?: string,
 *   source?: string,
 *   chain?: string,
 *   timestamp?: string,
 * }} input
 * @returns {Record<string, unknown>}
 */
export function normalizeSigningIntent(input) {
  const {
    method,
    args,
    origin = "unknown",
    requestId = createRequestId(),
    source = "paladinshield-rel",
    chain = "solana",
    timestamp = new Date().toISOString(),
  } = input;

  if (method === "signMessage") {
    const messageBytes = toU8(args[0]);
    const messageText = decodeMessageBytes(messageBytes);

    return {
      requestId,
      source,
      chain,
      origin,
      action: "message_signature_intent_detected",
      method: "signMessage",
      timestamp,
      messageText,
      messageBase64: bytesToBase64(messageBytes),
      messageHex: bytesToHex(messageBytes),
      analysisInput: {
        method: "signMessage",
        origin,
        messageText,
        messageBase64: bytesToBase64(messageBytes),
        messageHex: bytesToHex(messageBytes),
      },
    };
  }

  const transactions = normalizeTransactionRecords(method, args);
  const programIds = collectProgramIds(transactions);

  return {
    requestId,
    source,
    chain,
    origin,
    action: "signature_intent_detected",
    method,
    timestamp,
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
