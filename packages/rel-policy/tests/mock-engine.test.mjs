import test from "node:test";
import assert from "node:assert/strict";
import { evaluateIntentHeuristics } from "../../rel-core/src/index.js";
import { createMockPolicyEngine } from "../src/mock-engine.js";

test("local heuristics win — mock remote is not needed for hostile audit", async () => {
  let remoteCalls = 0;
  const policyEngine = createMockPolicyEngine({
    onEvaluate: () => {
      remoteCalls += 1;
    },
  });

  const intent = {
    method: "signMessage",
    messageText: "AUDIT_TEST_MALICIOUS_SIGN payload",
  };

  const local = evaluateIntentHeuristics(intent);
  assert.ok(local);
  assert.equal(local.accion, "Bloquear");

  if (local) {
    assert.equal(remoteCalls, 0);
    return local;
  }

  await policyEngine(intent);
  assert.fail("remote should not run when local matches");
});

test("mock remote policy runs when local heuristics return null", async () => {
  const intent = {
    method: "signTransaction",
    origin: "https://app.example.com",
    action: "signature_intent_detected",
    programIds: ["CustomRouter1111111111111111111111111111111"],
  };

  assert.equal(evaluateIntentHeuristics(intent), null);

  const policyEngine = createMockPolicyEngine({
    rules: [
      {
        match: (item) =>
          Array.isArray(item.programIds) &&
          item.programIds.some((id) => /CustomRouter/i.test(String(id))),
        verdict: {
          riesgo: "Alto",
          accion: "Bloquear",
          mensaje: "Accion: Router no verificado. Analisis: Mock remote policy bloquea.",
        },
      },
    ],
    defaultVerdict: {
      riesgo: "Medio",
      accion: "Advertir",
      mensaje: "Accion: Mock remote default. Analisis: Revision manual.",
    },
  });

  const defaultVerdict = await policyEngine({
    ...intent,
    programIds: ["OtherProgram11111111111111111111111111111111"],
  });
  assert.equal(defaultVerdict.accion, "Advertir");

  const routerVerdict = await policyEngine(intent);
  assert.equal(routerVerdict.accion, "Bloquear");
});
