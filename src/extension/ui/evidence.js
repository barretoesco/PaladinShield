import {
  buildFullCertificateText,
  computePaladinForensicHash,
  formatReportForHuman,
  formatTechnicalPayloadSection,
  normalizeInnerReport,
  prepareIntegrityPayload,
} from "../scripts/forensic-certificate.js";

const FORENSIC_KEYS = ["clearsignai:forensic-reports", "paladinshield:forensic-reports"];
const THREAT_KEY = "clearsignai:threat-history";
const STATE_KEY = "clearsignai:last-analysis-state";

const reportCount = document.getElementById("report-count");
const requestIdEl = document.getElementById("request-id");
const riskAction = document.getElementById("risk-action");
const forensicNarrative = document.getElementById("forensic-narrative");
const forensicTechnical = document.getElementById("forensic-technical");
const technicalDetails = document.getElementById("technical-details");
const reportList = document.getElementById("report-list");
const forceReloadButton = document.getElementById("force-reload");
const downloadJson = document.getElementById("download-forensic-json");
const downloadTxt = document.getElementById("download-forensic-txt");
const forensicHashEl = document.getElementById("forensic-hash");
const copyHashBtn = document.getElementById("copy-forensic-hash");

function recordFromStorageEntry(record) {
  const recordKey = record ? Object.keys(record).find((k) => k.endsWith("_Forensic_Report")) : null;
  const payload = recordKey ? record[recordKey] : record;
  return { recordKey: recordKey || "raw_record", inner: normalizeInnerReport(payload) || payload };
}

function parseReportArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }
  return [];
}

function disableDownloads() {
  downloadJson.href = "#";
  downloadTxt.href = "#";
  downloadJson.setAttribute("aria-disabled", "true");
  downloadTxt.setAttribute("aria-disabled", "true");
}

function syntheticReportFromThreat(threatState) {
  const intent = threatState?.signatureIntent || {};
  const ar = threatState?.analysisResult || {};
  return {
    requestId: threatState?.requestId || intent.requestId,
    timestamp: threatState?.completedAt || threatState?.receivedAt || new Date().toISOString(),
    maliciousPayload: intent,
    semanticAnalysis: {
      riesgo: ar.riesgo || "Unknown",
      accion: ar.accion || "Warn",
      mensaje: ar.mensaje || "No verdict text.",
    },
  };
}

function syntheticReportFromState(state) {
  const intent = state?.signatureIntent || {};
  const ar = state?.analysisResult || {};
  return {
    requestId: state?.requestId || intent.requestId,
    timestamp: state?.completedAt || state?.receivedAt || new Date().toISOString(),
    maliciousPayload: intent,
    semanticAnalysis: {
      riesgo: ar.riesgo || "Unknown",
      accion: ar.accion || "Warn",
      mensaje: ar.mensaje || "No verdict text.",
    },
  };
}

/**
 * One hash for UI, clipboard, TXT & JSON — digest = SHA-256(canonical(integrity payload)).
 */
