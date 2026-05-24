# Attack F — Verified test result

**Codename:** The Drainer DApp  
**Script:** `scripts/lab/f-attack-poc.js`  
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
| **Paladin Forensic Hash (live)** | `c7c12af1bb39cf0b16f726ea68c0a816e7babfb90da26fd336f67f88a7a2ff1d` |
| **Request ID** | `0f7ca2bf-7237-4ae9-af4b-d9d3c68bbdc3` |
| **Registry hash (manifest catalog)** | `dae9f91597dea3283aee1f4f79fd418f05d083917b41a9684055a726d8f004f2` |

The **live hash** seals this incident in Evidence Hub. The **registry hash** anchors attack class **F** in `docs/PALADIN_SECURITY_MANIFEST.md` (catalog digest, not this run).

---

## Console (reference)

```text
🚀 Executing Attack F: The Drainer DApp…
[PaladinShield inject] SIGNATURE_INTENT → content bridge 0f7ca2bf-7237-4ae9-af4b-d9d3c68bbdc3
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

Local path: `evaluateFrontalDrainerRisk()` + `evaluateClaimTransactionMismatch()` — declared **Claim Airdrop** narrative vs lab drainer program (`DrainerContractAddress…`) and `drain_all_assets_hex_sequence` in instruction data. Matches manifest **F** — claim/airdrop narrative with drainer bytecode.

---

*Copy to Notion or link from `docs/PALADIN_SECURITY_MANIFEST.md`.*
