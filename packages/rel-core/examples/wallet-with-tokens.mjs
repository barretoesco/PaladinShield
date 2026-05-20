/**
 * PaladinShield REL — decision-token reference + Promise gate (Node 18+).
 *
 * Shows how a wallet host can register per-request tokens and reject spoofed
 * operator approvals before releasing the native signer.
 *
 * Run: node packages/rel-core/examples/wallet-with-tokens.mjs
 */
import {
  createRelGateWithTokens,
  evaluateIntent,
  simulateSpoofApprove,
  isCriticalVerdict,
} from "../src/index.js";

const origin = "https://app.example.com";

function log(line) {
  console.log(`[PALADIN-REL] ${line}`);
}

function createMockSigner() {
  return {
    async signMessage(bytes) {
      return { signed: true, bytes: bytes.byteLength };
    },
  };
}

async function main() {
  console.log("");
  log("Decision-token reference demo (createRelGateWithTokens)");
  console.log("");

  let uiInvoked = false;

  const runGate = createRelGateWithTokens({
    origin,
    hardBlockOnCritical: true,
    evaluateIntent: (intent) => evaluateIntent(intent),

    requestOperatorApproval: async ({ registry, requestId, decisionToken, verdict }) => {
      uiInvoked = true;
      log(`UI abierta | requestId=${requestId} | ${verdict.riesgo}/${verdict.accion}`);

      const spoofApproved = simulateSpoofApprove(registry, requestId);
      log(`Spoof approve (wrong token): ${spoofApproved ? "PASS" : "BLOCKED"}`);

      log(`Operator approve (valid token pending): token=${decisionToken.slice(0, 8)}…`);
      return true;
    },
  });

  const signer = createMockSigner();
  const message = new TextEncoder().encode("Routine wallet note for Tuesday standup.");

  try {
    await runGate("signMessage", [message], signer.signMessage.bind(signer), origin);
    log("Resultado: FIRMA AUTORIZADA tras token valido");
  } catch (error) {
    log(`Resultado: RECHAZADA — ${error instanceof Error ? error.message : String(error)}`);
  }

  console.log("");
  log(`UI invocada: ${uiInvoked ? "si" : "no"}`);

  console.log("");
  log("Critical hostile message (hard-block, tokens irrelevant)");
  const hostileVerdict = await evaluateIntent({
    method: "signMessage",
    messageText: "AUDIT_TEST_MALICIOUS_SIGN",
  });
  log(`Veredicto: ${hostileVerdict.riesgo}/${hostileVerdict.accion} | critical=${isCriticalVerdict(hostileVerdict)}`);
  console.log("");
}

main().catch((error) => {
  console.error("[PALADIN-REL] Fatal:", error);
  process.exitCode = 1;
});
