import test from "node:test";
import assert from "node:assert/strict";
import {
  createDecisionToken,
  createDecisionTokenRegistry,
  acceptOperatorDecision,
} from "../src/decision-token.js";

test("decision token registry rejects spoofed approve", () => {
  const registry = createDecisionTokenRegistry();
  const requestId = "req-001";
  const token = createDecisionToken();
  registry.register(requestId, token);

  assert.equal(acceptOperatorDecision("approve", "wrong-token", registry, requestId), false);
  assert.equal(acceptOperatorDecision("approve", token, registry, requestId), true);
  assert.equal(registry.validate(requestId, token), false);
});
