# Reviewer & judge FAQ

**Last updated:** 2026-05-28  
Short answers for technical reviewers, hackathon judges, and wallet partners. Full depth: [THREAT_MODEL.md](./THREAT_MODEL.md) · [ENVIRONMENT_ISOLATION.md](./ENVIRONMENT_ISOLATION.md) · [JUDGE_AUDIT_DELTA.md](./JUDGE_AUDIT_DELTA.md) · [SECURITY_ROADMAP.md](../SECURITY_ROADMAP.md).

---

## What is PaladinShield in one sentence?

**Security middleware (REL)** that holds the wallet signing **Promise** until policy and an explicit operator approve path release it — embeddable in wallets via `@paladinshield/rel-core`, demonstrated today as an MV3 extension.

---

## Is this a consumer browser-extension product?

**No — not as the end state.** The MV3 extension is a **Phase 1 proof surface** so judges can load unpacked and see enforcement without integrating a wallet binary.

**Commercial thesis (B2B):** PaladinShield is infrastructure wallets and RPC providers license to embed **before** their native signer — *“Phantom doesn’t need another extension; they need this gate inside the signing stack.”* See [SDK_ROADMAP.md](./SDK_ROADMAP.md) · [WALLET_SDK_INTEGRATION.md](./WALLET_SDK_INTEGRATION.md) · [WALLET_PILOT.md](./WALLET_PILOT.md).

The B2C extension market is saturated and hard to monetize; the defendable moat is **OEM / enterprise SDK** + policy + forensics at the signing boundary.

---

## How do I evaluate without an OpenAI API key?

**You can score core REL without any API key.**

| Path | API key needed? |
|------|-----------------|
| Load unpacked + hostile `signMessage` drill | **No** — local heuristics + fail-closed apply |
| Lab catalog **E–L** (Tier C auto-block) | **No** — see [JUDGES_LAB_GUIDE.md](./JUDGES_LAB_GUIDE.md) |
| Semantic enrichment (Tier B / borderline copy) | **Optional** — `npm run env:sync` after `.env`, or skip |

If OpenAI is unavailable (timeout, missing key, invalid JSON), the engine returns a **fail-closed** semantic posture; the signing Promise still does not release until the operator explicitly approves or the gate times out. Faucet utility origins may receive `Advertir` instead of hard block per shared heuristics.

**Hackathon demo note:** A team-managed demo key or future **backend proxy** removes judge friction — documented in [SECURITY_ROADMAP.md](../SECURITY_ROADMAP.md). Do not treat embedded demo keys as production security.

---

## Why depend on OpenAI at all?

OpenAI is **not** the only line of defense.

| Layer | Role |
|-------|------|
| **Local heuristics** (`policy-heuristics.js`) | Zero-network Tier **C** blocks (drainer patterns, stealth second-ix, message phishing lexicon) |
| **Promise gate** (`inject.js`) | Physical enforcement — independent of model availability |
| **OpenAI (`translator.js`)** | Optional semantic narrative for **ambiguous** intents (Tier B enrichment) |
| **`@paladinshield/rel-policy`** | Production path: **your** HTTP policy service — fail-closed client stub included |

**Production:** No secrets in the extension; policy runs behind a wallet-operated proxy. **Research roadmap:** on-device SLMs (e.g. WebLLM / WebGPU) to cut latency and third-party payload exposure — Phase 2+ in [ROADMAP.md](./ROADMAP.md), not required to validate REL thesis in Phase 1.

Current OpenAI request timeout: **8 seconds** (`OPENAI_REQUEST_TIMEOUT_MS` in `translator.js`). Tier **C** paths do not wait on the model.

---

## Can a drainer win the race against `inject.js`?

**Partially — we document it honestly.** Page-world injection cannot claim perfect victory over every prototype-poisoning kit. We mitigate with `document_start`, `window.solana` setter re-wrap, and boot-time interval re-wrap. See [ENVIRONMENT_ISOLATION.md](./ENVIRONMENT_ISOLATION.md).

**Strategic answer:** Wallet-native embedding (Phase 3) moves the gate out of the attacker-controlled page realm.

---

## What is on public GitHub vs local development?

**The judged hackathon snapshot on GitHub** is intentionally **frozen** during audit so reviewers see a stable artifact.

| Surface | GitHub (judged baseline) | Local working tree |
|---------|--------------------------|-------------------|
| Tier **C** / lab **E–L** policy | ✅ Documented & attested | ✅ Same catalog + lab scripts |
| Decision bridge (`background` ↔ `inject`) | Token anti-spoof via `window` bridge handlers (see [POST_SUBMIT_SECURITY_HARDENING.md](./POST_SUBMIT_SECURITY_HARDENING.md) §1) | **v0.1.5–v0.1.11** hardening: CSP-safe `executeScript` delivery, no global handlers, atomic Smart Path `resolve` |
| Structural extension push | Frozen until audit ends | Fixes **already implemented and lab-tested** |

Full problem statement, coverage honesty, and Gemini-aligned checklist → **[JUDGE_AUDIT_DELTA.md](./JUDGE_AUDIT_DELTA.md)** · [README](../README.md) (section *2026-05-28 — Page-world enforcement hardening*).

We are **aware** of residual page-world bridge weaknesses in the GitHub snapshot and **have corrected them locally**; we will **commit after audit** completes.

---

## What ships vs. what is roadmap?

| Shipped (judge here) | Documented / pilot |
|---------------------|-------------------|
| MV3 extension, Promise gate, popup, Evidence Hub | `@paladinshield/rel-core` Integration Lab |
| Local heuristics + fail-closed semantic path | `@paladinshield/rel-policy` remote adapter |
| Lab attestation E–L + PF patches | RPC Guard, Hive-Mind cache, on-device SLM |

---

## Five-minute proof checklist

1. Load unpacked → `src/extension/`
2. [ATTACK_SIMULATION_REPORT.md](./ATTACK_SIMULATION_REPORT.md) — hostile `signMessage`
3. Close popup without approve → Promise rejected (default-deny)
4. Optional: [JUDGES_LAB_GUIDE.md](./JUDGES_LAB_GUIDE.md) — full lab E–L
5. Optional: `packages/rel-core/examples/wallet-lab.html` — wallet embed story

---

## Related

- [README.md](../README.md) — commercial thesis & installation  
- [JUDGE_AUDIT_DELTA.md](./JUDGE_AUDIT_DELTA.md) — **2026-05-28** page-world bridge delta (GitHub frozen vs local v2)  
- [POST_SUBMIT_SECURITY_HARDENING.md](./POST_SUBMIT_SECURITY_HARDENING.md) — May 2026 post-submit fixes (token gate, default-deny)  
- [PALADIN_SECURITY_MANIFEST.md](./PALADIN_SECURITY_MANIFEST.md) — verified attack registry  
- [colosseum/SUBMISSION_DEV_LOG.md](./colosseum/SUBMISSION_DEV_LOG.md) — enforcement vs simulation thesis  
