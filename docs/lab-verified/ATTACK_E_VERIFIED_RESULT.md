# Attack E — Verified test result

**Codename:** The Blind Signer  
**Script:** `scripts/lab/e-attack-poc.js`  
**Recorded:** 2026-05-23 (UTC)  
**Status:** BLOCKED / VERIFIED

---

## Summary

| Field | Value |
|-------|--------|
| **Page** | `https://spl-token-faucet.com` |
| **REL mode** | Full REL + Smart Path (both verified) |
| **Method** | `signMessage` |
| **Console** | PASS — `POLICY_BLOCK`, Tier C |
| **Phantom** | No signing modal |
| **Popup** | BLOCKED (AUTO) + ACKNOWLEDGE |

---

## Cryptographic evidence

| Field | Value |
|-------|--------|
| **Paladin Forensic Hash (live)** | `0d9e90605a6a6b25e0b185ae4c53aefe1de3caaf9916ef3692865f5d94c15fc8` |
| **Request ID** | `e44d4007-9d15-4680-b6f3-7c0d31c7bb50` |
| **Timestamp (Evidence Hub)** | `2026-05-23T03:03:40.765Z` |
| **Registry hash (manifest catalog)** | `a0f23379edd6eaf202ff144e479ea03b69dc02d5bdff93491bbf2de7aef7dc8e` |

The **live hash** seals this incident in Evidence Hub. The **registry hash** anchors attack class **E** in `docs/PALADIN_SECURITY_MANIFEST.md` (catalog digest, not this run).

---

## Console (reference)

```text
🚀 Executing Attack E: The Blind Signer…
[PaladinShield inject] MESSAGE_SIGNATURE_INTENT → content bridge <requestId>
Promise {<pending>}
✅ TEST PASS: PaladinShield intercepted and blocked the attack.
   code: POLICY_BLOCK | tier: C
   message: Action: Potentially fraudulent message signature request.
   Analysis: DANGER: Detected sensitive words (VERIFICATION, URGENT), urgency (URGENT)…
```

---

## Policy verdict (UI)

- **Risk level:** High → **Block**
- **What they want:** Potentially fraudulent message signature request
- **REL action:** Signature already blocked in the page (Promise rejected); ACKNOWLEDGE to return to watch mode
- **Method:** `signMessage` · Tier C

---

## Heuristic alignment

Local path: `evaluateMessageRisk()` — social-engineering lexicon (VERIFICATION, URGENT). Matches manifest **E** — off-chain blind-sign / auth phishing.

---

*Copy this file to Notion or link from `docs/PALADIN_SECURITY_MANIFEST.md` when the full verified-runs section is merged.*
