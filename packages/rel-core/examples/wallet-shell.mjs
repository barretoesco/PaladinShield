/**
 * PaladinShield REL — wallet integration shell (Node 18+).
 *
 * Demonstrates embeddable Promise gating via createRelGate on a mock window.solana
 * provider. Not part of the MV3 extension demo — Phase 3 SDK reference only.
 *
 * Run: node packages/rel-core/examples/wallet-shell.mjs
 *
 * @module wallet-shell
 */

import { createRelGate, evaluateIntent } from "../src/index.js";

// ---------------------------------------------------------------------------
// Part 1 — Types & console helpers
// ---------------------------------------------------------------------------

/** @typedef {import('../src/types.js').PolicyVerdict} PolicyVerdict */
/** @typedef {import('../src/types.js').RelGateOptions} RelGateOptions */
/** @typedef {import('../src/types.js').SignatureIntent} SignatureIntent */

/** @typedef {'approve'|'block'} OperatorDecision */

const SYSTEM_PROGRAM_ID = "11111111111111111111111111111111";
const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

/**
 * @param {string} scenarioId
 * @param {PolicyVerdict|null} verdict
 * @param {string} result
 */
function logScenarioLine(scenarioId, verdict, result) {
  const verdictLabel = verdict ? `${verdict.riesgo}/${verdict.accion}` : "N/A";
  console.log(`[PALADIN-REL] Escenario ${scenarioId}: [${verdictLabel}] -> [${result}]`);
}

/**
 * @param {PolicyVerdict} verdict
 * @returns {string}
 */
function formatVerdictDetail(verdict) {
  return `${verdict.riesgo}/${verdict.accion} — ${verdict.mensaje}`;
}

// ---------------------------------------------------------------------------
// Part 2 — Mock window.solana wallet
// ---------------------------------------------------------------------------

/**
 * Minimal Phantom-shaped provider for REL integration demos.
 * @returns {{
 *   isPhantom: boolean,
 *   publicKey: { toBase58: () => string },
 *   signTransaction: (tx: unknown) => Promise<{ signed: true, method: string, payload: unknown }>,
 *   signAllTransactions: (txs: unknown[]) => Promise<{ signed: true, method: string, count: number }>,
 *   signMessage: (message: Uint8Array, display?: string) => Promise<{ signed: true, method: string, bytes: number }>,
 * }}
 */
function createMockSolanaProvider() {
  return {
    isPhantom: true,
    publicKey: { toBase58: () => "DemoWallet1111111111111111111111111111111111" },

    /** @param {unknown} tx */
    async signTransaction(tx) {
      return { signed: true, method: "signTransaction", payload: tx };
    },

    /** @param {unknown[]} txs */
    async signAllTransactions(txs) {
      return { signed: true, method: "signAllTransactions", count: txs.length };
    },

    /**
     * @param {Uint8Array} message
     * @param {string} [_display]
     */
    async signMessage(message, _display = "utf8") {
      return { signed: true, method: "signMessage", bytes: message.byteLength };
    },
  };
}

// ---------------------------------------------------------------------------
// Part 3 — createRelGate attachment (explicit primitive, not wrapSolanaProvider)
// ---------------------------------------------------------------------------

/**
 * Binds createRelGate to every signing method on a mock provider.
 * @param {ReturnType<typeof createMockSolanaProvider>} provider
 * @param {RelGateOptions & { origin?: string }} options
 */
function attachRelGateToProvider(provider, options) {
  const runGate = createRelGate(options);
  const origin = options.origin ?? "unknown";

  for (const method of /** @type {const} */ (["signTransaction", "signAllTransactions", "signMessage"])) {
    const original = provider[method].bind(provider);
    provider[method] = (...args) => runGate(method, args, original, origin);
  }

  return provider;
}

/**
 * Factory for REL + mock wallet with operator UI telemetry.
 * @param {object} config
 * @param {string} config.origin
 * @param {OperatorDecision} [config.operatorDecision='approve']
 * @param {string} [config.uiLabel='Wallet UI']
 */
