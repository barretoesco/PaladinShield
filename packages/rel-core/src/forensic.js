/** @typedef {import('./types.js').PolicyVerdict} PolicyVerdict */

export function canonicalJsonStringify(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => canonicalJsonStringify(v)).join(",")}]`;
  }
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJsonStringify(value[k])}`).join(",")}}`;
}

export function prepareIntegrityPayload(inner) {
  if (!inner || typeof inner !== "object") return null;

  const requestId = inner.requestId;
  const timestamp = inner.timestamp;
  const maliciousPayload = inner.maliciousPayload;
  const semanticAnalysis = inner.semanticAnalysis;

  const baseForCert = { requestId, timestamp, maliciousPayload, semanticAnalysis };
  const forensicCertificate =
    typeof inner.forensicCertificate === "string" && inner.forensicCertificate.length > 0
      ? inner.forensicCertificate
      : buildMinimalCertificateText(baseForCert);

  return {
    requestId,
    timestamp,
    maliciousPayload,
    semanticAnalysis,
    forensicCertificate,
  };
}

function buildMinimalCertificateText(inner) {
  const sem = inner.semanticAnalysis || {};
  return [
    "--- PALADINSHIELD FORENSIC REPORT ---",
    `ID: ${inner.requestId ?? "(no id)"}`,
    `Timestamp: ${inner.timestamp ?? "(no timestamp)"}`,
    `Verdict: ${sem.accion ?? "Unknown"}`,
    `Risk: ${sem.riesgo ?? "Unknown"}`,
    sem.mensaje ? `Analysis: ${sem.mensaje}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

async function sha256HexUtf8(str) {
  const buf = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hashBuffer), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** SHA-256 over canonical integrity object (matches extension Evidence Hub). */
export async function computePaladinForensicHash(inner) {
  const payload = prepareIntegrityPayload(inner);
  if (!payload) return "";
  return sha256HexUtf8(canonicalJsonStringify(payload));
}

/**
 * @param {Object} params
 * @param {string} params.requestId
 * @param {Record<string, unknown>} params.maliciousPayload
 * @param {PolicyVerdict} params.semanticAnalysis
 */
export async function buildForensicReport({ requestId, maliciousPayload, semanticAnalysis }) {
  const timestamp = new Date().toISOString();
  const innerBase = { requestId, timestamp, maliciousPayload, semanticAnalysis };
  const forensicCertificate = buildMinimalCertificateText(innerBase);
  const integrity = { ...innerBase, forensicCertificate };
  const paladinForensicHash = await computePaladinForensicHash(integrity);
  return {
    PaladinShield_Forensic_Report: {
      ...integrity,
      paladinForensicHash,
    },
  };
}
