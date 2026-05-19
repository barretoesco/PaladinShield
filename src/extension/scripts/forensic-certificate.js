/**
 * Shared forensic certificate formatting + Paladin Forensic Hash (SHA-256 over canonical JSON).
 * Integrity payload: requestId, timestamp, maliciousPayload, semanticAnalysis, forensicCertificate
 * (paladinForensicHash is never part of the digest).
 *
 * Certificate body: professional English for international reviewer / Arena judges.
 */

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

export function normalizeInnerReport(record) {
  if (!record || typeof record !== "object") return null;
  if (record.PaladinShield_Forensic_Report && typeof record.PaladinShield_Forensic_Report === "object") {
    return record.PaladinShield_Forensic_Report;
  }
  if (record.requestId || record.semanticAnalysis || record.maliciousPayload) {
    return record;
  }
  return null;
}

function normalizeUnknown(origin) {
  if (!origin || origin === "desconocido" || origin === "unknown") return "(unknown origin)";
  return origin;
}

function describeMethod(method) {
  if (!method || method === "desconocido" || method === "unknown") return "an unidentified wallet RPC";
  if (method === "signMessage") return "signMessage (off-chain / session-phishing surface)";
  return String(method);
}

function buildIncidentNarrative(origin, method, verdict, risk) {
  const originLabel = normalizeUnknown(origin);
  const via = describeMethod(method);
  const isHighStress =
    risk === "Alto" ||
    risk === "High" ||
    verdict === "Bloquear" ||
    verdict === "Block" ||
    (typeof risk === "string" && risk.toLowerCase() === "high");

  if (isHighStress) {
    return (
      `Incident narrative: A signature attempt was intercepted from ${originLabel} via ${via}. ` +
      `PaladinShield enforced a default-deny policy, neutralizing the intent based on a High-Risk assessment ` +
      `(operational verdict: ${verdict}).`
    );
  }

  return (
    `Incident narrative: A signature attempt was intercepted from ${originLabel} via ${via}. ` +
    `PaladinShield held the signing Promise under default-deny pending explicit operator authorization. ` +
    `Policy assessment: risk «${risk}»; verdict «${verdict}». ` +
    `Technical rationale and raw payload material appear under [TECHNICAL_PAYLOAD] where applicable.`
  );
}

export function formatReportForHuman(json) {
  const report = normalizeInnerReport(json);
  if (!report) {
    return "No forensic payload available.";
  }

  const id = report.requestId ?? "(no id)";
  const ts = report.timestamp ?? "(no timestamp)";
  const sem = report.semanticAnalysis || {};
  const verdict = sem.accion ?? "Unknown";
  const risk = sem.riesgo ?? "Unknown";
  const aiMsg = sem.mensaje ?? "No structured policy verdict text.";
  const payload = report.maliciousPayload || {};
  const origin = payload.origin ?? report.origin ?? "unknown";
  const method = payload.method ?? report.method ?? "unknown";

  const narrativeLine = buildIncidentNarrative(origin, method, verdict, risk);

  const header = `--- PALADINSHIELD FORENSIC REPORT ---
ID: ${id} | Timestamp: ${ts}

══════════════════════════════════════
EXECUTIVE SUMMARY
══════════════════════════════════════

Verdict: ${verdict}

Risk Level: ${risk}

AI Analysis:
${aiMsg}

══════════════════════════════════════
CONTEXT DETAILS
══════════════════════════════════════

Origin (dApp / site): ${normalizeUnknown(origin)}

Intercepted method: ${method === "desconocido" || method === "unknown" ? "(unknown)" : method}

══════════════════════════════════════
INCIDENT RECORD
══════════════════════════════════════

${narrativeLine}

--- NEUTRALIZED ATTACK CERTIFICATE ---
This document certifies that PaladinShield applied Runtime Enforcement Layer (REL) controls
for a signing intent originating at ${normalizeUnknown(origin)}. No signature could complete
without policy evaluation and authorization under default-deny. Retain this report together
with the Paladin Forensic Hash for cryptographic proof and third-party verification.

══════════════════════════════════════
CRYPTOGRAPHIC PROOF (INTEROPERABILITY)
══════════════════════════════════════
Copy the Paladin Forensic Hash from the Evidence Hub: it is the SHA-256 anchor over the
canonical integrity object (this certificate text plus bound metadata fields). PaladinShield
captures evidence at the browser pre-sign boundary; downstream Colosseum-corpus-style systems
such as ForenAI (on-chain chain-of-custody / evidence management) or CSDS (cyber-incident
recording and analysis with immutable audit trails) may consume the exported artifact — we
provide the field-captured, verifiable package; we do not replace institutional back-office tools.
The same digest appears on screen, in the clipboard, and in exported files.
`;

  return header.trimEnd();
}

export function formatTechnicalPayloadSection(json) {
  const report = normalizeInnerReport(json);
  if (!report) return "[TECHNICAL_PAYLOAD]\n(no data)";

  const payload = report.maliciousPayload || {};
  const chunks = ["[TECHNICAL_PAYLOAD]"];

  if (payload.method === "signMessage" || payload.action === "message_signature_intent_detected") {
    if (payload.messageText) chunks.push(`messageText: ${String(payload.messageText)}`);
    if (payload.messageBase64) chunks.push(`messageBase64: ${payload.messageBase64}`);
    if (payload.messageHex) chunks.push(`messageHex: ${payload.messageHex}`);
    if (!payload.messageBase64 && !payload.messageHex && !payload.messageText) {
      chunks.push("(signMessage: minimal payload in storage)");
    }
  }

  if (Array.isArray(payload.transactions)) {
    payload.transactions.forEach((tx, i) => {
      if (tx?.serializedBase64) {
        chunks.push(`transactions[${i}].serializedBase64: ${tx.serializedBase64}`);
      }
      if (tx?.serializedHex) {
        chunks.push(`transactions[${i}].serializedHex: ${tx.serializedHex}`);
      }
    });
  }

  if (payload.serializedBase64 && typeof payload.serializedBase64 === "string") {
    chunks.push(`serializedBase64: ${payload.serializedBase64}`);
  }

  if (chunks.length === 1) {
    chunks.push(
      "(No root-level serializedBase64; inspect instruction material under maliciousPayload in the full JSON export if needed.)"
    );
  }

  return chunks.join("\n\n");
}

export function buildFullCertificateText(json) {
  const human = formatReportForHuman(json);
  const tech = formatTechnicalPayloadSection(json);
  return `${human}\n\n══════════════════════════════════════\nTECHNICAL SECTION\n══════════════════════════════════════\n\n${tech}`;
}

/**
 * Canonical integrity object: fixed fields only, certificate text always populated.
 * @param {Record<string, unknown>} inner — stored forensic inner object (may include paladinForensicHash, legacy without forensicCertificate)
 */
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
      : buildFullCertificateText(baseForCert);

  return {
    requestId,
    timestamp,
    maliciousPayload,
    semanticAnalysis,
    forensicCertificate,
  };
}

async function sha256HexUtf8(str) {
  const buf = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", buf);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** SHA-256 hex over canonical JSON of prepareIntegrityPayload(inner). Tampering forensicCertificate or any field changes the hash. */
export async function computePaladinForensicHash(inner) {
  const payload = prepareIntegrityPayload(inner);
  if (!payload) return "";
  return sha256HexUtf8(canonicalJsonStringify(payload));
}