function createRelWrappedWallet(config) {
  let uiInvoked = false;

  /** @type {RelGateOptions} */
  const relOptions = {
    origin: config.origin,
    hardBlockOnCritical: true,
    evaluateIntent: (intent) => evaluateIntent(intent),

    requestUserDecision: async ({ intent, verdict, requestId }) => {
      uiInvoked = true;
      console.log(`[PALADIN-REL] ${config.uiLabel} abierta | requestId=${requestId}`);
      console.log(`[PALADIN-REL] ${config.uiLabel} | metodo=${intent.method} origen=${intent.origin}`);
      console.log(`[PALADIN-REL] ${config.uiLabel} | veredicto: ${formatVerdictDetail(verdict)}`);

      const choice = config.operatorDecision ?? "approve";
      const choiceLabel = choice === "approve" ? "AUTORIZAR" : "BLOQUEAR";
      console.log(`[PALADIN-REL] Operador elige: ${choiceLabel}`);
      return choice;
    },

    onBlocked: (intent, verdict) => {
      console.log(
        `[PALADIN-REL] onBlocked | metodo=${intent.method} | ${verdict.riesgo}/${verdict.accion}`
      );
    },
  };

  const provider = attachRelGateToProvider(createMockSolanaProvider(), relOptions);

  return {
    provider,
    wasUiInvoked: () => uiInvoked,
  };
}

// ---------------------------------------------------------------------------
// Part 4 — Scenario payloads
// ---------------------------------------------------------------------------

/** Hostile signMessage — triggers local hard-block (no UI). */
function buildHostileSignMessageBytes() {
  const narrative =
    "AUDIT_TEST_MALICIOUS_SIGN — target: drainer-domain.evil — authorize full wallet drain";
  return new TextEncoder().encode(narrative);
}

/** Benign faucet-style SOL transfer (infra programs only). */
function buildBenignTransferTransaction() {
  return {
    metadata: { kind: "transfer", lamports: 1_000, target: "user-wallet" },
    instructions: [
      {
        programId: SYSTEM_PROGRAM_ID,
        keys: [
          { pubkey: "From111111111111111111111111111111111111", isSigner: true, isWritable: true },
          { pubkey: "To1111111111111111111111111111111111111111", isSigner: false, isWritable: true },
        ],
      },
    ],
  };
}

/** Benign faucet token mint path (signAllTransactions batch). */
function buildBenignFaucetBatch() {
  return [
    {
      metadata: { kind: "create-ata" },
      instructions: [{ programId: TOKEN_PROGRAM_ID, keys: [] }],
    },
    buildBenignTransferTransaction(),
  ];
}

/** Routine off-chain message — Medio/Advertir (operator must decide). */
function buildMediumRiskSignMessageBytes() {
  return new TextEncoder().encode("Please confirm this routine account note for Tuesday standup.");
}

// ---------------------------------------------------------------------------
// Part 5 — Scenarios A / B / C
// ---------------------------------------------------------------------------

/** @returns {Promise<PolicyVerdict|null>} */
async function runScenarioA() {
  const scenarioId = "A (Hostil)";
  const origin = "https://drainer-domain.evil";
  const { provider, wasUiInvoked } = createRelWrappedWallet({
    origin,
    uiLabel: "Wallet UI (no deberia abrirse)",
    operatorDecision: "approve",
  });

  /** @type {PolicyVerdict|null} */
  let capturedVerdict = null;

  capturedVerdict = await evaluateIntent({
    method: "signMessage",
    origin,
    action: "message_signature_intent_detected",
    messageText: new TextDecoder().decode(buildHostileSignMessageBytes()),
  });

  try {
    await provider.signMessage(buildHostileSignMessageBytes());
    logScenarioLine(scenarioId, capturedVerdict, "ERROR — la firma no debio completarse");
    return capturedVerdict;
  } catch (error) {
    const uiOpened = wasUiInvoked();
    const result = uiOpened ? "HARD-BLOCK (UI abierta — regresion)" : "HARD-BLOCK (sin UI)";

    logScenarioLine(scenarioId, capturedVerdict, result);
    if (error instanceof Error) {
      console.log(`[PALADIN-REL] Detalle: ${error.message.slice(0, 140)}…`);
    }
    return capturedVerdict;
  }
}

