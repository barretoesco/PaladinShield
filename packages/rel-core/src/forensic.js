/** @typedef {import('./types.js').PolicyVerdict} PolicyVerdict */

import {
  buildFullCertificateText,
  computePaladinForensicHash,
  prepareIntegrityPayload,
} from "../../../src/extension/scripts/forensic-certificate.js";

export {
  canonicalJsonStringify,
  normalizeInnerReport,
  formatReportForHuman,
  formatTechnicalPayloadSection,
  buildFullCertificateText,
  prepareIntegrityPayload,
  computePaladinForensicHash,
} from "../../../src/extension/scripts/forensic-certificate.js";

/**
 * Full forensic envelope — same certificate text as MV3 Evidence Hub.
 * @param {Object} params
 * @param {string} params.requestId
 * @param {Record<string, unknown>} params.maliciousPayload
 * @param {PolicyVerdict} params.semanticAnalysis
 */
export async function buildForensicReport({ requestId, maliciousPayload, semanticAnalysis }) {
  const timestamp = new Date().toISOString();
  const innerBase = { requestId, timestamp, maliciousPayload, semanticAnalysis };
  const forensicCertificate = buildFullCertificateText(innerBase);
  const integrity = { ...innerBase, forensicCertificate };
  const paladinForensicHash = await computePaladinForensicHash(integrity);

  return {
    PaladinShield_Forensic_Report: {
      ...integrity,
      paladinForensicHash,
    },
  };
}
