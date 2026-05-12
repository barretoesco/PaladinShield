import { translateTransaction } from "./translator.js";
import { buildFullCertificateText, computePaladinForensicHash } from "./forensic-certificate.js";

const ANALYSIS_CHANNEL = "SIGNATURE_INTENT";
const MESSAGE_ANALYSIS_CHANNEL = "MESSAGE_SIGNATURE_INTENT";
const STATE_STORAGE_KEY = "clearsignai:last-analysis-state";
const THREAT_REPORT_CHANNEL = "CLEAR_SIGN_AI_THREAT_REPORT";
const THREAT_HISTORY_KEY = "clearsignai:threat-history";
const FORENSIC_REPORTS_KEY = "clearsignai:forensic-reports";
const USER_DECISION_CHANNEL = "CLEAR_SIGN_AI_USER_DECISION";
const DECISION_TO_CONTENT_CHANNEL = "CLEAR_SIGN_AI_SIGNATURE_DECISION";
const GET_CURRENT_STATE_TYPE = "GET_CURRENT_STATE";
const pendingSignatureRequests = new Map();
const POPUP_PATH = "ui/popup.html";
let activePopupWindowId = null;

function createIdleState() {
  return {
    stage: "idle",
    pendingApproval: false,
    updatedAt: new Date().toISOString(),
    status: "rel_active",
    relHeadline: "REL ACTIVE",
    semanticReady: true,
  };
}

/** Estado REL en memoria — siempre coherente con popup vía GET_CURRENT_STATE */
let currentState = createIdleState();

async function callAiAnalysisEngine(signatureIntent) {
  return translateTransaction(signatureIntent);
}

function isCriticalRisk(analysisResult) {
  const risk = analysisResult?.riesgo || "";
  const action = analysisResult?.accion || "";
  return risk === "Alto" || action === "Bloquear";
}

async function persistAnalysisState(state) {
  currentState = state == null ? createIdleState() : state;
  if (chrome.storage?.local) {
    await chrome.storage.local.set({ [STATE_STORAGE_KEY]: currentState });
  }
}

/**
 * Arranque del service worker: publica REL ACTIVE y motor semantico listo sin pasos extra.
 * No pisar flujos con firma pendiente.
 */
async function ensureRelBootState() {
  const latest = await readLatestAnalysisState();
  if (latest != null) {
    currentState = latest;
  }
  if (latest?.stage === "analyzing") return;
  if (latest?.pendingApproval === true && latest?.stage === "completed") return;

  const idle = createIdleState();
  await persistAnalysisState(idle);
  await broadcastAnalysisUpdate(idle);
}

async function setIdleStateIfNoPending() {
  if (pendingSignatureRequests.size === 0) {
    const idle = createIdleState();
    await persistAnalysisState(idle);
    await broadcastAnalysisUpdate(idle);
  }
}

async function readLatestAnalysisState() {
  if (!chrome.storage?.local) return null;
  const stored = await chrome.storage.local.get(STATE_STORAGE_KEY);
  return stored?.[STATE_STORAGE_KEY] || null;
}

async function readThreatHistory() {
  if (!chrome.storage?.local) return [];
  const stored = await chrome.storage.local.get(THREAT_HISTORY_KEY);
  const history = stored?.[THREAT_HISTORY_KEY];
  return Array.isArray(history) ? history : [];
}

async function persistThreatReport(report) {
  const existing = await readThreatHistory();
  const enriched = {
    reportId: crypto.randomUUID(),
    receivedAt: new Date().toISOString(),
    ...report,
  };
  const nextHistory = [enriched, ...existing].slice(0, 50);
  await chrome.storage.local.set({ [THREAT_HISTORY_KEY]: nextHistory });
  return enriched;
}

async function persistForensicReport(report) {
  if (!chrome.storage?.local) return report;
  const stored = await chrome.storage.local.get(FORENSIC_REPORTS_KEY);
  const existing = Array.isArray(stored?.[FORENSIC_REPORTS_KEY]) ? stored[FORENSIC_REPORTS_KEY] : [];
  const next = [report, ...existing].slice(0, 100);
  await chrome.storage.local.set({ [FORENSIC_REPORTS_KEY]: next });
  return report;
}

async function persistForensicReportIfMissing(report) {
  if (!chrome.storage?.local) return report;
  const requestId = report?.PaladinShield_Forensic_Report?.requestId;
  if (!requestId) {
    return persistForensicReport(report);
  }

  const stored = await chrome.storage.local.get(FORENSIC_REPORTS_KEY);
  const existing = Array.isArray(stored?.[FORENSIC_REPORTS_KEY]) ? stored[FORENSIC_REPORTS_KEY] : [];
  const alreadyExists = existing.some(
    (item) => item?.PaladinShield_Forensic_Report?.requestId && item.PaladinShield_Forensic_Report.requestId === requestId
  );
  if (alreadyExists) return report;

  const next = [report, ...existing].slice(0, 100);
  await chrome.storage.local.set({ [FORENSIC_REPORTS_KEY]: next });
  return report;
}

