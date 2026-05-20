const STATE_STORAGE_KEY = "clearsignai:last-analysis-state";
const UPDATE_EVENT_TYPE = "CLEAR_SIGN_AI_ANALYSIS_UPDATE";
const GET_CURRENT_STATE_TYPE = "GET_CURRENT_STATE";
const USER_DECISION_CHANNEL = "CLEAR_SIGN_AI_USER_DECISION";
const THREAT_REPORT_CHANNEL = "CLEAR_SIGN_AI_THREAT_REPORT";
const EXECUTION_GUARDRAIL_MS = 2000;

const riskTitle = document.getElementById("risk-title");
const riskMessage = document.getElementById("risk-message");
const riskAction = document.getElementById("risk-action");
const riskMethod = document.getElementById("risk-method");
const attackIntent = document.getElementById("intent-attack");
const defenseIntent = document.getElementById("intent-defense");
const semanticPulse = document.getElementById("semantic-pulse");
const semanticPulseText = document.getElementById("semantic-pulse-text");
const semanticLed = document.getElementById("semantic-led");
const liveAlertBadge = document.getElementById("live-alert-badge");
const policyLockBadge = document.getElementById("policy-lock-badge");
const acknowledgeButton = document.getElementById("btn-ack");
const blockButton = document.getElementById("btn-block");
const buttonRow = document.querySelector(".button-row");

let lastKnownState = null;
let pendingRequestStartedAt = 0;
let alertLockActive = false;

function createRelActiveFallbackState() {
  return {
    stage: "idle",
    pendingApproval: false,
    updatedAt: new Date().toISOString(),
    status: "rel_active",
    relHeadline: "REL ACTIVE",
    semanticReady: true,
  };
}

function getBodyClassByRisk(risk) {
  if (risk === "Sentinel") return "risk-sentinel";
  if (risk === "Alto") return "risk-alto";
  if (risk === "Medio") return "risk-medio";
  if (risk === "Bajo") return "risk-bajo";
  return "risk-loading";
}

function isPolicyHardBlocked(state) {
  if (state?.enforcementLocked) return true;
  const analysis = state?.analysisResult || {};
  const risk = analysis?.riesgo || "";
  const action = analysis?.accion || "";
  return risk === "Alto" || action === "Bloquear";
}

function hasActivePendingRequest(state) {
  if (!state) return false;
  if (typeof state?.pendingApproval === "boolean") return state.pendingApproval;
  const hasRequestId = Boolean(state?.requestId || state?.signatureIntent?.requestId);
  const stageIndicatesLiveFlow = state?.stage === "analyzing";
  return hasRequestId && stageIndicatesLiveFlow;
}

function buildSentinelState(state) {
  const semanticReady = state?.semanticReady !== false;
  return {
    risk: "Sentinel",
    title: state?.relHeadline || "REL ACTIVE",
    message: semanticReady
      ? "Motor semántico listo (OpenAI gpt-4o-mini). Sin solicitud de firma en cola; al interceptar un intent, REL consulta y muestra veredicto en tiempo real."
      : "Runtime enforcement activo sin solicitud pendiente.",
    attackIntent: "Sin intent de firma en cola.",
    defenseIntent:
      "Promise gating activo: signTransaction, signAllTransactions y signMessage quedan bloqueados hasta el veredicto y la decisión explícita.",
    action: "Esperar",
    method: "-",
    analyzing: false,
    sentinel: true,
  };
}

function normalizeUiModel(state) {
  const hardBlocked = isPolicyHardBlocked(state);

  if (!hasActivePendingRequest(state) && !hardBlocked) {
    return buildSentinelState(state);
  }

  const stage = state?.stage || "analyzing";
  const analysis = state?.analysisResult || {};
  const risk = analysis?.riesgo || null;
  const action = analysis?.accion || "Advertir";
  const method = state?.signatureIntent?.method || "-";

  if (stage === "failed") {
    return {
      risk: "Alto",
      title: "ERROR",
      message: state?.error || "Fallo durante la evaluacion de politica REL.",
      attackIntent: "La solicitud no pudo validarse de forma segura.",
      defenseIntent:
        "PaladinShield esta BLOQUEANDO fisicamente la firma y DETENIENDO el acceso a tus fondos hasta validacion segura.",
      action: "Bloquear",
      method,
      analyzing: false,
      sentinel: false,
      hardBlocked: true,
    };
  }

  if (stage !== "completed") {
    return {
      risk: null,
      title: "EVALUANDO",
      message: "Motor semantico: clasificando riesgo y veredicto de politica ante la firma.",
      attackIntent: "Se reconstruye el intent tecnico del proveedor ante la llamada interceptada.",
      defenseIntent:
        "REL activo: la Promesa de firma no puede completarse mientras corre la evaluacion bajo default-deny.",
      action: "Esperar",
      method,
      analyzing: true,
      sentinel: false,
    };
  }

  const parsedIntents = splitIntentMessage(analysis?.mensaje || "");

  return {
    risk,
    title: hardBlocked ? "BLOQUEADO" : (risk || "DESCONOCIDO").toUpperCase(),
    message: analysis?.mensaje || "Sin veredicto semantico aun.",
    attackIntent: parsedIntents.attackIntent,
    defenseIntent: hardBlocked
      ? "REL default-deny: veredicto critico — la Promesa de firma fue rechazada sin override."
      : parsedIntents.defenseIntent,
    action,
    method,
    analyzing: false,
    sentinel: false,
    hardBlocked,
  };
}