async function setDownloadAndHash(envelope, inner, basename) {
  if (!envelope || !inner) {
    disableDownloads();
    forensicHashEl.textContent = "—";
    if (copyHashBtn) copyHashBtn.setAttribute("aria-disabled", "true");
    return;
  }

  const hash = await computePaladinForensicHash(inner);
  const integrity = prepareIntegrityPayload(inner);
  const safeBase = (basename || "paladinshield-forensic").replace(/[^a-zA-Z0-9._-]/g, "_");

  const out = {
    ...envelope,
    paladinForensicHash: hash,
    fullReport: integrity ? { ...integrity, paladinForensicHash: hash } : envelope.fullReport,
  };
  const json = JSON.stringify(out, null, 2);

  downloadJson.href = `data:application/json;charset=utf-8,${encodeURIComponent(json)}`;
  downloadJson.setAttribute("download", `${safeBase}.json`);
  downloadJson.setAttribute("aria-disabled", "false");

  const certPlain = integrity?.forensicCertificate || buildFullCertificateText(inner);
  const wrappedTxt = `Paladin Forensic Hash (SHA-256): ${hash}\n\n${certPlain}`;

  downloadTxt.href = `data:text/plain;charset=utf-8,${encodeURIComponent(wrappedTxt)}`;
  downloadTxt.setAttribute("download", `${safeBase}-certificate.txt`);
  downloadTxt.setAttribute("aria-disabled", "false");

  forensicHashEl.textContent = hash || "—";
  if (copyHashBtn) {
    copyHashBtn.setAttribute("aria-disabled", hash ? "false" : "true");
    copyHashBtn.dataset.hash = hash || "";
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function renderReportCards(records) {
  reportList.innerHTML = "";

  if (!records.length) {
    const empty = document.createElement("div");
    empty.className = "report-item report-item-empty";
    empty.textContent = "No forensic reports to display.";
    reportList.appendChild(empty);
    return;
  }

  for (let index = 0; index < records.length; index++) {
    const record = records[index];
    const { recordKey, inner } = recordFromStorageEntry(record);
    const card = document.createElement("article");
    card.className = "forensic-card";

    const head = document.createElement("div");
    head.className = "forensic-card-head";
    head.innerHTML = `<span class="cert-badge">#${index + 1}</span> <span class="record-key">${escapeHtml(
      recordKey
    )}</span>`;

    const hashRow = document.createElement("div");
    hashRow.className = "forensic-hash-row";
    const h = inner ? await computePaladinForensicHash(inner) : "";
    hashRow.innerHTML = `<span class="hash-label">Paladin Forensic Hash</span>
        <code class="hash-value">${escapeHtml(h || "—")}</code>`;

    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "copy-hash-btn";
    copyBtn.textContent = "Copy Hash";
    copyBtn.disabled = !h;
    copyBtn.addEventListener("click", () => {
      if (h) navigator.clipboard.writeText(h).catch(() => {});
    });

    const pre = document.createElement("pre");
    pre.className = "report-item";
    const integ = inner ? prepareIntegrityPayload(inner) : null;
    pre.textContent = integ?.forensicCertificate || (inner ? buildFullCertificateText(inner) : JSON.stringify(record, null, 2));

    card.appendChild(head);
    card.appendChild(hashRow);
    card.appendChild(copyBtn);
    card.appendChild(pre);
    reportList.appendChild(card);
  }
}

async function renderLatestReport() {
  const stored = await chrome.storage.local.get([...FORENSIC_KEYS, THREAT_KEY, STATE_KEY]);

  let activeForensicKey = FORENSIC_KEYS[0];
  let forensicReports = [];
  for (const key of FORENSIC_KEYS) {
    const parsed = parseReportArray(stored?.[key]);
    if (parsed.length) {
      forensicReports = parsed;
      activeForensicKey = key;
      break;
    }
    if (key === FORENSIC_KEYS[0]) {
      forensicReports = parsed;
    }
  }

  const threatHistory = parseReportArray(stored?.[THREAT_KEY]);
  const latestState = stored?.[STATE_KEY] || null;

  reportCount.textContent = String(forensicReports.length);
  await renderReportCards(forensicReports);

  const latestRecord = forensicReports[0] || null;
  const reportKey = latestRecord ? Object.keys(latestRecord).find((k) => k.endsWith("_Forensic_Report")) : null;
  const latestInner = reportKey ? latestRecord[reportKey] : null;

  if (latestInner) {
    requestIdEl.textContent = latestInner.requestId || "-";
    const risk = latestInner.semanticAnalysis?.riesgo || "Unknown";
    const action = latestInner.semanticAnalysis?.accion || "Unknown";
    riskAction.textContent = `${risk} / ${action}`;

    forensicNarrative.textContent = formatReportForHuman(latestInner);
    forensicTechnical.textContent = formatTechnicalPayloadSection(latestInner);
    if (technicalDetails) technicalDetails.open = false;

    const envelope = {
      generatedAt: new Date().toISOString(),
      reviewerNote: "PaladinShield forensic package for human validation and integrity verification.",
      source: "forensic_report",
      storageKey: activeForensicKey,
      requestId: latestInner.requestId || null,
      translatedDecision: latestInner.semanticAnalysis || null,
    };

    const base = latestInner.requestId || "paladinshield-forensic";
    await setDownloadAndHash(envelope, latestInner, base);
    return;
  }

  const fallbackThreat = threatHistory[0]?.state || null;
  if (fallbackThreat) {
    const syn = syntheticReportFromThreat(fallbackThreat);
    requestIdEl.textContent = syn.requestId || "-";
    const risk = syn.semanticAnalysis?.riesgo || "Unknown";
    const action = syn.semanticAnalysis?.accion || "Unknown";
    riskAction.textContent = `${risk} / ${action}`;

    forensicNarrative.textContent =
      formatReportForHuman(syn) +
      "\n\n[Note] Fallback view: forensic record not yet persisted; displaying threat-history snapshot.";
    forensicTechnical.textContent = formatTechnicalPayloadSection(syn);

    const envelope = {
      generatedAt: new Date().toISOString(),
      reviewerNote: "Fallback: threat snapshot (forensic record not yet persisted).",
      source: "threat_history_fallback",
      requestId: syn.requestId,
      translatedDecision: syn.semanticAnalysis,
      intent: fallbackThreat.signatureIntent,
    };
    await setDownloadAndHash(envelope, syn, syn.requestId || "paladinshield-forensic");
    return;
  }

  if (latestState?.analysisResult || latestState?.signatureIntent) {
    const syn = syntheticReportFromState(latestState);
    requestIdEl.textContent = syn.requestId || "-";
    const risk = syn.semanticAnalysis?.riesgo || "Unknown";
    const action = syn.semanticAnalysis?.accion || "Unknown";
    riskAction.textContent = `${risk} / ${action}`;

    forensicNarrative.textContent =
      formatReportForHuman(syn) + "\n\n[Note] Fallback view: latest analysis state from local storage.";
    forensicTechnical.textContent = formatTechnicalPayloadSection(syn);

    const envelope = {
      generatedAt: new Date().toISOString(),
      reviewerNote: "Fallback: latest analysis state.",
      source: "latest_analysis_state",
      requestId: syn.requestId,
      translatedDecision: syn.semanticAnalysis,
      intent: latestState.signatureIntent,
    };
    await setDownloadAndHash(envelope, syn, syn.requestId || "paladinshield-forensic");
    return;
  }

  requestIdEl.textContent = "-";
  riskAction.textContent = "-";
  forensicNarrative.textContent = `No forensic reports found yet. Key checked: ${FORENSIC_KEYS.join(" | ")}`;
  forensicTechnical.textContent = "";
  forensicHashEl.textContent = "—";
  if (copyHashBtn) copyHashBtn.setAttribute("aria-disabled", "true");
  disableDownloads();
}

async function init() {
  if (!chrome?.storage?.local) {
    forensicNarrative.textContent = "chrome.storage.local unavailable.";
    return;
  }

  if (copyHashBtn) {
    copyHashBtn.addEventListener("click", async () => {
      const h = copyHashBtn.dataset.hash;
      if (!h) return;
      try {
        await navigator.clipboard.writeText(h);
        copyHashBtn.textContent = "Copied";
        setTimeout(() => {
          copyHashBtn.textContent = "Copy Hash";
        }, 1600);
      } catch (_) {}
    });
  }

  forceReloadButton.addEventListener("click", () => {
    renderLatestReport().catch((error) => {
      forensicNarrative.textContent = `Reload error: ${error?.message || String(error)}`;
    });
  });

  await renderLatestReport();
}

init().catch((error) => {
  forensicNarrative.textContent = `Init error: ${error?.message || String(error)}`;
});
