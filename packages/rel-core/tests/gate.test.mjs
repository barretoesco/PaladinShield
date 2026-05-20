import test from "node:test";
import assert from "node:assert/strict";
import { createRelGate, wrapSolanaProvider } from "../src/gate.js";

/** @param {import('../src/types.js').PolicyVerdict} verdict */
function criticalVerdict(overrides = {}) {
  return {
    riesgo: "Alto",
    accion: "Bloquear",
    mensaje: "Accion: Bloquear. Analisis: test hostile.",
    ...overrides,
  };
}

/** @param {import('../src/types.js').PolicyVerdict} verdict */
function benignVerdict(overrides = {}) {
  return {
    riesgo: "Bajo",
    accion: "Confiar",
    mensaje: "Accion: Confiar. Analisis: test benign.",
    ...overrides,
  };
}

test("createRelGate hard-blocks critical verdict without calling requestUserDecision", async () => {
  let uiCalled = false;
  const runGate = createRelGate({
    evaluateIntent: async () => criticalVerdict(),
    requestUserDecision: async () => {
      uiCalled = true;
      return "approve";
    },
  });

  await assert.rejects(
    () => runGate("signMessage", [new TextEncoder().encode("hostile")], async () => ({ ok: true }), "https://evil.test"),
    /Bloquear|bloqueada/i
  );
  assert.equal(uiCalled, false);
});

test("createRelGate calls original signer after operator approve", async () => {
  let signed = false;
  const runGate = createRelGate({
    evaluateIntent: async () => benignVerdict(),
    requestUserDecision: async () => "approve",
  });

  const result = await runGate(
    "signTransaction",
    [{ instructions: [] }],
    async () => {
      signed = true;
      return { signed: true };
    },
    "https://app.test"
  );

  assert.equal(signed, true);
  assert.equal(result.signed, true);
});

test("createRelGate rejects when operator blocks non-critical verdict", async () => {
  const runGate = createRelGate({
    evaluateIntent: async () => ({
      riesgo: "Medio",
      accion: "Advertir",
      mensaje: "Accion: Advertir. Analisis: review manually.",
    }),
    requestUserDecision: async () => "block",
  });

  await assert.rejects(
    () => runGate("signMessage", [new TextEncoder().encode("note")], async () => ({ ok: true }), "https://app.test"),
    /Advertir|rechazada/i
  );
});

test("wrapSolanaProvider wraps signAndSendTransaction", async () => {
  let sendCalled = false;
  const provider = {
    signAndSendTransaction: async (tx) => {
      sendCalled = true;
      return { signature: "mock-sig", tx };
    },
  };

  wrapSolanaProvider(provider, {
    origin: "https://wallet.test",
    evaluateIntent: async () => benignVerdict(),
    requestUserDecision: async () => "approve",
  });

  assert.equal(typeof provider.signAndSendTransaction, "function");
  const out = await provider.signAndSendTransaction({ instructions: [] });
  assert.equal(sendCalled, true);
  assert.equal(out.signature, "mock-sig");
});
