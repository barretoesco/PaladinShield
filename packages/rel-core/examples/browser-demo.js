/**
 * Browser REL demo — scenarios A–D (aligned with wallet-shell.mjs).
 * Serve from repo root: npx serve . -p 3456
 * Open: /packages/rel-core/examples/browser-demo.html
 */
import { createRelGate, evaluateIntent, buildForensicReport } from "../src/index.js";

const MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";

/** @type {HTMLPreElement|null} */
let logEl = null;
/** @type {HTMLButtonElement|null} */
let runBtn = null;

/** @param {string} line */
function log(line) {
  if (!logEl) return;
  logEl.textContent += `${line}\n`;
  logEl.scrollTop = logEl.scrollHeight;
}

/**
 * @param {{ logEl: HTMLPreElement, runBtn: HTMLButtonElement }} ui
 */
export function initBrowserDemo(ui) {
  logEl = ui.logEl;
  runBtn = ui.runBtn;
  runBtn.addEventListener("click", () => {
    runBtn.disabled = true;
    runDemo()
      .catch((err) => log(`Fatal: ${err.message}`))
      .finally(() => {
        runBtn.disabled = false;
      });
  });
}

function createMockProvider() {
  return {
    async signMessage(bytes) {
      return { signed: true, bytes: bytes.byteLength };
    },
    async signTransaction(tx) {
      return { signed: true, payload: tx };
    },
    async signAndSendTransaction(tx) {
      return { signed: true, signature: "mock-signature" };
    },
  };
}

function attachGate(provider, config) {
  const runGate = createRelGate({
    origin: config.origin,
    hardBlockOnCritical: true,
    evaluateIntent: (intent) => evaluateIntent(intent),
    requestUserDecision: async ({ verdict }) => {
      log(`[UI] ${verdict.riesgo}/${verdict.accion}`);
      return config.decision;
    },
    onBlocked: (_intent, verdict) => {
      log(`[onBlocked] ${verdict.riesgo}/${verdict.accion}`);
    },
  });

  const bindGate = (method) => {
    const original = provider[method].bind(provider);
    provider[method] = (...args) => runGate(method, args, original, config.origin);
  };

  bindGate("signMessage");
  bindGate("signTransaction");
  bindGate("signAndSendTransaction");

  return provider;
}

function buildHostileSignAndSendTx() {
  const auditText = "AUDIT_TEST_MALICIOUS_SIGN_AND_SEND";
  return {
    metadata: { audit: auditText },
    instructions: [
      {
        programId: MEMO_PROGRAM_ID,
        data: new Uint8Array([...new TextEncoder().encode(auditText)]),
        keys: [],
      },
    ],
  };
}

async function runDemo() {
  if (!logEl) return;
  logEl.textContent = "";
  log("PaladinShield REL — browser demo (Phase 3 SDK)\n");

  log("--- Escenario A (Hostil signMessage) ---");
  const hostile = attachGate(createMockProvider(), {
    origin: "https://drainer-domain.evil",
    decision: "approve",
  });
  try {
    await hostile.signMessage(
      new TextEncoder().encode("AUDIT_TEST_MALICIOUS_SIGN target drainer-domain")
    );
    log("[A] ERROR — debio bloquearse");
  } catch (e) {
    log(`[A] HARD-BLOCK (sin UI) — ${e.message.slice(0, 80)}…`);
  }

  log("\n--- Escenario B (Benigno faucet) ---");
  const benign = attachGate(createMockProvider(), {
    origin: "https://spl-token-faucet.com",
    decision: "approve",
  });
  const tx = {
    instructions: [{ programId: "11111111111111111111111111111111", keys: [] }],
  };
  const signed = await benign.signTransaction(tx);
  log(`[B] FIRMA AUTORIZADA — ${JSON.stringify(signed)}`);

  log("\n--- Escenario C (Medio — operador bloquea) ---");
  const medium = attachGate(createMockProvider(), {
    origin: "https://app.example.com",
    decision: "block",
  });
  try {
    await medium.signMessage(
      new TextEncoder().encode("Routine account note for Tuesday standup.")
    );
    log("[C] ERROR — debio rechazarse");
  } catch (e) {
    log(`[C] RECHAZADA POR OPERADOR — ${e.message.slice(0, 60)}…`);
  }

  log("\n--- Escenario D (signAndSendTransaction hostil) ---");
  const hostileSend = attachGate(createMockProvider(), {
    origin: "https://drainer-domain.evil",
    decision: "approve",
  });
  const auditTx = buildHostileSignAndSendTx();
  try {
    await hostileSend.signAndSendTransaction(auditTx);
    log("[D] ERROR — debio bloquearse");
  } catch (e) {
    const verdict = await evaluateIntent({
      method: "signAndSendTransaction",
      origin: "https://drainer-domain.evil",
      transactions: [auditTx],
    });
    const report = await buildForensicReport({
      requestId: "browser-demo-scenario-d",
      maliciousPayload: { method: "signAndSendTransaction", transactions: [auditTx] },
      semanticAnalysis: verdict,
    });
    const hash = report.PaladinShield_Forensic_Report.paladinForensicHash;
    log(`[D] HARD-BLOCK (sin UI) — ${e.message.slice(0, 60)}…`);
    log(`[D] Forensic hash: ${hash.slice(0, 16)}…`);
  }

  log("\nDemo completa — escenarios A–D.");
}
