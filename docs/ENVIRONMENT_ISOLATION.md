# Environment isolation — page-world injection guarantees & limits

**Last updated:** 2026-05-22  
**Applies to:** `src/extension/scripts/inject.js` (page context, `document_start`)

PaladinShield’s Phase 1 demo runs in the **hostile page JavaScript realm** — the same world as a malicious dApp. This document states what the inject layer **does** guarantee, what it **mitigates best-effort**, and what remains **out of scope** (so technical reviewers can ask hard questions without surprise).

---

## Design goal

Intercept **all standard wallet signing entry points** on `window.solana` (and `window.phantom.solana` when present) **before** signing bytes reach the wallet, using a **physical Promise hold** — not a visual overlay.

---

## What we implement today

| Mechanism | Purpose |
|-----------|---------|
| **`document_start` injection** | Content script loads `inject.js` as early as the MV3 bridge allows, before most dApp bundles run. |
| **Method wrapping** | `signTransaction`, `signAllTransactions`, `signMessage`, `signAndSendTransaction` are replaced with async wrappers that `await` operator decision. |
| **`aggressiveProviderCapture()`** | On load: wrap current `window.solana`; install a **setter trap** on `window.solana` so late provider swaps are re-wrapped; **120ms interval** re-wrap for ~30s as fallback if `defineProperty` fails. |
| **Phantom namespace** | `window.phantom?.solana` wrapped when available. |
| **Idempotent flags** | `__clearSignAIWrapped` / `__clearSignAIProviderWrapped` avoid double-wrap loops. |
| **Default-deny** | Popup close, explicit block, or 90s operator timeout → Promise **rejects**; wallet never receives bytes on that path. |

Relevant implementation: `src/extension/scripts/inject.js` (`wrapProvider`, `aggressiveProviderCapture`).

---

## What we do **not** claim

| Claim | Reality |
|-------|---------|
| “Immutable frozen browser prototypes” | We **do not** `Object.freeze` global prototypes or `window.solana` — wallet stacks legitimately **replace** the provider object; freezing would break Phantom/Backpack/Solflare integrations. |
| “Impossible to race the injector” | A hostile script in the **same realm** that executes **before** inject and **caches** a pre-wrap reference to signing methods could bypass the gate **for that cached reference only**. Commercial kits that poison prototypes aggressively are a **known residual class** — see mitigations below. |
| “Protection outside signing” | Fake domains, email phishing, OS malware, and seed exfiltration are **out of scope** — see [THREAT_MODEL.md](./THREAT_MODEL.md). |

---

## Advanced attacker scenarios (honest model)

**Assumed attacker can:**

- Run arbitrary JS in the page context (malicious dApp or XSS).
- Attempt to cache `window.solana` or method references before PaladinShield wraps them.
- Swap `window.solana` after load (we re-wrap on setter + interval).

**Mitigations (best-effort, not formal proof):**

1. **Earliest inject** — `document_start` in manifest content script path.
2. **Provider setter trap** — new provider objects get wrapped on assignment.
3. **Periodic re-wrap** — catches late injections during page boot window.
4. **Tier C local policy** — critical drains can **auto-block** without waiting for OpenAI (see [PALADIN_SECURITY_MANIFEST.md](./PALADIN_SECURITY_MANIFEST.md)).
5. **Wallet-native REL (Phase 3)** — embed gate **inside** the wallet signing surface so page JS never owns the last mile — see [SDK_ROADMAP.md](./SDK_ROADMAP.md).

**Production direction:** B2B wallet integration moves enforcement from “page extension vs page attacker” to “wallet signer vs everyone else” — the commercial moat, not consumer extension market share.

---

## Why not `Object.freeze` on prototypes?

Freezing `Function.prototype`, `Object.prototype`, or the wallet provider object is a common suggestion for anti-poisoning. In practice:

- Wallets and adapter libraries **mutate** provider objects and re-assign `window.solana`.
- Aggressive freeze breaks legitimate Solana wallet-standard flows.
- REL’s product thesis is **gate the signing Promise at the last responsible layer** — for Phase 1 that is the extension; for Phase 3 that is **inside the wallet**.

Documented residual risk is preferable to a false sense of “total JS sandbox” in a shared page realm.

---

## Related documents

- [THREAT_MODEL.md](./THREAT_MODEL.md) — trust boundaries & non-goals  
- [REVIEWER_FAQ.md](./REVIEWER_FAQ.md) — judge quick answers (OpenAI path, B2B thesis)  
- [POST_SUBMIT_SECURITY_HARDENING.md](./POST_SUBMIT_SECURITY_HARDENING.md) — decision tokens & anti-spoof  
- [PALADIN_SECURITY_MANIFEST.md](./PALADIN_SECURITY_MANIFEST.md) — lab-verified attacks E–L  