function splitIntentMessage(message) {
  const clean = (message || "").toString().replace(/\s+/g, " ").trim();
  const actionMatch = clean.match(/Accion:\s*([^.]*)/i);
  const analysisMatch = clean.match(/Analisis:\s*(.*)$/i);

  const attackIntent = actionMatch?.[1]?.trim() || clean || "Intento no clasificado.";
  const defenseIntent =
    analysisMatch?.[1]?.trim() ||
    "PaladinShield esta BLOQUEANDO fisicamente la firma y DETENIENDO el acceso a tus fondos hasta decision segura.";

  return { attackIntent, defenseIntent };
}

function renderState(state) {
  if (state?.stage === "idle" || state?.pendingApproval === false) {
    alertLockActive = false;
  }

  const incomingPending = hasActivePendingRequest(state);
  if (incomingPending) {
    alertLockActive = true;
  }

  const isTransientEmptyState = !state;
  if (isTransientEmptyState && alertLockActive && !incomingPending && hasActivePendingRequest(lastKnownState)) {
    console.log("[UI Flow] Manteniendo alerta: firma pendiente detectada");
    state = lastKnownState;
  }

  lastKnownState = state;
  const ui = normalizeUiModel(state);

  document.body.classList.remove("risk-alto", "risk-medio", "risk-bajo", "risk-loading");
  document.body.classList.add(getBodyClassByRisk(ui.risk));

  riskTitle.textContent = ui.title;
  riskMessage.textContent = ui.message;
  riskAction.textContent = ui.action;
  riskMethod.textContent = ui.method;
  attackIntent.textContent = ui.attackIntent;
  defenseIntent.textContent = ui.defenseIntent;

  semanticPulse.style.display = ui.analyzing || ui.sentinel ? "inline-flex" : "none";
  semanticPulseText.textContent = ui.analyzing
    ? "POLICY ENGINE: evaluando intent de firma (default-deny)…"
    : ui.sentinel
      ? "SEMANTIC ENGINE READY — OpenAI (gpt-4o-mini), clave embebida demo"
      : "REL estable: vigilancia runtime sin solicitud activa.";
  semanticLed.classList.toggle("steady", ui.sentinel && !ui.analyzing);
  buttonRow.style.display = ui.sentinel ? "none" : "flex";
  liveAlertBadge.style.display = ui.sentinel ? "none" : "inline-block";
  policyLockBadge.style.display =
    (alertLockActive && !ui.sentinel) || ui.hardBlocked ? "inline-block" : "none";

  const hasPendingRequest = hasActivePendingRequest(state);
  const hardBlocked = isPolicyHardBlocked(state);
  if (hasPendingRequest && pendingRequestStartedAt === 0) {
    pendingRequestStartedAt = Date.now();
  }
  if (!hasPendingRequest) {
    pendingRequestStartedAt = 0;
  }

  const guardrailActive =
    hasPendingRequest && !hardBlocked && Date.now() - pendingRequestStartedAt < EXECUTION_GUARDRAIL_MS;
  acknowledgeButton.disabled = !hasPendingRequest || guardrailActive || hardBlocked;
  acknowledgeButton.textContent = hardBlocked ? "BLOQUEADO POR POLITICA" : "CONFIAR";
  blockButton.disabled = !hasPendingRequest && !hardBlocked;

  if (guardrailActive) {
    const remainingMs = EXECUTION_GUARDRAIL_MS - (Date.now() - pendingRequestStartedAt);
    setTimeout(() => {
      if (lastKnownState === state) {
        renderState(lastKnownState);
      }
    }, remainingMs + 10);
  }
}