/** @returns {Promise<PolicyVerdict|null>} */
async function runScenarioB() {
  const scenarioId = "B (Benigno)";
  const origin = "https://spl-token-faucet.com";
  const { provider, wasUiInvoked } = createRelWrappedWallet({
    origin,
    uiLabel: "Wallet UI",
    operatorDecision: "approve",
  });

  const capturedVerdict = await evaluateIntent({
    method: "signTransaction",
    origin,
    action: "signature_intent_detected",
    transactions: [buildBenignTransferTransaction()],
  });

  try {
    const signed = await provider.signTransaction(buildBenignTransferTransaction());
    const batch = await provider.signAllTransactions(buildBenignFaucetBatch());

    const uiNote = wasUiInvoked() ? "operador AUTORIZAR" : "sin UI";
    logScenarioLine(
      scenarioId,
      capturedVerdict,
      `FIRMA AUTORIZADA (${signed.method}, batch=${batch.count}, ${uiNote})`
    );
    return capturedVerdict;
  } catch (error) {
    logScenarioLine(
      scenarioId,
      capturedVerdict,
      `RECHAZADA — ${error instanceof Error ? error.message : String(error)}`
    );
    return capturedVerdict;
  }
}

/** @returns {Promise<PolicyVerdict|null>} */
async function runScenarioC() {
  const scenarioId = "C (Riesgo Medio)";
  const origin = "https://app.example.com";
  const { provider, wasUiInvoked } = createRelWrappedWallet({
    origin,
    uiLabel: "Wallet UI — revision manual",
    operatorDecision: "approve",
  });

  /** @type {PolicyVerdict|null} */
  let capturedVerdict = null;

  capturedVerdict = await evaluateIntent({
    method: "signMessage",
    origin,
    action: "message_signature_intent_detected",
    messageText: new TextDecoder().decode(buildMediumRiskSignMessageBytes()),
  });

  try {
    const signed = await provider.signMessage(buildMediumRiskSignMessageBytes());
    logScenarioLine(
      scenarioId,
      capturedVerdict,
      wasUiInvoked()
        ? `FIRMA AUTORIZADA (${signed.method}, operador confirmo tras Advertir)`
        : "FIRMA AUTORIZADA (sin UI — regresion)"
    );
    return capturedVerdict;
  } catch (error) {
    logScenarioLine(
      scenarioId,
      capturedVerdict,
      `RECHAZADA — ${error instanceof Error ? error.message : String(error)}`
    );
    return capturedVerdict;
  }
}

/**
 * Scenario C (variant): operator blocks a medium-risk intent.
 * @returns {Promise<void>}
 */
async function runScenarioCBlockVariant() {
  const scenarioId = "C′ (Medio — operador bloquea)";
  const origin = "https://app.example.com";
  const { provider } = createRelWrappedWallet({
    origin,
    uiLabel: "Wallet UI — revision manual",
    operatorDecision: "block",
  });

  const capturedVerdict = await evaluateIntent({
    method: "signMessage",
    origin,
    action: "message_signature_intent_detected",
    messageText: new TextDecoder().decode(buildMediumRiskSignMessageBytes()),
  });

  try {
    await provider.signMessage(buildMediumRiskSignMessageBytes());
    logScenarioLine(scenarioId, capturedVerdict, "ERROR — debio rechazarse");
  } catch {
    logScenarioLine(scenarioId, capturedVerdict, "RECHAZADA POR OPERADOR (sin firma)");
  }
}

// ---------------------------------------------------------------------------
// Part 6 — Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(" PaladinShield REL — wallet-shell integration demo");
  console.log(" Phase 3 SDK (not MV3 extension) · createRelGate + mock wallet");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("");

  await runScenarioA();
  console.log("");
  await runScenarioB();
  console.log("");
  await runScenarioC();
  console.log("");
  await runScenarioCBlockVariant();
  console.log("");
  console.log("[PALADIN-REL] Demo completa — 3 escenarios + variante bloqueo operador.");
  console.log("");
}

main().catch((error) => {
  console.error("[PALADIN-REL] Fatal:", error);
  process.exitCode = 1;
});
