# Attack J — Verified test result (hostile PoC)

**Codename:** The Stealth Drainer  
**Script:** `scripts/lab/j-attack-poc.js`  
**Recorded:** 2026-05-23 (UTC)  
**Status:** BLOCKED / VERIFIED

---

## Summary

| Field | Value |
|-------|--------|
| **Page** | `https://spl-token-faucet.com` |
| **REL mode** | Full REL + Smart Path (both verified) |
| **Method** | `signTransaction` |
| **Console** | PASS — `FRONTAL_DRAINER`, Tier C |
| **Phantom** | No signing modal |
| **Popup** | BLOCKED (AUTO) + ACKNOWLEDGE |

---

## Cryptographic evidence

| Field | Value |
|-------|--------|
| **Paladin Forensic Hash (live)** | `a37d2bb552b9795c128dcf8d2c5cd7975f0832fe0ee9de656b2ca8e2da692b4f` |
| **Request ID** | `34816303-bbbf-4c36-9e34-ccc33d7be33f` |
| **Registry hash (manifest catalog)** | `8d07179dd7893200137b0b0e5a21cabb0243bd6a4157f7517bffd460bf88db88` |

---

## Console (reference)

```text
🚀 Executing Attack J: The Stealth Drainer…
[PaladinShield inject] SIGNATURE_INTENT → content bridge 34816303-bbbf-4c36-9e34-ccc33d7be33f
Promise {<pending>}
✅ TEST PASS: PaladinShield intercepted and blocked the attack.
   code: FRONTAL_DRAINER | tier: C
   message: Block signature — Frontal Drainer attack detected.
   Analysis: Suspicious program or direct drain sequence (drain_all) incompatible with declared narrative; Tier C — immediate full block.
```

---

## Policy verdict (UI)

- **Risk level:** Block — Tier C  
- **REL action:** Signature already blocked in the page (Promise rejected); ACKNOWLEDGE to return to watch mode  
- **Vector:** Legitimate-looking staking lead instruction + hidden transfer/drain second instruction  

---

## Related lab notes

- **Benign-context coherence:** [`ATTACK_J_INTENT_COHERENCE_BENIGN.md`](./ATTACK_J_INTENT_COHERENCE_BENIGN.md) — single-ix stake on faucet; semantic Block (origin vs narrative).  
- **Local patch:** `evaluateStealthDrainerRisk` + `TRANSFER_ALL` in frontal drain pattern (lab REL; GitHub submission snapshot may predate).

---

*Copy to Notion or link from `docs/PALADIN_SECURITY_MANIFEST.md`.*