async function loadInitialState() {
  const fallback = createRelActiveFallbackState();

  if (!chrome.runtime?.sendMessage) {
    renderState(fallback);
    return;
  }

  try {
    const response = await chrome.runtime.sendMessage({
      type: GET_CURRENT_STATE_TYPE,
    });
    console.log("Recibiendo estado:", response);

    let state =
      response &&
      typeof response === "object" &&
      response.state !== undefined &&
      response.state !== null
        ? response.state
        : undefined;

    if (state === undefined || state === null) {
      state = fallback;
    }

    console.log("Popup State:", state);
    renderState(state);
    return;
  } catch (error) {
    console.warn("[PaladinShield popup] GET_CURRENT_STATE falló:", error);
  }

  if (!chrome.storage?.local) {
    console.log("Recibiendo estado:", undefined);
    renderState(fallback);
    return;
  }

  const stored = await chrome.storage.local.get(STATE_STORAGE_KEY);
  const fromDisk = stored?.[STATE_STORAGE_KEY];
  const state =
    fromDisk !== undefined && fromDisk !== null ? fromDisk : fallback;

  console.log("Recibiendo estado:", { ok: true, state, source: "storage" });
  console.log("Popup State:", state);
  renderState(state);
}

function attachRuntimeListener() {
  if (!chrome.runtime?.onMessage) return;

  chrome.runtime.onMessage.addListener((message) => {
    if (!message || message.type !== UPDATE_EVENT_TYPE) return;
    renderState(message.payload || null);
  });
}

function attachStorageStateListener() {
  if (!chrome.storage?.onChanged) return;
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") return;
    if (!changes[STATE_STORAGE_KEY]) return;
    const nextState = changes[STATE_STORAGE_KEY].newValue || null;
    console.log("Popup State:", nextState);
    renderState(nextState);
  });
}

function attachHeartbeat() {
  if (!chrome.storage?.local) return;
  setInterval(async () => {
    const stored = await chrome.storage.local.get(STATE_STORAGE_KEY);
    const state = stored?.[STATE_STORAGE_KEY] || null;
    if (hasActivePendingRequest(state)) {
      console.log("[UI Flow] Manteniendo alerta: firma pendiente detectada");
      alertLockActive = true;
      renderState(state);
    }
  }, 500);
}

function attachButtonHandlers() {
  acknowledgeButton.addEventListener("click", async () => {
    const requestId = lastKnownState?.requestId || lastKnownState?.signatureIntent?.requestId;
    if (!requestId || !chrome.runtime?.sendMessage) {
      window.close();
      return;
    }

    try {
      alertLockActive = false;
      const response = await chrome.runtime.sendMessage({
        type: USER_DECISION_CHANNEL,
        decision: "approve",
        requestId,
        state: lastKnownState,
      });
      if (response?.ok) {
        window.close();
      } else {
        console.warn("[PaladinShield popup] CONFIAR no entregado:", response?.error);
        acknowledgeButton.textContent = "REINTENTAR CONFIAR";
      }
    } catch (error) {
      console.warn("[PaladinShield popup] CONFIAR fallo:", error);
      acknowledgeButton.textContent = "REINTENTAR CONFIAR";
    }
  });

  blockButton.addEventListener("click", async () => {
    const requestId = lastKnownState?.requestId || lastKnownState?.signatureIntent?.requestId;
    const reportPayload = {
      type: THREAT_REPORT_CHANNEL,
      createdAt: new Date().toISOString(),
      state: lastKnownState,
    };

    try {
      if (chrome.runtime?.sendMessage) {
        if (requestId) {
          alertLockActive = false;
          await chrome.runtime.sendMessage({
            type: USER_DECISION_CHANNEL,
            decision: "block",
            requestId,
            state: lastKnownState,
          });
        }
        await chrome.runtime.sendMessage(reportPayload);
      }
    } catch (_) {
      // Si no hay receptor, igual permitimos copia del reporte.
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(reportPayload, null, 2));
      blockButton.textContent = "Bloqueado y Reportado";
      setTimeout(() => {
        blockButton.textContent = "BLOQUEAR";
      }, 1500);
    } catch (_) {
      blockButton.textContent = "Bloqueado";
      setTimeout(() => {
        blockButton.textContent = "BLOQUEAR";
      }, 1500);
    }
  });
}

attachRuntimeListener();
attachStorageStateListener();
attachHeartbeat();
attachButtonHandlers();
loadInitialState();

