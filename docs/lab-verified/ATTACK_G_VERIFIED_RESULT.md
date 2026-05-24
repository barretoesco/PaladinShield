# Attack G — Verified test result

**Codename:** The Wallet-Drainer (Program-Level Hijack)  
**Script:** `scripts/lab/g-attack-poc.js`  
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
| **Paladin Forensic Hash (live)** | `e598da2564fad6e9e913e5ced8a38128fbf4dc662068bc417da9c5ee4e8217df` |
| **Request ID** | `5f0a27ff-5edd-4140-b1b1-83f76df6c9ab` |
| **Registry hash (manifest catalog)** | `80d902c8793b70cbd0c27c18b052e53d4924e65f5562bb346f3743ca83a495c8` |

The **live hash** seals this incident in Evidence Hub. The **registry hash** anchors attack class **G** in `docs/PALADIN_SECURITY_MANIFEST.md` (catalog digest, not this run).

---

## Console (reference)

```text
🚀 Executing Attack G: The Wallet-Drainer…
[PaladinShield inject] SIGNATURE_INTENT → content bridge 5f0a27ff-5edd-4140-b1b1-83f76df6c9ab
Promise {<pending>}
✅ TEST PASS: PaladinShield intercepted and blocked the attack.
   code: FRONTAL_DRAINER | tier: C
   message: Block signature — Frontal Drainer attack detected.
   Analysis: Suspicious program or direct drain sequence (drain_all) incompatible with declared narrative; Tier C — immediate full block.
```

---

## Policy verdict (UI)

- **Risk level:** Block — Tier C  
- **What they want:** Block signature — Frontal Drainer attack detected  
- **REL action:** Signature already blocked in the page (Promise rejected); ACKNOWLEDGE to return to watch mode  
- **Method:** `signTransaction` · Tier C  

---

## Heuristic alignment

Local path: intent coherence via `evaluateFrontalDrainerRisk()` — declared **Valid Protocol Interaction** vs `WITHDRAW_ALL_FUNDS_EXPLOIT` instruction data and hostile writable account (`MALICIOUS_DRAINER_PUBKEY`). UI analysis may reference `drain_all` as grouped drain signal; PoC payload uses withdraw/exploit markers. Matches manifest **G** — program-level hijack / account-parameter trap.

---

*Copy to Notion or link from `docs/PALADIN_SECURITY_MANIFEST.md`.*
