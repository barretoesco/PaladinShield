import test from "node:test";
import assert from "node:assert/strict";
import { computePaladinForensicHash, buildForensicReport, buildFullCertificateText } from "../src/forensic.js";
import { computePaladinForensicHash as extensionHash } from "../../../src/extension/scripts/forensic-certificate.js";

test("SDK forensic hash matches extension Evidence Hub for identical inner object", async () => {
  const inner = {
    requestId: "forensic-parity-001",
    timestamp: "2026-05-19T18:00:00.000Z",
    maliciousPayload: {
      method: "signAndSendTransaction",
      origin: "https://drainer-domain.evil",
      metadata: { audit: "AUDIT_TEST_MALICIOUS_SIGN_AND_SEND" },
    },
    semanticAnalysis: {
      riesgo: "Alto",
      accion: "Bloquear",
      mensaje: "Accion: Bloquear. Analisis: audit marker.",
    },
  };

  inner.forensicCertificate = buildFullCertificateText(inner);

  const sdkHash = await computePaladinForensicHash(inner);
  const extHash = await extensionHash(inner);

  assert.equal(sdkHash, extHash);
  assert.match(sdkHash, /^[a-f0-9]{64}$/);
});

test("buildForensicReport includes full certificate and hash", async () => {
  const report = await buildForensicReport({
    requestId: "forensic-report-001",
    maliciousPayload: { method: "signMessage", messageText: "test" },
    semanticAnalysis: { riesgo: "Alto", accion: "Bloquear", mensaje: "Accion: x. Analisis: y." },
  });

  const inner = report.PaladinShield_Forensic_Report;
  assert.ok(inner.forensicCertificate.includes("PALADINSHIELD FORENSIC REPORT"));
  assert.ok(inner.forensicCertificate.includes("TECHNICAL SECTION"));
  assert.match(inner.paladinForensicHash, /^[a-f0-9]{64}$/);
});
