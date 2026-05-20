/**
 * Browser REL demo — same three scenarios as wallet-shell.mjs, UI in-page.
 * Serve: npx serve packages/rel-core/examples -p 3456 → browser-demo.html
 */
import { createRelGate, evaluateIntent } from "../src/index.js";

const logEl = document.getElementById("log");
const runBtn = document.getElementById("run-demo");

/** @param {string} line */
function log(line) {
  logEl.textContent += `${line}\n`;
  logEl.scrollTop = logEl.scrollHeight;
}

function createMockProvider() {
  return {
    async signMessage(bytes) {
      return { signed: true, bytes: bytes.byteLength };
    },
    async signTransaction(tx) {
      return { signed: true, payload: tx };
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

  return provider;
}

async function runDemo() {
  logEl.textContent = "";
  log("PaladinShield REL — browser demo (Phase 3 SDK)\n");

  // A — hostile
  log("--- Escenario A (Hostil) ---");
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

  // B — benign
  log("\n--- Escenario B (Benigno) ---");
  const benign = attachGate(createMockProvider(), {
    origin: "https://spl-token-faucet.com",
    decision: "approve",
  });
  const tx = {
    instructions: [{ programId: "11111111111111111111111111111111", keys: [] }],
  };
  const signed = await benign.signTransaction(tx);
  log(`[B] FIRMA AUTORIZADA — ${JSON.stringify(signed)}`);

  // C — medium, operator block
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

  log("\nDemo completa.");
}

runBtn.addEventListener("click", () => {
  runBtn.disabled = true;
  runDemo()
    .catch((err) => log(`Fatal: ${err.message}`))
    .finally(() => {
      runBtn.disabled = false;
    });
});
