/**
 * PaladinShield — hostile signAndSendTransaction audit (browser console).
 *
 * Usage:
 * 1. Load unpacked extension (src/extension/) and connect wallet on any page.
 * 2. Open DevTools → Console, paste this entire file, press Enter.
 * 3. Expect: wrap active + Promise rejected (Alto/Bloquear) before wallet sends.
 *
 * Also re-run the signMessage script in docs/ATTACK_SIMULATION_REPORT.md to confirm parity.
 */
(async function paladinAuditSignAndSend() {
  const provider = window.solana;
  if (!provider || typeof provider.signAndSendTransaction !== "function") {
    console.error("[AUDIT] FAIL — window.solana.signAndSendTransaction not available on this wallet.");
    return;
  }

  const wrapped = Boolean(provider.signAndSendTransaction.__clearSignAIWrapped);
  console.log(`[AUDIT] signAndSendTransaction wrapped by PaladinShield: ${wrapped ? "YES" : "NO"}`);
  if (!wrapped) {
    console.error("[AUDIT] FAIL — bypass: method not gated. Reload extension and retry.");
    return;
  }

  const MEMO_PROGRAM = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";
  const auditTx = {
    metadata: { audit: "AUDIT_TEST_MALICIOUS_SIGN_AND_SEND" },
    instructions: [
      {
        programId: MEMO_PROGRAM,
        data: new Uint8Array([...new TextEncoder().encode("AUDIT_TEST_MALICIOUS_SIGN_AND_SEND")]),
        keys: [],
      },
    ],
  };

  console.log("[AUDIT] Calling signAndSendTransaction with hostile audit marker…");
  const started = Date.now();

  try {
    await provider.signAndSendTransaction(auditTx);
    console.error("[AUDIT] FAIL — call completed; REL should have blocked before wallet send.");
  } catch (error) {
    const ms = Date.now() - started;
    console.log(`[AUDIT] PASS — blocked in ${ms}ms`);
    console.log("[AUDIT] Error (expected):", error?.message || String(error));
    console.log("[AUDIT] Next: run signMessage hostile script from ATTACK_SIMULATION_REPORT.md");
  }
})();
