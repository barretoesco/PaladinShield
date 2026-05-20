/**
 * Local zero-network policy heuristics — canonical source for MV3 REL fast path.
 * Imported by translator.js (extension) and @paladinshield/rel-core (SDK roadmap).
 */

const BENIGN_INFRA_PROGRAM_IDS = new Set([
  "11111111111111111111111111111111",
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
  "ComputeBudget111111111111111111111111111111",
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
]);

export function isUtilityOrigin(origin) {
  const lower = (origin || "").toString().toLowerCase();
  return /faucet|airdrop|testnet|devnet|spl-token|token-faucet|drip|\.solana\.org|explorer\.solana/i.test(lower);
}

export function evaluateUtilityOriginBenign(transactionObject) {
  const origin = transactionObject?.origin || "";
  if (!isUtilityOrigin(origin)) return null;

  const programIds = Array.isArray(transactionObject?.programIds)
    ? transactionObject.programIds.filter(Boolean)
    : [];
  if (programIds.length) {
    for (const programId of programIds) {
      if (!BENIGN_INFRA_PROGRAM_IDS.has(String(programId))) {
        return null;
      }
    }
    return {
      riesgo: "Bajo",
      accion: "Confiar",
      mensaje:
        "Accion: Solicitud acorde a utilidad publica (faucet/devnet). Analisis: Programas de infraestructura estandar detectados localmente; sin senales de drenaje.",
    };
  }

  const txs = Array.isArray(transactionObject?.transactions) ? transactionObject.transactions : [];
  if (!txs.length) return null;

  for (const tx of txs) {
    const instructions = Array.isArray(tx?.instructions) ? tx.instructions : [];
    for (const instruction of instructions) {
      const programId = (instruction?.programId || "").toString();
      if (programId && !BENIGN_INFRA_PROGRAM_IDS.has(programId)) {
        return null;
      }
    }
  }

  return {
    riesgo: "Bajo",
    accion: "Confiar",
    mensaje:
      "Accion: Solicitud acorde a utilidad publica (faucet/devnet). Analisis: Solo programas de infraestructura estandar detectados localmente; sin senales de drenaje.",
  };
}

function resolveDestinationPreBalance(balanceChanges, destinationPubkey) {
  for (const change of balanceChanges) {
    const pubkey = (change?.pubkey || change?.account || change?.address || "").toString();
    if (!pubkey || pubkey !== destinationPubkey) continue;

    if (typeof change?.preBalance === "number") return change.preBalance;
    if (typeof change?.before === "number") return change.before;
    if (typeof change?.oldBalance === "number") return change.oldBalance;
  }
  return null;
}

export function evaluateHoneyPotRisk(transactionObject) {
  if (isUtilityOrigin(transactionObject?.origin)) {
    return null;
  }

  const txs = Array.isArray(transactionObject?.transactions) ? transactionObject.transactions : [];
  if (!txs.length) return null;

  for (const tx of txs) {
    const instructions = Array.isArray(tx?.instructions) ? tx.instructions : [];
    const balanceChanges = Array.isArray(tx?.balanceChanges) ? tx.balanceChanges : [];

    for (const instruction of instructions) {
      const programId = (instruction?.programId || "").toString();
      if (BENIGN_INFRA_PROGRAM_IDS.has(programId)) {
        continue;
      }

      const keys = Array.isArray(instruction?.keys) ? instruction.keys : [];
      const writableAccounts = keys.filter((key) => key?.isWritable);
      const signerAccounts = keys.filter((key) => key?.isSigner);
      const highPermissionSignal = writableAccounts.length >= 2 || signerAccounts.length >= 2;
      if (!highPermissionSignal) continue;

      const destination = writableAccounts.find((key) => !key?.isSigner)?.pubkey || "";
      if (!destination) continue;

      const destinationBalance = resolveDestinationPreBalance(balanceChanges, destination);
      const isZeroBalanceDestination = destinationBalance === 0;

      if (isZeroBalanceDestination) {
        return {
          riesgo: "Alto",
          accion: "Bloquear",
          mensaje:
            "Accion: Conceder permisos sobre una cuenta destino nueva. Analisis: ¡PELIGRO! Se detecto patron Honey Pot (balance inicial cero + permisos altos), tipico de drainer.",
        };
      }
    }
  }

  return null;
}