async function createForensicReport(signatureIntent, analysisResult) {
  const requestId = signatureIntent?.requestId || crypto.randomUUID();
  const timestamp = new Date().toISOString();
  const semanticAnalysis = {
    riesgo: analysisResult?.riesgo || "Desconocido",
    accion: analysisResult?.accion || "Advertir",
    mensaje: analysisResult?.mensaje || "Sin mensaje",
  };
  const innerBase = {
    requestId,
    timestamp,
    maliciousPayload: signatureIntent,
    semanticAnalysis,
  };
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

async function openVerdictUi() {
  const popupUrl = chrome.runtime.getURL(POPUP_PATH);
  try {
    const popupWindows = await chrome.windows.getAll({
      populate: true,
      windowTypes: ["popup"],
    });

    const existing = popupWindows.find((win) =>
      (win.tabs || []).some((tab) => tab.url === popupUrl)
    );

    if (existing) {
      activePopupWindowId = existing.id ?? null;
      await chrome.windows.update(existing.id, { focused: true });
      return;
    }

    const created = await chrome.windows.create({
      url: popupUrl,
      type: "popup",
      focused: true,
      width: 420,
      height: 680,
    });
    activePopupWindowId = created?.id ?? null;
  } catch (error) {
    console.warn("🛡️ ENFORCEMENT: Popup fallback to tab.");
    await chrome.tabs.create({
      url: popupUrl,
      active: true,
    });
  }
}

async function openEvidenceDashboard() {
  const dashboardUrl = chrome.runtime.getURL("ui/evidence.html");
  await chrome.tabs.create({
    url: dashboardUrl,
    active: true,
  });
}

async function broadcastAnalysisUpdate(payload) {
  try {
    await chrome.runtime.sendMessage({
      type: "CLEAR_SIGN_AI_ANALYSIS_UPDATE",
      payload,
    });
  } catch (_) {
    // No listeners activos, continuar sin fallar.
  }
}

async function dispatchSignatureDecision(requestId, decision, reason = "") {
  const pending = pendingSignatureRequests.get(requestId);
  if (!pending) {
    return;
  }

  const payload = {
    requestId,
    decision,
    reason,
    timestamp: new Date().toISOString(),
  };

  try {
    if (!pending.tabId) {
      throw new Error("Missing sender tabId for decision dispatch.");
    }
    await chrome.tabs.sendMessage(pending.tabId, {
      type: DECISION_TO_CONTENT_CHANNEL,
      payload,
    });
  } catch (error) {
    console.warn("🛡️ ENFORCEMENT: Could not dispatch decision to content script.");
  } finally {
    pendingSignatureRequests.delete(requestId);
    await setIdleStateIfNoPending();
  }
}

async function blockPendingRequestsOnPopupClose() {
  const pendingIds = Array.from(pendingSignatureRequests.keys());
  await Promise.all(
    pendingIds.map((requestId) =>
      dispatchSignatureDecision(
        requestId,
        "block",
        "Popup cerrado sin autorizacion. Politica Default-Deny: firma rechazada."
      )
    )
  );
}

if (chrome.windows?.onRemoved) {
  chrome.windows.onRemoved.addListener((windowId) => {
    if (!activePopupWindowId || windowId !== activePopupWindowId) return;
    activePopupWindowId = null;
    blockPendingRequestsOnPopupClose().catch((error) => {
      console.warn("🛡️ ENFORCEMENT: Default-deny close handler error.");
    });
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) {
    return false;
  }

  if (message.type === GET_CURRENT_STATE_TYPE) {
    const state = currentState ?? createIdleState();
    sendResponse({ ok: true, state });
    return true;
  }

  if (message.type === ANALYSIS_CHANNEL || message.type === MESSAGE_ANALYSIS_CHANNEL) {
    (async () => {
      const signatureIntent = message.payload || {};
      const isMessageIntent = message.type === MESSAGE_ANALYSIS_CHANNEL;
      console.log(
        isMessageIntent
          ? "🛡️ REL wake: signMessage intercepted — gate activo."
          : "🛡️ REL wake: SIGNATURE_INTENT recibido — service worker activo."
      );
      const requestId = signatureIntent.requestId || crypto.randomUUID();
      signatureIntent.requestId = requestId;
      pendingSignatureRequests.set(requestId, {
        tabId: sender?.tab?.id ?? null,
        createdAt: Date.now(),
      });

      const analyzingState = {
        requestId,
        stage: "analyzing",
        pendingApproval: true,
        intentType: isMessageIntent ? "message_signature" : "transaction_signature",
        receivedAt: new Date().toISOString(),
        senderTabId: sender?.tab?.id ?? null,
        signatureIntent,
      };

      await persistAnalysisState(analyzingState);
      await broadcastAnalysisUpdate(analyzingState);
      if (isMessageIntent) {
        console.log("🛡️ ENFORCEMENT: Refresh signal emitted for MESSAGE_SIGNATURE_INTENT.");
      }
      await openVerdictUi();
      await broadcastAnalysisUpdate(analyzingState);

      const analysisResult = await callAiAnalysisEngine(signatureIntent);
      const shouldAutoBlock = isCriticalRisk(analysisResult);
      const completedState = {
        ...analyzingState,
        stage: "completed",
        pendingApproval: true,
        completedAt: new Date().toISOString(),
        analysisResult,
      };

      if (shouldAutoBlock) {
        const forensicReport = await createForensicReport(signatureIntent, analysisResult);
        await persistForensicReport(forensicReport);
        completedState.forensicReport = forensicReport;
        console.log("🛡️ PaladinShield: Execution Blocked. Funds Secured.");
        console.log("📁 ENFORCEMENT REPORT:", forensicReport);
      }

      await persistAnalysisState(completedState);
      await broadcastAnalysisUpdate(completedState);

      sendResponse({ ok: true, requestId, stage: "completed" });
    })().catch(async (error) => {
      console.warn("🛡️ ENFORCEMENT: Runtime analysis error.");
      const failureState = {
        stage: "failed",
        failedAt: new Date().toISOString(),
        error: error?.message || String(error),
      };

      await persistAnalysisState(failureState);
      await broadcastAnalysisUpdate(failureState);
      sendResponse({ ok: false, error: failureState.error });
    });

    return true;
  }

  if (message.type === USER_DECISION_CHANNEL) {
    (async () => {
      const latest = await readLatestAnalysisState();
      const requestId =
        message.requestId || message.state?.requestId || latest?.requestId || latest?.signatureIntent?.requestId;
      const rawDecision = (message.decision || "").toString().toLowerCase();
      const decision = rawDecision === "approve" ? "approve" : "block";
      const reason =
        message.reason ||
        (decision === "approve"
          ? "Usuario aprobo la operacion en PaladinShield."
          : "Usuario bloqueo la operacion desde PaladinShield.");

      if (!requestId) {
        throw new Error("No existe requestId para aplicar decision del usuario.");
      }

      if (decision === "block") {
        const sourceIntent = message.state?.signatureIntent || latest?.signatureIntent || null;
        const sourceAnalysis = message.state?.analysisResult || latest?.analysisResult || null;
        if (sourceIntent && !sourceIntent.requestId) {
          sourceIntent.requestId = requestId;
        }

        if (sourceIntent) {
        const forensicReport = await createForensicReport(
          sourceIntent,
          sourceAnalysis || {
            riesgo: "Alto",
            accion: "Bloquear",
            mensaje: "Bloqueado por decision explicita del usuario.",
          }
        );
        await persistForensicReport(forensicReport);
        console.log("🛡️ PaladinShield: Execution Blocked. Funds Secured.");
        console.log("📁 ENFORCEMENT REPORT:", forensicReport);
        } else {
          console.warn("🛡️ ENFORCEMENT: Block decision received without signature intent context.");
        }
      }

      await dispatchSignatureDecision(requestId, decision, reason);
      sendResponse({ ok: true, requestId, decision });
    })().catch((error) => {
      sendResponse({ ok: false, error: error?.message || String(error) });
    });

    return true;
  }

  if (message.type === THREAT_REPORT_CHANNEL) {
    (async () => {
      const reportPayload = message.state ? message : { state: message.payload || message };
      const savedReport = await persistThreatReport(reportPayload);
      const threatState = reportPayload?.state || null;
      const signatureIntent = threatState?.signatureIntent || null;
      if (signatureIntent) {
        const forensicReport = await createForensicReport(
          signatureIntent,
          threatState?.analysisResult || {
            riesgo: "Alto",
            accion: "Bloquear",
            mensaje: "Bloqueado por reporte de amenaza en PaladinShield.",
          }
        );
        await persistForensicReportIfMissing(forensicReport);
      }
      await openEvidenceDashboard();
      sendResponse({ ok: true, reportId: savedReport.reportId });
    })().catch((error) => {
      sendResponse({ ok: false, error: error?.message || String(error) });
    });

    return true;
  }

  return false;
});

ensureRelBootState().catch(() => {});
