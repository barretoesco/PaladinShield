# Attack K — Verified test result

**Codename:** The Faucet-Drainer  
**Script:** `scripts/lab/k-attack-poc.js`  
**Recorded:** 2026-05-23 (UTC)  
**Status:** BLOCKED / VERIFIED

---

## Summary

| Field | Value |
|-------|--------|
| **Page** | `https://spl-token-faucet.com` |
| **REL mode** | Full REL + Smart Path (both verified) |
| **Method** | `signTransaction` |
| **Console** | PASS — `POLICY_BLOCK`, Tier C |
| **Phantom** | No signing modal |
| **Popup** | BLOCKED (AUTO) + ACKNOWLEDGE |

---

## Cryptographic evidence

| Field | Value |
|-------|--------|
| **Paladin Forensic Hash (live)** | `7a504a777e1c260820b00a1179932fd05b2ec17ee809fb96689265ace600f77f` |
| **Request ID** | `a74ef235-d14d-442f-84b9-a0c99a4c0de6` |
| **Registry hash (manifest catalog)** | `47fc5beb08d643fb8eef3520c0c864476ef711a99431a015cddcc87fa3fdf42a` |

---

## Console (reference)

```text
🚀 Executing Attack K: The Faucet-Drainer…
[PaladinShield inject] SIGNATURE_INTENT → content bridge a74ef235-d14d-442f-84b9-a0c99a4c0de6
Promise {<pending>}
✅ TEST PASS: PaladinShield intercepted and blocked the attack.
   code: POLICY_BLOCK | tier: C
   message: Block signature — claim/airdrop narrative does not match the transaction.
   Analysis: Declared text suggests a claim with executable instructions (possible blind signing / drainer); default-deny applies.
```

---

## Policy verdict (UI)

- **Heuristic:** `evaluateClaimTransactionMismatch()` — claim language + executable Token Program approve/delegate on faucet origin  
- **Thesis validated:** Utility faucet reputation does **not** waive hostile bytes  

---

*Copy to Notion or link from `docs/PALADIN_SECURITY_MANIFEST.md`.*
