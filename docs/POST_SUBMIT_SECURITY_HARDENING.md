# Post-submit security hardening (May 2026)

PaladinShield submitted to Colosseum on **May 11**. This update closes two enforcement gaps identified in internal red-team review **after submission**, aligned with judge feedback to keep iterating on infrastructure projects.

## 1. Decision channel anti-spoofing

**Problem:** Inbound approve/block signals were delivered to `inject.js` via `window.postMessage`. Any same-origin page script could observe `SIGNATURE_INTENT` traffic and forge a `SIGNATURE_DECISION` with `approve`.

**Fix:**

- Background generates a per-request **`decisionToken`** (UUID) stored only in the extension runtime.
- Content script registers the token in page context through an isolated bridge (`__paladinShieldRegisterDecisionToken`).
- Decisions are delivered through the same bridge (`__paladinShieldAcceptDecision`) and **rejected without a valid token**.
- Legacy `postMessage` decision listener removed from `inject.js`.

**Files:** `scripts/inject.js`, `scripts/content_script.js`, `scripts/background.js`

## 2. Hard default-deny on critical verdicts

**Problem:** Verdicts `Alto` / `Bloquear` produced forensic artifacts but still allowed the user to click **CONFIAR**, weakening default-deny claims.

**Fix:**

- On critical verdict, background **auto-dispatches `block`** to the Promise gate.
- Popup disables **CONFIAR** when `enforcementLocked` or critical policy applies.
- Background rejects late `approve` overrides for locked requests.
- Analysis failures also dispatch `block` (fail-closed).

**Files:** `scripts/background.js`, `ui/popup.js`

## Verification checklist

1. Load unpacked extension from `src/extension/`.
2. Run hostile `signMessage` drill from `docs/ATTACK_SIMULATION_REPORT.md` → Promise rejected, CONFIAR disabled on red verdict.
3. In page console, attempt spoof (should fail):

```js
window.postMessage(
  {
    type: "SIGNATURE_DECISION",
    payload: { requestId: "any-id", decision: "approve" },
  },
  "*"
);
```

4. Confirm inject logs: `Decision rejected: missing or invalid decision token`.

## Scope honesty

This hardening strengthens **browser REL** for the standard `window.solana` surface. It does not claim coverage for mobile deep links, Wallet Standard-only flows, `signAndSendTransaction`, or RPC-level enforcement (Phase 3 roadmap).
