/**
 * Paladin REL Integration Lab — signing surface simulator (not a wallet product).
 * dApp panel + simulated signing surface with operator UI, decision tokens, real web3.js txs.
 *
 * Serve from repo root: npm run demo:wallet-lab
 */
import {
  wrapSolanaProviderWithTokens,
  evaluateIntent,
  isCriticalVerdict,
  buildForensicReport,
  simulateSpoofApprove,
} from "../src/index.js";
import {
  buildBenignWeb3Transaction,
  buildHostileWeb3SignAndSendTransaction,
  summarizeWeb3Transaction,
} from "./solana-fixtures.js";

/** @type {HTMLPreElement|null} */
let dappLogEl = null;
/** @type {HTMLDivElement|null} */
let walletPanelEl = null;
/** @type {HTMLSelectElement|null} */
let modeSelectEl = null;
/** @type {((approved: boolean) => void)|null} */
let pendingApproval = null;

/** @param {HTMLPreElement} el @param {string} line */
function logDapp(el, line) {
  el.textContent += `${line}\n`;
  el.scrollTop = el.scrollHeight;
}

function createNativeWallet() {
  return {
    isPaladinWalletLab: true,
    publicKey: { toBase58: () => "11111111111111111111111111111112" },
    async signMessage(message) {
      return { signed: true, method: "signMessage", bytes: message.byteLength };
    },
    async signTransaction(tx) {
      const summary = tx?.instructions ? summarizeWeb3Transaction(tx) : { instructionCount: 0 };
      return { signed: true, method: "signTransaction", ...summary };
    },
    async signAllTransactions(txs) {
      return { signed: true, method: "signAllTransactions", count: txs.length };
    },
    async signAndSendTransaction(tx) {
      const summary = tx?.instructions ? summarizeWeb3Transaction(tx) : { instructionCount: 0 };
      return { signed: true, method: "signAndSendTransaction", signature: "lab-mock-sig", ...summary };
    },
  };
}

/**
 * @param {{ dappLog: HTMLPreElement, walletPanel: HTMLDivElement, modeSelect: HTMLSelectElement }} ui
 */
export function initWalletLab(ui) {
  dappLogEl = ui.dappLog;
  walletPanelEl = ui.walletPanel;
  modeSelectEl = ui.modeSelect;

  const nativeWallet = createNativeWallet();
  const dappOrigin = "https://spl-token-faucet.com";

  const relWallet = wrapSolanaProviderWithTokens(nativeWallet, {
    origin: dappOrigin,
    resolveMode: () => (modeSelectEl?.value === "shadow" ? "shadow" : "enforce"),
    hardBlockOnCritical: true,
    evaluateIntent: (intent) => evaluateIntent(intent),
    requestOperatorApproval: async (ctx) => showOperatorPrompt(ctx),
    onShadowVerdict: (intent, verdict) => {
      if (!dappLogEl) return;
      logDapp(dappLogEl, `[SHADOW] ${verdict.riesgo}/${verdict.accion} — ${intent.method}`);
      renderWalletIdle(`Shadow log: ${verdict.riesgo}/${verdict.accion}`);
    },
    onBlocked: async (intent, verdict) => {
      if (!dappLogEl) return;
      logDapp(dappLogEl, `[BLOCKED] ${verdict.riesgo}/${verdict.accion}`);
      if (isCriticalVerdict(verdict)) {
        const report = await buildForensicReport({
          requestId: intent.requestId || "integration-lab",
          maliciousPayload: intent,
          semanticAnalysis: verdict,
        });
        const hash = report.PaladinShield_Forensic_Report.paladinForensicHash;
        logDapp(dappLogEl, `[FORENSIC] ${String(hash).slice(0, 16)}…`);
      }
    },
  });

  window.solana = relWallet;
  renderWalletIdle("Simulated signing surface ready — waiting for dApp request.");
  logDapp(
    dappLogEl,
    "REL Integration Lab — middleware embed demo (not a wallet product).\nDecision tokens + @solana/web3.js transactions enabled.\n"
  );

  document.querySelectorAll("[data-dapp-action]").forEach((button) => {
    button.addEventListener("click", () => runDappAction(button.getAttribute("data-dapp-action"), relWallet));
  });
}

/**
 * @param {import('../src/types.js').SignatureIntent} intent
 * @param {import('../src/types.js').PolicyVerdict} verdict
 * @param {string} requestId
 * @param {string} decisionToken
 * @param {import('../src/decision-token.js').createDecisionTokenRegistry extends () => infer R ? R : never} registry
 */
