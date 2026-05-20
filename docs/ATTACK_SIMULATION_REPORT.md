# Attack Simulation Report

## Scenario A — `signMessage` (social engineering)

We executed a social-engineering `signMessage` attack simulation from the browser console to validate whether PaladinShield can stop a malicious message-signing flow before the wallet finalizes the signature.

### Malicious Console Script (Scenario A)
```js
const encoder = new TextEncoder();
const maliciousText =
  "SECURITY VERIFICATION REQUIRED NOW. Confirm OWNERSHIP to avoid wallet suspension. " +
  "Sign immediately to keep access to your funds.";

await window.solana.signMessage(encoder.encode(maliciousText), "utf8");
```

### Scenario A outcome
1. **Interception at Provider Layer** — `inject.js` wrapped `window.solana.signMessage` and generated a gated request ID.
2. **Semantic Intent Analysis** — `MESSAGE_SIGNATURE_INTENT` → `translator.js` + `policy-heuristics.js`.
3. **Physical Signature Blocking** — Promise rejected on critical verdict; no wallet signature.

**Attack blocked successfully.**

---

## Scenario B — `signAndSendTransaction` (bypass regression drill)

Validates that dApps cannot skip REL by calling `signAndSendTransaction` instead of `signTransaction` (wrapped since extension **v0.1.4**).

### Malicious Console Script (Scenario B)

Paste in DevTools on any page with wallet connected, or run the file:

`docs/audit-console-sign-and-send.js`

```js
(async function () {
  const p = window.solana;
  if (!p?.signAndSendTransaction?.__clearSignAIWrapped) {
    throw new Error("FAIL — signAndSendTransaction not wrapped");
  }
  const auditTx = {
    metadata: { audit: "AUDIT_TEST_MALICIOUS_SIGN_AND_SEND" },
    instructions: [{
      programId: "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
      data: new TextEncoder().encode("AUDIT_TEST_MALICIOUS_SIGN_AND_SEND"),
      keys: [],
    }],
  };
  await p.signAndSendTransaction(auditTx);
})();
```

### Scenario B — expected outcome
1. **Wrap check** — `signAndSendTransaction.__clearSignAIWrapped === true`
2. **Intercept** — `inject.js` publishes `SIGNATURE_INTENT` with method `signAndSendTransaction`
3. **Local block** — `evaluatePayloadAuditMarkers()` in `policy-heuristics.js` → Alto/Bloquear
4. **Hard-block** — Promise rejected before RPC send; popup may flash auto-block (v0.1.3+)

**Expected: PASS — blocked before wallet send.**

---

## Regression checklist (both scenarios)

| Step | Action | Pass |
|------|--------|------|
| 1 | Reload extension at `chrome://extensions` | |
| 2 | Run Scenario A (`signMessage`) | Block / reject |
| 3 | Run Scenario B (`signAndSendTransaction`) | Wrapped + block |
| 4 | Devnet faucet (benign) | CONFIAR / approve still works |

---

## User Impact Statement

**Without PaladinShield, the user would have signed a deceptive message or sent a hostile transaction path and could have lost funds.**

## CSP and Forensic Console Note

PaladinShield operates under Manifest V3 CSP (no inline extension code). Forensic console logs capture hostile payloads for audit export via Evidence Hub.
