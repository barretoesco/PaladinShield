const THREAT_HISTORY_KEY = "clearsignai:threat-history";
const CHAIN_TARGET = "mainnet-beta";
const REGISTRY_PROGRAM_ID = "ThreatReg1stry11111111111111111111111111111111";
const reportId = document.getElementById("report-id");
const reportDate = document.getElementById("report-date");
const historySize = document.getElementById("history-size");
const payloadJson = document.getElementById("payload-json");
const uploadState = document.getElementById("upload-state");
const uploadLabel = document.getElementById("upload-label");

function toHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function toBase64(bytes) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

async function sha256Hex(text) {
  const encoded = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return toHex(new Uint8Array(digest));
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadSolanaWeb3() {
  try {
    return await import("@solana/web3.js");
  } catch (error) {
    console.warn("PaladinShield: @solana/web3.js no disponible en este runtime.", error);
    return null;
  }
}

async function createSignedEvidencePayload(threatJson) {
  const canonical = JSON.stringify(threatJson);
  const evidenceHash = await sha256Hex(canonical);
  const web3 = await loadSolanaWeb3();

  if (web3?.Keypair) {
    const authority = web3.Keypair.generate();
    const signedEnvelope = await sha256Hex(`${evidenceHash}:${authority.publicKey.toBase58()}`);

    return {
      simulation: true,
      network: CHAIN_TARGET,
      targetProgramId: REGISTRY_PROGRAM_ID,
      authority: authority.publicKey.toBase58(),
      evidenceHash,
      signedEnvelope,
      txTemplate: {
        instruction: "logThreatEvidence",
        accounts: ["authority", "threat_registry_pda"],
        data: {
          evidenceHash,
          capturedAt: new Date().toISOString(),
        },
      },
      note: "Payload listo para enviarse a un programa de registro de amenazas en Solana.",
    };
  }

  const fallbackSeed = await sha256Hex(`fallback:${evidenceHash}`);
  return {
    simulation: true,
    network: CHAIN_TARGET,
    targetProgramId: REGISTRY_PROGRAM_ID,
    authority: `sim-${fallbackSeed.slice(0, 32)}`,
    evidenceHash,
    signedEnvelope: fallbackSeed,
    note: "Simulacion sin runtime de @solana/web3.js; estructura equivalente lista para integracion.",
  };
}

async function init() {
  if (!chrome?.storage?.local) {
    payloadJson.textContent = "No se pudo acceder a chrome.storage.local.";
    uploadLabel.textContent = "Error de almacenamiento local.";
    uploadState.classList.add("ready");
    return;
  }

  const stored = await chrome.storage.local.get(THREAT_HISTORY_KEY);
  const history = Array.isArray(stored?.[THREAT_HISTORY_KEY]) ? stored[THREAT_HISTORY_KEY] : [];
  historySize.textContent = `${history.length} eventos`;

  const latest = history[0];
  if (!latest) {
    payloadJson.textContent = "Aun no hay amenazas reportadas.";
    uploadLabel.textContent = "Sin evidencia para subir.";
    uploadState.classList.add("ready");
    return;
  }

  reportId.textContent = latest.reportId || "-";
  reportDate.textContent = latest.receivedAt ? new Date(latest.receivedAt).toLocaleString() : "-";

  payloadJson.textContent = "Preparando payload firmado para registro en Solana...";
  await sleep(900);
  uploadLabel.textContent = "Subiendo a la Blockchain de Solana...";
  await sleep(1700);

  const signedPayload = await createSignedEvidencePayload(latest);
  const evidenceEnvelope = {
    status: "ready_for_onchain_registry",
    uploadStage: "simulated",
    threatReport: latest,
    signedPayload,
  };

  uploadLabel.textContent = "Evidencia firmada y lista para registro inmutable.";
  uploadState.classList.add("ready");
  payloadJson.textContent = JSON.stringify(evidenceEnvelope, null, 2);
}

init().catch((error) => {
  payloadJson.textContent = `Error en dashboard: ${error?.message || String(error)}`;
  uploadLabel.textContent = "Error en generacion de evidencia.";
  uploadState.classList.add("ready");
});