async function showOperatorPrompt({ intent, verdict, requestId, decisionToken, registry }) {
  if (!walletPanelEl) return false;

  const programLine =
    Array.isArray(intent.programIds) && intent.programIds.length
      ? intent.programIds.join(", ")
      : intent.messageText?.slice(0, 80) || "(no summary)";

  const tokenPreview = `${decisionToken.slice(0, 8)}…${decisionToken.slice(-4)}`;

  walletPanelEl.innerHTML = `
    <div class="wallet-card pending">
      <div class="badge ${verdict.riesgo.toLowerCase()}">${verdict.riesgo} / ${verdict.accion}</div>
      <h2>Sign request</h2>
      <p class="meta"><strong>Method:</strong> ${intent.method}<br/><strong>Origin:</strong> ${intent.origin || "unknown"}</p>
      <p class="summary">${escapeHtml(programLine)}</p>
      <p class="verdict">${escapeHtml(verdict.mensaje.slice(0, 220))}${verdict.mensaje.length > 220 ? "…" : ""}</p>
      <p class="meta">requestId: ${escapeHtml(requestId)}</p>
      <p class="token">decisionToken: <code>${escapeHtml(tokenPreview)}</code></p>
      <div class="actions stacked">
        <button type="button" id="lab-spoof" class="ghost">Simulate spoof attack</button>
        <div class="row">
          <button type="button" id="lab-deny" class="danger">Reject</button>
          <button type="button" id="lab-approve" class="primary">Approve</button>
        </div>
      </div>
    </div>
  `;

  return new Promise((resolve) => {
    pendingApproval = resolve;

    walletPanelEl.querySelector("#lab-spoof")?.addEventListener("click", () => {
      const spoofPassed = simulateSpoofApprove(registry, requestId);
      if (dappLogEl) {
        logDapp(dappLogEl, `[TOKEN] Spoof approve: ${spoofPassed ? "PASS (bad!)" : "BLOCKED"}`);
      }
      const statusEl = document.createElement("p");
      statusEl.className = "meta";
      statusEl.textContent = spoofPassed
        ? "Spoof passed — regression"
        : "Spoof blocked — token mismatch (expected)";
      walletPanelEl.querySelector(".wallet-card.pending")?.appendChild(statusEl);
    });

    walletPanelEl.querySelector("#lab-approve")?.addEventListener("click", () => finishApproval(true));
    walletPanelEl.querySelector("#lab-deny")?.addEventListener("click", () => finishApproval(false));
  });
}

/** @param {boolean} approved */
function finishApproval(approved) {
  pendingApproval?.(approved);
  pendingApproval = null;
  renderWalletIdle(
    approved ? "Approved — valid token released the Promise gate." : "Rejected — Promise denied."
  );
}

/** @param {string} message */
function renderWalletIdle(message) {
  if (!walletPanelEl) return;
  walletPanelEl.innerHTML = `
    <div class="wallet-card idle">
      <h2>REL Integration Lab</h2>
      <p>${escapeHtml(message)}</p>
      <p class="hint">Simulated signing surface — middleware demo, not a wallet product.</p>
    </div>
  `;
}

/** @param {string|null} action @param {Record<string, Function>} wallet */
async function runDappAction(action, wallet) {
  if (!dappLogEl) return;
  logDapp(dappLogEl, `\n--- dApp: ${action} ---`);

  try {
    if (action === "hostile-message") {
      await wallet.signMessage(
        new TextEncoder().encode("AUDIT_TEST_MALICIOUS_SIGN target drainer-domain")
      );
      logDapp(dappLogEl, "ERROR — should have been blocked");
      return;
    }

    if (action === "benign-faucet") {
      const { tx, source } = await buildBenignWeb3Transaction();
      const summary = summarizeWeb3Transaction(tx);
      logDapp(
        dappLogEl,
        `[${source}] programs=${summary.programIds.join(", ")} serialized=${summary.serializedBytes}B`
      );
      const out = await wallet.signTransaction(tx);
      logDapp(dappLogEl, `SUCCESS — ${JSON.stringify(out)}`);
      return;
    }

    if (action === "medium-message") {
      const out = await wallet.signMessage(
        new TextEncoder().encode("Routine account note for Tuesday standup.")
      );
      logDapp(dappLogEl, `SUCCESS — ${JSON.stringify(out)}`);
      return;
    }

    if (action === "hostile-send") {
      const { tx, source } = await buildHostileWeb3SignAndSendTransaction();
      const summary = summarizeWeb3Transaction(tx);
      logDapp(dappLogEl, `[${source}] programs=${summary.programIds.join(", ")}`);
      await wallet.signAndSendTransaction(tx);
      logDapp(dappLogEl, "ERROR — should have been blocked");
    }
  } catch (error) {
    logDapp(dappLogEl, `BLOCKED — ${error instanceof Error ? error.message.slice(0, 100) : String(error)}`);
  }
}

/** @param {string} text */
function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
