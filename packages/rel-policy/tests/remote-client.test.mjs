import test from "node:test";
import assert from "node:assert/strict";
import { createRemotePolicyClient } from "../src/remote-client.js";

test("remote client returns normalized verdict on HTTP 200", async () => {
  const policyEngine = createRemotePolicyClient({
    endpoint: "https://policy.test/v1/audit",
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        riesgo: "Medio",
        accion: "Advertir",
        mensaje: "Accion: Remote OK. Analisis: Semantic review suggested.",
      }),
    }),
  });

  const verdict = await policyEngine({
    method: "signMessage",
    origin: "https://app.example.com",
    messageText: "Session refresh",
  });

  assert.equal(verdict.accion, "Advertir");
});

test("remote client fail-closed on HTTP error", async () => {
  const policyEngine = createRemotePolicyClient({
    endpoint: "https://policy.test/v1/audit",
    fetchImpl: async () => ({
      ok: false,
      status: 503,
      json: async () => ({}),
    }),
  });

  const verdict = await policyEngine({ origin: "https://evil.example" });
  assert.equal(verdict.accion, "Bloquear");
  assert.match(verdict.mensaje, /HTTP 503/);
});

test("remote client utility-aware fail-safe on timeout", async () => {
  const abortAwareFetch = (_url, { signal }) =>
    new Promise((_resolve, reject) => {
      if (signal?.aborted) {
        reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
        return;
      }
      signal?.addEventListener("abort", () => {
        reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
      });
    });

  const policyEngine = createRemotePolicyClient({
    endpoint: "https://policy.test/v1/audit",
    timeoutMs: 20,
    fetchImpl: abortAwareFetch,
  });

  const utilityVerdict = await policyEngine({ origin: "https://spl-token-faucet.com" });
  assert.equal(utilityVerdict.accion, "Advertir");
  assert.match(utilityVerdict.mensaje, /timeout/i);

  const hostileVerdict = await policyEngine({ origin: "https://drainer-domain.evil" });
  assert.equal(hostileVerdict.accion, "Bloquear");
});
