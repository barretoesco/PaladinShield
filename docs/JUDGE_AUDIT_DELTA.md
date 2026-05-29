# Judge & audit delta — page-world enforcement hardening

**Last updated:** 2026-05-28  
**Audience:** Colosseum reviewers · security auditors · post-submit transparency  
**Related:** [ENVIRONMENT_ISOLATION.md](./ENVIRONMENT_ISOLATION.md) · [POST_SUBMIT_SECURITY_HARDENING.md](./POST_SUBMIT_SECURITY_HARDENING.md) · [REVIEWER_FAQ.md](./REVIEWER_FAQ.md)

---

## Repository status (read this first)

**The structural hardening described below is implemented and tested in the local working tree (extension v0.1.5–v0.1.11) but is not yet on the public GitHub snapshot used for hackathon judging.**

We changed how **`background.js`** and **`inject.js`** interact (decision bridge, Smart Path delivery, early page-world preamble). To respect the **frozen submission artifact** during the audit process, we are **not** replacing the judged extension code on GitHub until the audit completes. After audit, we will **commit and push** this hardening with an explicit changelog.

**What this means for reviewers:**

| Question | Answer |
|----------|--------|
| Are we aware of weaknesses in the **current GitHub** bridge? | **Yes** — see [Problem addressed](#problem-addressed) below. |
| Have we already fixed them locally? | **Yes** — lab-verified (e.g. strict-CSP faucet + Attack **F** blocked in Smart Path). |
| Does this document claim GitHub `main` already includes the fix? | **No** — documentation of intent and local v2 until post-audit commit. |

---

## Problem addressed

This update does **not** add a new set of on-chain drain **signatures** (attacks **E–L**, Tier **C**, `frontal_drainer`, etc. remain the policy surface documented in [PALADIN_SECURITY_MANIFEST.md](./PALADIN_SECURITY_MANIFEST.md)). It hardens the **enforcement channel** — how the extension **releases or blocks** the signing Promise after policy runs.

Residual classes identified in internal review and third-party audit discussion (e.g. Gemini on the submission snapshot):

| # | Weakness | Why it matters |
|---|----------|----------------|
| 1 | **Prototype poisoning** in page world | Hostile dApp JS can poison `Promise.prototype.then` (and related builtins) before our gate `await`s the decision Promise. |
| 2 | **Global `window` decision handlers** | Prior bridge exposed `__paladinShieldRegisterDecisionToken` / `__paladinShieldAcceptDecision` — monkey-patch and token-race surface in the same realm as the attacker. |
| 3 | **Smart Path register/approve race** | Separate register then approve messages could leave benign Tier **A** flows stuck (`approve` before token registered). |
| 4 | **Isolated world vs page world + CSP** | Content-script inline scripts and isolated-world events do not reliably reach `inject.js` in **page world**. Strict CSP dApps (lab faucet) **block inline** bridge scripts — browser CSP, not PaladinShield policy. |
| 5 | **`event.source` filter** | Synthetic `CustomEvent`s from `chrome.scripting.executeScript` often have `source === null`; an overly strict listener ignored valid decisions silently. |

**Explicit non-goals (unchanged):** iframe / clean-realm bypass, mobile deep links, malware outside the browser, wallet-native REL (Phase 3). Automated `[native code]` prototype forensics — **deferred** (false-positive risk without real compromised-site PoC).

---

## Why we changed Background ↔ Inject

| Before (judged GitHub baseline) | After (local v2, post-audit commit) |
|--------------------------------|--------------------------------------|
| Decision via functions on `window` | Internal event bridge + per-page secret on DOM (`data-paladin-rel-bridge-secret`); **no** public approve APIs on `window` |
| Content script tried inline script / isolated events | **Service worker** delivers via `chrome.scripting.executeScript` in **MAIN** world (CSP-safe on strict dApps) |
| Register token and approve as two steps | **`BRIDGE_OP_RESOLVE`** — atomic token + decision for Smart Path |
| Gate used page globals only | Early **`page-hardening.js`** at `document_start` (MAIN), captured natives, **`safeAwait`**, defensive **`isolateSigningArgsForPolicy`** before normalization |

**Role split (REL thesis unchanged):**

- **`inject.js` (page world):** Promise proxy on `window.solana`; holds gate until decision.
- **`background.js` (extension):** Policy, tiers, popup, tokens; privileged delivery when page bridge cannot use inline/CSP-blocked paths.
- **`content_script.js`:** Relays `SIGNATURE_INTENT` only — not the decision authority in page world.

---

## What it means for the shield (coverage honesty)

| Area | Effect |
|------|--------|
| **Gate reliability** | Higher on CSP-strict dApps and Smart Path (benign Tier **A** can release Phantom when policy allows). |
| **Anti-bypass (page world)** | Defense in depth vs prototype poisoning and decision-channel hijacking — not formal proof. |
| **Token integrity** | Smaller attack surface; atomic resolve reduces races. |
| **Intent parsing** | Less reliance on poisoned `Array` / typed-array prototypes when **analyzing** args (wallet still receives original objects). |
| **New drain patterns** | **No** — same Tier **C** / lab catalog; stronger **pre-sign enforcement**, not new heuristics alone. |

### Gemini-aligned checklist (honest)

| Finding class | Local v2 |
|---------------|----------|
| Poison `Promise.prototype` before gate `await` | **Mitigated** (captured builtins + `safeAwait`) — residual documented |
| Spoof / steal decision via `window` handlers | **Mitigated** (no global handlers; extension-only bridge + secret) |
| Smart Path register/approve race | **Mitigated** (atomic `resolve`) |
| CSP blocks inline bridge on strict sites | **Mitigated** (`executeScript` MAIN) |
| iframe / clean realm | **Out of scope** |
| Forensic `[native code]` scanner + auto alert | **Roadmap** — not shipped |

**One line for judges:** Same Solana threat policy and lab attestation **E–L**; **more reliable** Promise gating on `window.solana` in a hostile page.

---

## Local verification (reference)

- `npm test` — rel-core page-runtime hardening suite (56 tests at time of writing).
- Unpacked extension on **spl-token-faucet.com** (strict CSP): Smart Path Tier **A** mint → gate releases; user cancel in Phantom is normal.
- Attack **F** PoC (`scripts/lab/f-attack-poc.js`) in Smart Path → **blocked**, Evidence Hub Tier **C** / `frontal_drainer`.

---

## Changelog entry (for post-audit commit message)

```text
docs: page-world enforcement delta (2026-05-28)

Document background↔inject hardening (bridge, CSP-safe delivery, atomic
Smart Path resolve). Fixes are local until audit completes; GitHub
submission snapshot unchanged by design.
```

---

*Document ID: `PALADIN-JUDGE-AUDIT-DELTA-2026-05-28`*
