/** @typedef {import('./types.js').PolicyVerdict} PolicyVerdict */
/** @typedef {import('./types.js').SignatureIntent} SignatureIntent */

const BENIGN_INFRA_PROGRAM_IDS = new Set([
  "11111111111111111111111111111111",
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
  "ComputeBudget111111111111111111111111111111",
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
]);

function isUtilityOrigin(origin) {
  const lower = (origin || "").toString().toLowerCase();
  return /faucet|airdrop|testnet|devnet|spl-token|token-faucet|drip|\.solana\.org|explorer\.solana/i.test(lower);
}

function evaluateUtilityOriginBenign(intent) {
  const origin = intent?.origin || "";
  if (!isUtilityOrigin(origin)) return null;

  const programIds = Array.isArray(intent?.programIds) ? intent.programIds.filter(Boolean) : [];
  if (programIds.length) {
    for (const programId of programIds) {
      if (!BENIGN_INFRA_PROGRAM_IDS.has(String(programId))) return null;
    }
    return {
      riesgo: "Bajo",
      accion: "Confiar",
      mensaje:
        "Accion: Solicitud acorde a utilidad publica (faucet/devnet). Analisis: Programas de infraestructura estandar detectados localmente.",
    };
  }

  const txs = Array.isArray(intent?.transactions) ? intent.transactions : [];
  if (!txs.length) return null;

  for (const tx of txs) {
    const instructions = Array.isArray(tx?.instructions) ? tx.instructions : [];
    for (const instruction of instructions) {
      const programId = (instruction?.programId || "").toString();
      if (programId && !BENIGN_INFRA_PROGRAM_IDS.has(programId)) return null;
    }
  }

  return {
    riesgo: "Bajo",
    accion: "Confiar",
    mensaje:
      "Accion: Solicitud acorde a utilidad publica (faucet/devnet). Analisis: Solo programas de infraestructura estandar detectados localmente.",
  };
}

/** @param {PolicyVerdict|null|undefined} verdict */
export function isCriticalVerdict(verdict) {
  if (!verdict) return false;
  return verdict.riesgo === "Alto" || verdict.accion === "Bloquear";
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

/** @param {SignatureIntent} intent @returns {PolicyVerdict|null} */
export function evaluateHoneyPotRisk(intent) {
  if (isUtilityOrigin(intent?.origin)) return null;

  const txs = Array.isArray(intent?.transactions) ? intent.transactions : [];
  if (!txs.length) return null;

  for (const tx of txs) {
    const instructions = Array.isArray(tx?.instructions) ? tx.instructions : [];
    const balanceChanges = Array.isArray(tx?.balanceChanges) ? tx.balanceChanges : [];

    for (const instruction of instructions) {
      const programId = (instruction?.programId || "").toString();
      if (BENIGN_INFRA_PROGRAM_IDS.has(programId)) continue;

      const keys = Array.isArray(instruction?.keys) ? instruction.keys : [];
      const writableAccounts = keys.filter((key) => key?.isWritable);
      const signerAccounts = keys.filter((key) => key?.isSigner);
      const highPermissionSignal = writableAccounts.length >= 2 || signerAccounts.length >= 2;
      if (!highPermissionSignal) continue;

      const destination = writableAccounts.find((key) => !key?.isSigner)?.pubkey || "";
      if (!destination) continue;

      const destinationBalance = resolveDestinationPreBalance(balanceChanges, destination);
      if (destinationBalance === 0) {
        return {
          riesgo: "Alto",
          accion: "Bloquear",
          mensaje:
            "Accion: Conceder permisos sobre una cuenta destino nueva. Analisis: patron Honey Pot (balance inicial cero + permisos altos), tipico de drainer.",
        };
      }
    }
  }

  return null;
}

/** @param {SignatureIntent} intent @returns {PolicyVerdict|null} */
export function evaluateMessageRisk(intent) {
  const text = (intent?.messageText || intent?.analysisInput?.messageText || "").toString();
  if (!text.trim()) return null;

  const upper = text.toUpperCase();

  if (/MALICIOUS|DRAINER|AUDIT_TEST_MALICIOUS|BLIND.?SIGN/i.test(upper)) {
    return {
      riesgo: "Alto",
      accion: "Bloquear",
      mensaje:
        "Accion: Firma de mensaje marcado como malicioso o de auditoria hostil. Analisis: Patron de prueba/drainer detectado localmente.",
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
        "Accion: Solicitud de firma de mensaje de reclamo/regalo sospechoso. Analisis: blind signing / claim generico incompatible con default-deny.",
    };
  }

  if (!foundKeywords.length && !foundUrgency.length && !hasSuspiciousUrl) {
    return {
      riesgo: "Medio",
      accion: "Advertir",
      mensaje:
        "Accion: Firma de mensaje de texto. Analisis: Default-deny: revisa dominio y proposito antes de autorizar.",
    };
  }

  const reasons = [];
  if (foundKeywords.length) reasons.push(`palabras sensibles (${foundKeywords.join(", ")})`);
  if (foundUrgency.length) reasons.push(`urgencia (${foundUrgency.join(", ")})`);
  if (hasSuspiciousUrl) reasons.push("enlace potencialmente engañoso");

  return {
    riesgo: "Alto",
    accion: "Bloquear",
    mensaje: `Accion: Solicitud de firma de mensaje potencialmente fraudulenta. Analisis: ${reasons.join(", ")}.`,
  };
}

/**
 * Local zero-network heuristics (aligned with extension translator.js fast path).
 * @param {SignatureIntent} intent
 * @returns {PolicyVerdict|null} null when no local verdict — defer to remote policy engine
 */
export function evaluateIntentHeuristics(intent) {
  if (!intent || typeof intent !== "object") {
    throw new Error("evaluateIntentHeuristics: invalid intent");
  }

  if (intent.method === "signMessage" || intent.action === "message_signature_intent_detected") {
    const messageVerdict = evaluateMessageRisk(intent);
    if (messageVerdict) return messageVerdict;
  }

  const utilityBenign = evaluateUtilityOriginBenign(intent);
  if (utilityBenign) return utilityBenign;

  return evaluateHoneyPotRisk(intent);
}

/**
 * Default evaluateIntent: local heuristics first, optional async policyEngine hook.
 * @param {SignatureIntent} intent
 * @param {{ policyEngine?: (intent: SignatureIntent) => Promise<PolicyVerdict> }} [options]
 * @returns {Promise<PolicyVerdict>}
 */
export async function evaluateIntent(intent, options = {}) {
  const local = evaluateIntentHeuristics(intent);
  if (local) return local;

  if (typeof options.policyEngine === "function") {
    return options.policyEngine(intent);
  }

  return {
    riesgo: "Medio",
    accion: "Advertir",
    mensaje:
      "Accion: Intent de firma pendiente de revision. Analisis: Sin motor remoto configurado; default-deny recomienda autorizacion explicita.",
  };
}
