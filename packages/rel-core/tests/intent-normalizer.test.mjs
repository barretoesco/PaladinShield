import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeSigningIntent,
  normalizeTransactionRecords,
  collectProgramIds,
  decodeMessageBytes,
} from "../src/intent.js";

test("normalizeSigningIntent extracts programIds from transaction instructions", () => {
  const intent = normalizeSigningIntent({
    method: "signTransaction",
    args: [
      {
        instructions: [
          { programId: "11111111111111111111111111111111", data: new Uint8Array([1, 2]), keys: [] },
          { programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", data: new Uint8Array([]), keys: [] },
        ],
      },
    ],
    origin: "https://app.example.com",
  });

  assert.deepEqual(intent.programIds, [
    "11111111111111111111111111111111",
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  ]);
  assert.equal(intent.transactions?.[0]?.instructionCount, 2);
  assert.match(String(intent.transactions?.[0]?.instructions?.[0]?.dataHex || ""), /^0[12]/);
});

test("normalizeSigningIntent signMessage includes messageText and analysisInput", () => {
  const bytes = new TextEncoder().encode("Hello wallet lab");
  const intent = normalizeSigningIntent({
    method: "signMessage",
    args: [bytes],
    origin: "https://dapp.example.com",
  });

  assert.equal(intent.action, "message_signature_intent_detected");
  assert.equal(intent.messageText, "Hello wallet lab");
  assert.equal(intent.analysisInput?.messageText, "Hello wallet lab");
});

test("normalizeSigningIntent hostile audit marker in tx metadata is visible to policy", async () => {
  const auditText = "AUDIT_TEST_MALICIOUS_SIGN_AND_SEND";
  const intent = normalizeSigningIntent({
    method: "signAndSendTransaction",
    args: [
      {
        metadata: { audit: auditText },
        instructions: [
          {
            programId: "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
            data: new Uint8Array([...new TextEncoder().encode(auditText)]),
            keys: [],
          },
        ],
      },
    ],
    origin: "https://evil.example",
  });

  const { evaluateIntentHeuristics } = await import("../src/policy.js");
  const verdict = evaluateIntentHeuristics(intent);
  assert.equal(verdict?.accion, "Bloquear");
});

test("normalizeTransactionRecords handles signAllTransactions batch", () => {
  const records = normalizeTransactionRecords("signAllTransactions", [
    [
      { instructions: [{ programId: "11111111111111111111111111111111", keys: [] }] },
      { instructions: [{ programId: "ComputeBudget111111111111111111111111111111", keys: [] }] },
    ],
  ]);

  assert.equal(records.length, 2);
  assert.deepEqual(collectProgramIds(records), [
    "11111111111111111111111111111111",
    "ComputeBudget111111111111111111111111111111",
  ]);
});

test("decodeMessageBytes matches gate message decoding", () => {
  assert.equal(decodeMessageBytes(new TextEncoder().encode("  test  ")), "test");
});

test("normalizeSigningIntent serializes @solana/web3.js Transaction", async () => {
  const { Transaction, SystemProgram, PublicKey } = await import("@solana/web3.js");
  const payer = new PublicKey("11111111111111111111111111111112");
  const tx = new Transaction({
    recentBlockhash: "11111111111111111111111111111111",
    feePayer: payer,
  }).add(
    SystemProgram.transfer({
      fromPubkey: payer,
      toPubkey: payer,
      lamports: 0,
    })
  );

  const intent = normalizeSigningIntent({
    method: "signTransaction",
    args: [tx],
    origin: "https://spl-token-faucet.com",
  });

  assert.ok(intent.transactions?.[0]?.serializedHex?.length > 0);
  assert.deepEqual(intent.programIds, ["11111111111111111111111111111111"]);
});