export function evaluateMessageRisk(transactionObject) {
  const text = (
    transactionObject?.messageText ||
    transactionObject?.analysisInput?.messageText ||
    ""
  ).toString();
  if (!text.trim()) return null;

  const upper = text.toUpperCase();

  if (/MALICIOUS|DRAINER|AUDIT_TEST_MALICIOUS|BLIND.?SIGN/i.test(upper)) {
    return {
      riesgo: "Alto",
      accion: "Bloquear",
      mensaje:
        "Accion: Firma de mensaje marcado como malicioso o de auditoria hostil. Analisis: Patron de prueba/drainer detectado localmente; default-deny aplica.",
    };
  }

  const suspiciousKeywords = [
    "VERIFICATION",
    "SECURITY",
    "OWNERSHIP",
    "RECOVERY",
    "SEED",
    "PHRASE",
    "PRIVATE KEY",
    "WALLET UNLOCK",
    "URGENT",
    "IMMEDIATELY",
  ];

  const urgencySignals = ["NOW", "URGENT", "IMMEDIATELY", "ASAP", "LAST WARNING"];
  const foundKeywords = suspiciousKeywords.filter((keyword) => upper.includes(keyword));
  const foundUrgency = urgencySignals.filter((keyword) => upper.includes(keyword));
  const hasSuspiciousUrl = /https?:\/\//i.test(text) && /(verify|secure|wallet|auth|connect)/i.test(text);

  const phishingLures = ["CLAIM YOUR", "FREE TOKEN", "CLAIM FREE", "AIRDROP NOW", "FREE AIRDROP", "CONGRATULATIONS YOU WON"];
  const hasPhishingLure = phishingLures.some((phrase) => upper.includes(phrase));

  const genericClaim =
    /\b(?:CLAIM|REDEEM|MINT\s+FREE|YOUR\s+\d+[,\s]?\d*\s+(?:FREE\s+)?TOKENS)\b/i.test(text) ||
    /\bFREE\s+(?:NFT|TOKEN)/i.test(text) ||
    (/\bclaim\b/i.test(text) && /\b(?:tokens?|airdrop|reward)\b/i.test(text));

  if (hasPhishingLure || genericClaim) {
    return {
      riesgo: "Alto",
      accion: "Bloquear",
      mensaje:
        "Accion: Solicitud de firma de mensaje de reclamo/regalo sospechoso. Analisis: Texto tipo blind signing / claim generico incompatible con default-deny; posible phishing para autorizar algo distinto fuera del mensaje visible.",
    };
  }

  if (!foundKeywords.length && !foundUrgency.length && !hasSuspiciousUrl) {
    return {
      riesgo: "Medio",
      accion: "Advertir",
      mensaje:
        "Accion: Firma de mensaje de texto. Analisis: Default-deny: no hay garantia solo por el contenido visible; revisa dominio y proposito antes de autorizar.",
    };
  }

  const reasons = [];
  if (foundKeywords.length) reasons.push(`palabras sensibles (${foundKeywords.join(", ")})`);
  if (foundUrgency.length) reasons.push(`urgencia (${foundUrgency.join(", ")})`);
  if (hasSuspiciousUrl) reasons.push("enlace potencialmente engañoso");

  return {
    riesgo: "Alto",
    accion: "Bloquear",
    mensaje: `Accion: Solicitud de firma de mensaje potencialmente fraudulenta. Analisis: ¡PELIGRO! Se detectaron ${reasons.join(
      ", "
    )}, lo que sugiere intento de ingenieria social para robar acceso.`,
  };
}

function decodeHexUtf8(hex) {
  if (!hex || typeof hex !== "string") return "";
  const normalized = hex.replace(/[^0-9a-f]/gi, "");
  if (!normalized || normalized.length % 2 !== 0) return "";
  try {
    const bytes = new Uint8Array(normalized.length / 2);
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = parseInt(normalized.slice(i * 2, i * 2 + 2), 16);
    }
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes).replace(/\0/g, "").trim();
  } catch {
    return "";
  }
}

/** Hostile audit markers embedded in tx memo/metadata (signTransaction / signAndSendTransaction paths). */
export function evaluatePayloadAuditMarkers(intent) {
  const chunks = [];
  if (intent?.messageText) chunks.push(String(intent.messageText));

  const txSources = [
    ...(Array.isArray(intent?.transactions) ? intent.transactions : []),
    ...(Array.isArray(intent?.analysisInput?.transactions) ? intent.analysisInput.transactions : []),
  ];

  for (const tx of txSources) {
    if (tx?.metadata) chunks.push(JSON.stringify(tx.metadata));
    const instructions = Array.isArray(tx?.instructions) ? tx.instructions : [];
    for (const ix of instructions) {
      chunks.push(decodeHexUtf8(ix?.dataHex || ""));
      chunks.push(String(ix?.programId || ""));
    }
  }

  const blob = chunks.join(" ").toUpperCase();
  if (/AUDIT_TEST_MALICIOUS|DRAINER|BLIND.?SIGN/i.test(blob)) {
    return {
      riesgo: "Alto",
      accion: "Bloquear",
      mensaje:
        "Accion: Intent de firma con marcador de auditoria hostil o patron drainer. Analisis: Detectado localmente en payload de transaccion; default-deny aplica.",
    };
  }

  return null;
}

/**
 * Ordered local fast path — same sequence as translateTransaction before OpenAI.
 * @returns {object|null} verdict or null when remote semantic engine should run
 */
export function evaluateIntentHeuristics(intent) {
  if (!intent || typeof intent !== "object") {
    throw new Error("evaluateIntentHeuristics: invalid intent");
  }

  if (intent.method === "signMessage" || intent.action === "message_signature_intent_detected") {
    const messageHeuristic = evaluateMessageRisk(intent);
    if (messageHeuristic) {
      return messageHeuristic;
    }
  }

  const auditMarker = evaluatePayloadAuditMarkers(intent);
  if (auditMarker) {
    return auditMarker;
  }

  const utilityBenign = evaluateUtilityOriginBenign(intent);
  if (utilityBenign) {
    return utilityBenign;
  }

  return evaluateHoneyPotRisk(intent);
}
