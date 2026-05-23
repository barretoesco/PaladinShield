# Attack L — Verified test result

**Codename:** The Identity Ghost  
**Script:** `scripts/lab/l-attack-poc.js`  
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
| **Paladin Forensic Hash (live)** | `51283c976292475fbb8c40118fb35cc2480b8583afb99bc64ace31ac8a73d47d` |
| **Request ID** | `fff73f60-750c-4bd0-90b6-651b67a08e8d` |
| **Registry hash (manifest catalog)** | `d1ea31a5db04055c025ca956c89eec58a547bb1df34d740e18dd1f03aff42ee0` |

---

## Console (reference)

```text
🚀 Executing Attack L: The Identity Ghost…
[PaladinShield inject] SIGNATURE_INTENT → content bridge fff73f60-750c-4bd0-90b6-651b67a08e8d
Promise {<pending>}
✅ TEST PASS: PaladinShield intercepted and blocked the attack.
   code: POLICY_BLOCK | tier: C
   message: Block signature — delegation authority without matching declared intent.
   Analysis: Declared narrative does not justify Token Program approve/delegate/set-authority markers (identity ghost / stealth delegation); Tier C — immediate full block.
```

---

## Policy verdict (UI)

- **Heuristic:** `evaluateDelegateAuthorityMismatch()` (**PF-02** post-deadline patch)  
- **Thesis validated:** Faucet utility reputation cannot waive `DELEGATE` bytes under benign “ping/heartbeat” copy  

---

## Related

- Post-deadline patch: [`PALADIN_SECURITY_MANIFEST.md`](../PALADIN_SECURITY_MANIFEST.md) — Colosseum submission integrity (**PF-02**)

---

*Copy to Notion or link from manifest consolidated matrix.*
