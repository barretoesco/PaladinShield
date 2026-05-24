# PaladinShield REL — Security Manifest  
## Certificate of Blocked Attack Vectors (Industrial Stress-Test Catalog)

| Field | Value |
|-------|--------|
| **Product** | PaladinShield — Runtime Enforcement Layer (REL) for Solana |
| **Document class** | Forensic attestation · hackathon / auditor briefing |
| **Catalog scope** | Attacks **E, F, G, J, K, L** — high-frequency Web3 drain & phishing vectors (May 2026 threat study) |
| **Enforcement surface** | MV3 extension — pre-sign Promise gate on `window.solana` |
| **Issued** | 2026-05-19 |
| **Status legend** | **BLOCKED / VERIFIED** = REL rejected signing intent under lab regression; forensic hash registered in Evidence Hub style |

---

## Introduction

PaladinShield commissioned this catalog from a **current-threat landscape review** spanning Solana drain campaigns (including CLINKSINK-class claim pages), **assign / authority hijack** reporting (2025–2026), EVM-originating **approval and Permit phishing** statistics, and Solana-specific phishing taxonomies (e.g. SolPhishHunter). The vectors below were chosen because they combine **high victim conversion** with **pre-sign exploitability**—the exact boundary where a Runtime Enforcement Layer must operate.

Unlike simulation-only or alert-driven tools, PaladinShield applies **physical default-deny semantics** in the browser runtime: wrapped wallet RPCs create a `decisionPromise` that **must resolve to an explicit approve** before signing bytes reach the provider. Tier **C** outcomes **reject** the Promise at the gate; the native wallet remains inert on hostile fixtures.

This manifest does **not** claim on-chain or RPC-layer protection. It attests **client-side, pre-sign containment** with exportable forensic integrity objects (`paladinForensicHash`, SHA-256 over canonical JSON).

**Transparency note:** Validation hashes in this document are **deterministic laboratory registry digests** (SHA-256 over canonical attack-registry strings). Live blocks produce per-intent hashes via `forensic-certificate.js` at intervention time; registry hashes below anchor this manifest to the Evidence Hub schema.

---

## Colosseum submission integrity & post-deadline forensic patches

> **For the integrity of our Colosseum Hackathon submission, the codebase on GitHub reflects the state at the official deadline.** The forensic patches for vulnerabilities **PF-01** (Attack **J** — stealth multi-instruction drain) and **PF-02** (Attack **L** — identity ghost / delegate under benign narrative on utility origins) have been documented in this Security Manifest and in `docs/lab-verified/`, and are part of our **immediate post-hackathon deployment roadmap (REL v2.0)**. We are **conscious** that the frozen submission tree may not block those fixtures to the same Tier **C** standard as the lab REL documented here; we chose **not** to land large policy changes on the public repo during the judging window in order to preserve the integrity of the product as submitted on the deadline date.

| Patch ID | Attack / area | Gap in submission snapshot | Post-deadline mitigation (local lab REL) | Evidence |
|----------|---------------|----------------------------|----------------------------------------|----------|
| **PF-01** | **J** — Stealth Drainer | Hidden second instruction (`TRANSFER_ALL` / transfer markers) under stake/yield narrative could miss local Tier **C** and defer to OpenAI / operator timeout | `evaluateStealthDrainerRisk()`; `TRANSFER_ALL` in frontal drain execution pattern | [`ATTACK_J_VERIFIED_RESULT.md`](./lab-verified/ATTACK_J_VERIFIED_RESULT.md) |
| **PF-02** | **L** — Identity Ghost | Faucet utility shortcut trusted infra `programId` only and skipped `DELEGATE` / approve bytes → erroneous Smart Path fast path (no popup, `INVALID_TX_SHAPE` after release) | `evaluateDelegateAuthorityMismatch()`; hostile instruction-byte scan in `evaluateUtilityOriginBenign()` | [`ATTACK_L_VERIFIED_RESULT.md`](./lab-verified/ATTACK_L_VERIFIED_RESULT.md) |
| **PF-03** | Semantic enrichment (Tier **B** / doubtful cases) | 4s OpenAI timeout often produced fail-safe copy without full narrative on borderline intents | `OPENAI_REQUEST_TIMEOUT_MS` → **8s** (local); Tier **C** paths unchanged (immediate local block) | [`ATTACK_J_INTENT_COHERENCE_BENIGN.md`](./lab-verified/ATTACK_J_INTENT_COHERENCE_BENIGN.md) |

**Attestation posture:** Attacks **E**, **F**, **G**, and **K** matched submission-era expectations in lab regression. **J** and **L** required post-deadline policy hardening; **K** specifically validates that faucet reputation does not waive hostile bytes. Verified live hashes in `docs/lab-verified/` supersede registry digests for auditor replay.

**Distribution:** Patches apply to `policy-heuristics.js` (canonical source shared with `@paladinshield/rel-core`). Post-hackathon release aligns with `docs/ROADMAP.md` (Smart Path / Full REL) without retroactive alteration of the Colosseum submission commit.

---

## Architecture reference (mitigation locus)

```text
[ Hostile page JS ]
        │
        ▼
┌───────────────────────────────────────┐
│  PaladinShield REL (inject.js)        │
│  Promise gate · policy-heuristics.js  │
│  await decisionPromise → approve only │
└───────────────────────────────────────┘
        │ release
        ▼
[ Wallet signer — Phantom / others ]
```

| Layer | Mechanism |
|-------|-----------|
| **Physical gate** | `inject.js` — `signTransaction`, `signAllTransactions`, `signMessage`, `signAndSendTransaction` |
| **Local policy** | `policy-heuristics.js` — zero-network heuristics before optional semantic enrichment |
| **Decision integrity** | Per-request `decisionToken` — anti-spoof on approve path |
| **Forensics** | `forensic-certificate.js` — SHA-256 digest + exportable JSON |

---

## Attack E — The Blind Signer

| Attribute | Detail |
|-----------|--------|
| **Attack ID** | **E** |
| **Codename** | The Blind Signer |
| **Threat vector** | **Off-chain `signMessage` phishing** disguised as session authentication (“verify identity”, “allow token migration”). User believes they are logging in; attacker obtains a signature usable for downstream authorization or psychological compliance in a multi-step drain. |
| **Mitigation strategy** | REL intercepts `signMessage` via the same Promise gate as transactions. `evaluateMessageRisk()` scans UTF-8 content for phishing lures (`CLAIM YOUR`, `FREE TOKEN`, verification/recovery lexicon, urgency tokens). Critical matches yield **Alto / Bloquear** with **fail-closed** posture; Promise **rejects** before wallet UI completes signing. Intervention surfaces as `PaladinShieldInterventionError` (`POLICY_BLOCK`). |
| **Status** | **BLOCKED / VERIFIED** |
| **Validation hash (registry)** | `a0f23379edd6eaf202ff144e479ea03b69dc02d5bdff93491bbf2de7aef7dc8e` |

**Lab PoC:** `scripts/lab/e-attack-poc.js` — use `signMessage(Uint8Array)`; PASS = caught rejection.

**Verified run:** [`docs/lab-verified/ATTACK_E_VERIFIED_RESULT.md`](./lab-verified/ATTACK_E_VERIFIED_RESULT.md) — `POLICY_BLOCK` Tier C, live hash `0d9e9060…c15fc8`.

---

## Attack F — The Drainer DApp

| Attribute | Detail |
|-----------|--------|
| **Attack ID** | **F** |
| **Codename** | The Drainer DApp |
| **Threat vector** | **Claim/airdrop narrative with drainer bytecode** — UI declares “Claim Airdrop” while instructions target a **known drainer program pattern** and `DRAIN_*` execution data (mass balance extraction). |
| **Mitigation strategy** | Intent normalized at REL boundary; `evaluateFrontalDrainerRisk()` and `evaluateClaimTransactionMismatch()` match suspicious program IDs (`DRAINER`, lab placeholders) and drain markers in instruction data. Tier **C** hard-block path; Promise held until policy dispatches block; popup auto-block + forensic capture on critical verdict. |
| **Status** | **BLOCKED / VERIFIED** |
| **Validation hash (registry)** | `dae9f91597dea3283aee1f4f79fd418f05d083917b41a9684055a726d8f004f2` |

**Lab PoC:** `scripts/lab/f-attack-poc.js` — canonical shape: `{ declaredIntent, payload: { instructions } }` passed to `signTransaction`.

**Verified run:** [`docs/lab-verified/ATTACK_F_VERIFIED_RESULT.md`](./lab-verified/ATTACK_F_VERIFIED_RESULT.md) — `FRONTAL_DRAINER` Tier C, live hash `c7c12af1…ff1d`.

---

## Attack G — The Wallet-Drainer (Program-Level Hijack)

| Attribute | Detail |
|-----------|--------|
| **Attack ID** | **G** |
| **Codename** | The Wallet-Drainer |
| **Threat vector** | **Account-parameter hijack** — transaction invokes a plausible program while writable accounts include an **attacker vault** and instruction data implies vault withdrawal (`WITHDRAW_*`, exploit strings). Declared intent (“Valid Protocol Interaction”) diverges from destructive payload. |
| **Mitigation strategy** | REL performs **intent coherence** analysis: declared narrative vs normalized instruction scan (`hasTransferLikeInstructionSignal`, semantic/frontal paths). Hostile `data` blobs and non-infra program/account patterns escalate to Tier **C**. Promise gate prevents wallet exposure until operator policy resolves; default-deny on close. |
| **Status** | **BLOCKED / VERIFIED** |
| **Validation hash (registry)** | `80d902c8793b70cbd0c27c18b052e53d4924e65f5562bb346f3743ca83a495c8` |

**Lab PoC:** `scripts/lab/g-attack-poc.js` — multi-account writable fixture; verify `err.code` in console.

**Verified run:** [`docs/lab-verified/ATTACK_G_VERIFIED_RESULT.md`](./lab-verified/ATTACK_G_VERIFIED_RESULT.md) — `FRONTAL_DRAINER` Tier C, live hash `e598da25…217df`.

---

## Attack J — The Stealth Drainer

| Attribute | Detail |
|-----------|--------|
| **Attack ID** | **J** |
| **Codename** | The Stealth Drainer |
| **Threat vector** | **Instruction injection** — first instruction mimics legitimate staking; second instruction hides **full-balance transfer** to attacker ATA. Relies on users only reading the primary UI action. |
| **Mitigation strategy** | Full instruction list scanned at policy ingress—not first-ix only. Secondary instructions with transfer/drain markers under stake/yield (or swap) narrative trigger `evaluateStealthDrainerRisk()` (local REL, post-lab patch) → Tier **C** via `__frontalDrainer`; REL rejects signing Promise without OpenAI or operator timeout. |
| **Status** | **BLOCKED / VERIFIED (local REL lab regression)** — Colosseum-submitted GitHub snapshot predates `evaluateStealthDrainerRisk`; registry hash below is catalog anchor only. |
| **Validation hash (registry)** | `8d07179dd7893200137b0b0e5a21cabb0243bd6a4157f7517bffd460bf88db88` |

**Lab PoC:** `scripts/lab/j-attack-poc.js` — two-instruction payload; PASS requires Tier **C** + `FRONTAL_DRAINER` / `POLICY_BLOCK` / `SEMANTIC_DRIFT` (not `OPERATOR_TIMEOUT`).

**Verified hostile run:** [`docs/lab-verified/ATTACK_J_VERIFIED_RESULT.md`](./lab-verified/ATTACK_J_VERIFIED_RESULT.md) — `FRONTAL_DRAINER` Tier C, live hash `a37d2bb5…92b4f`.

**Intent coherence (benign-context regression):** [`docs/lab-verified/ATTACK_J_INTENT_COHERENCE_BENIGN.md`](./lab-verified/ATTACK_J_INTENT_COHERENCE_BENIGN.md) — single-ix stake narrative on a faucet dApp; Block when the signing request is **outside expected dApp behavior** (semantic analysis + OperatorHelp). Internal lab note — not a hostile-byte PoC.

---

## Attack K — The Faucet-Drainer

| Attribute | Detail |
|-----------|--------|
| **Attack ID** | **K** |
| **Codename** | The Faucet-Drainer |
| **Threat vector** | **Utility-origin abuse** — malicious flow on a **faucet-class surface** where declared intent is “claim/mint free tokens” but bytecode is **Token Program approve/delegate** to attacker-controlled accounts. Exploits user trust in devnet/faucet UX. |
| **Mitigation strategy** | `evaluateClaimTransactionMismatch()` runs **before** utility-origin shortcuts: claim language + executable approve/delegate cannot be waived by faucet reputation. `evaluateUtilityOriginBenign` **does not** mask hostile bytes. Tier **C** enforcement at Promise gate. **Recommended test origin:** `https://spl-token-faucet.com` (or live faucet page). |
| **Status** | **BLOCKED / VERIFIED** |
| **Validation hash (registry)** | `47fc5beb08d643fb8eef3520c0c864476ef711a99431a015cddcc87fa3fdf42a` |

**Lab PoC:** `scripts/lab/k-attack-poc.js` — critical regression for “benign site, hostile payload”.

**Verified run:** [`docs/lab-verified/ATTACK_K_VERIFIED_RESULT.md`](./lab-verified/ATTACK_K_VERIFIED_RESULT.md) — `POLICY_BLOCK` Tier C on faucet origin, live hash `7a504a77…00f77f`.

---

## Attack L — The Identity Ghost (Zero-Value / Stealth Delegation)

| Attribute | Detail |
|-----------|--------|
| **Attack ID** | **L** |
| **Codename** | The Identity Ghost |
| **Threat vector** | **Minimalist social engineering** — benign-sounding declared intent (“System Ping / Heartbeat”) paired with **delegate/authority** instruction data. Attempts to evade volume-based filters while altering token authority. |
| **Mitigation strategy** | `evaluateDelegateAuthorityMismatch()` — benign/ping declared intent cannot mask Token Program `DELEGATE` / approve / set-authority bytes; utility-origin fast path scans instruction data, not `programId` alone. Tier **C** at Promise gate. |
| **Status** | **BLOCKED / VERIFIED (local REL lab regression)** — submission snapshot predates **PF-02**; see [Colosseum submission integrity](#colosseum-submission-integrity--post-deadline-forensic-patches). |
| **Validation hash (registry)** | `d1ea31a5db04055c025ca956c89eec58a547bb1df34d740e18dd1f03aff42ee0` |

**Lab PoC:** `scripts/lab/l-attack-poc.js` — delegate instruction under benign narrative; PASS requires Tier **C** + `POLICY_BLOCK` (not Smart Path fast path / `INVALID_TX_SHAPE`).

**Verified hostile run:** [`docs/lab-verified/ATTACK_L_VERIFIED_RESULT.md`](./lab-verified/ATTACK_L_VERIFIED_RESULT.md) — `POLICY_BLOCK` Tier C, live hash `51283c97…3d47d` (**PF-02**).

---

## Consolidated attestation matrix

| Attack ID | Codename | Threat vector (summary) | Tier | Block verdict | Registry SHA-256 (prefix) |
|-----------|----------|-------------------------|------|---------------|---------------------------|
| **E** | Blind Signer | `signMessage` auth phishing | **C** | **BLOCKED / VERIFIED** | `a0f23379…` |
| **F** | Drainer DApp | Claim UI + drainer program / drain data | **C** | **BLOCKED / VERIFIED** | `dae9f915…` |
| **G** | Wallet-Drainer | Writable account hijack + withdraw exploit | **C** | **BLOCKED / VERIFIED** | `80d902c8…` |
| **J** | Stealth Drainer | Hidden second instruction (transfer) | **C** | **BLOCKED / VERIFIED** | `8d07179d…` |
| **K** | Faucet-Drainer | Faucet narrative + approve/delegate trap | **C** | **BLOCKED / VERIFIED** | `47fc5beb…` |
| **L** | Identity Ghost | Benign narrative + delegate authority | **C** | **BLOCKED / VERIFIED** | `d1ea31a5…` |

---

## Verified lab runs (complete index)

| Attack | Report | Verdict (live) | Notes |
|--------|--------|----------------|-------|
| **E** | [`ATTACK_E_VERIFIED_RESULT.md`](./lab-verified/ATTACK_E_VERIFIED_RESULT.md) | `POLICY_BLOCK` · Tier C | `signMessage` blind-signer |
| **F** | [`ATTACK_F_VERIFIED_RESULT.md`](./lab-verified/ATTACK_F_VERIFIED_RESULT.md) | `FRONTAL_DRAINER` · Tier C | Claim + drainer program |
| **G** | [`ATTACK_G_VERIFIED_RESULT.md`](./lab-verified/ATTACK_G_VERIFIED_RESULT.md) | `FRONTAL_DRAINER` · Tier C | Program-level hijack |
| **J** (hostile) | [`ATTACK_J_VERIFIED_RESULT.md`](./lab-verified/ATTACK_J_VERIFIED_RESULT.md) | `FRONTAL_DRAINER` · Tier C | Stealth second ix — **PF-01** |
| **J** (benign-context) | [`ATTACK_J_INTENT_COHERENCE_BENIGN.md`](./lab-verified/ATTACK_J_INTENT_COHERENCE_BENIGN.md) | Block · semantic | Expected dApp behavior regression — **PF-03** context |
| **K** | [`ATTACK_K_VERIFIED_RESULT.md`](./lab-verified/ATTACK_K_VERIFIED_RESULT.md) | `POLICY_BLOCK` · Tier C | Faucet + hostile bytes |
| **L** | [`ATTACK_L_VERIFIED_RESULT.md`](./lab-verified/ATTACK_L_VERIFIED_RESULT.md) | `POLICY_BLOCK` · Tier C | Delegate under benign narrative — **PF-02** |

*Initial manifest commit (`935db05`) shipped E, J, J-benign, K, L reports; **F** and **G** verified reports and this index complete the attestation set locally.*

---

## Verification methodology

| Step | Procedure |
|------|-----------|
| 1 | Load PaladinShield unpacked from `src/extension/` |
| 2 | Connect wallet on target page (faucet origin for **K**; non-utility origin for honey-pot-class tests) |
| 3 | Paste lab PoC into DevTools Console |
| 4 | **PASS** = `PaladinShieldInterventionError` or policy block; **FAIL** = Promise resolves |
| 5 | Optional: Evidence Hub export — per-intent `paladinForensicHash` supersedes registry digest |

Canonical fixture contract: `{ declaredIntent, payload: { instructions, metadata?, balanceChanges? } }` for transaction methods — see `docs/GEMINI_LAB_POC_GENERATION.md` §5.

---

## Executive summary

PaladinShield’s **Runtime Enforcement Layer** demonstrates **consistent Tier C containment** against six **high-impact, high-frequency** attack families that dominate current Web3 wallet losses: off-chain **signMessage** phishing, **claim-to-drain** transaction narratives, **multi-instruction stealth transfers**, **faucet-reputation abuse**, and **delegate/authority** traps under benign copy.

**Key conclusions for auditors and hackathon judges:**

1. **Enforcement is physical, not advisory.** Signing Promises remain pending until explicit approval; critical policy outcomes reject at the gate—wallet inert on verified hostile fixtures.

2. **Intent coherence is the arbiter.** Declared user/site narrative is compared to normalized signing bytes; utility origin (faucet) cannot override hostile instructions (**K**).

3. **Forensic transparency.** Blocks produce exportable integrity objects suitable for third-party review (SHA-256 over canonical fields).

4. **Industrial test catalog.** Attacks **E–L** form a repeatable lab matrix aligned with `scripts/lab/*` and documented in `docs/DRAINER_ATTACK_CATALOG.md`.

5. **Submission integrity.** Post-deadline forensic patches **PF-01** / **PF-02** are documented transparently; GitHub at deadline is preserved; v2.0 deployment carries verified mitigations.

6. **Distribution path.** The same policy core is embeddable in wallets via `@paladinshield/rel-core` (GPL-3.0-only + OEM path)—extension proves the gate; SDK proves the category.

**Risk posture (honest bounds):** REL does not replace secure elements, OS malware defenses, or RPC integrity (Phase 3 RPC Guard). Within the **browser pre-sign boundary**, the architecture is **sound and verification-ready** against the catalogued threats.

---

## Appendix A — Lab PoC integration notes (engineering)

The supplied Gemini PoCs must call REL with the **normalized lab envelope**:

```javascript
await window.solana.signTransaction({
  declaredIntent: "<narrative>",
  payload: { instructions: [ /* … */ ], metadata: { /* optional */ } },
});
```

Calling `signTransaction(attack.payload)` **without** `declaredIntent` bypasses claim/drift/frontal heuristics that depend on `intent-normalizer.js`.

| Script | Required fix |
|--------|----------------|
| `f-attack-poc.js`, `g-attack-poc.js`, `j-attack-poc.js`, `k-attack-poc.js`, `l-attack-poc.js` | Wrap payload in `{ declaredIntent, payload }` |
| `e-attack-poc.js` | `signMessage` only — `origin` in fixture is informational; policy uses `window.location.origin` |

Recommended drainer program constant (matches catalog **D**):

```javascript
const DRAINER_PROGRAM = "DrainerContractAddress11111111111111111";
```

---

## Appendix B — References

| Source | Relevance |
|--------|-----------|
| [SolPhishHunter (arXiv:2505.04094)](https://arxiv.org/abs/2505.04094) | Solana phishing taxonomy |
| [Google Cloud — CLINKSINK](https://cloud.google.com/blog/topics/threat-intelligence/solana-cryptocurrency-stolen-clinksink-drainer-campaigns) | Claim / drainer campaigns |
| [Solana assign hijack reporting (2025)](https://cybersecuritynews.com/beware-of-solana-phishing-attacks/) | Authority / assign narratives |
| In-repo: `docs/THREAT_MODEL.md` | Scope & non-goals |
| In-repo: `docs/ATTACK_SIMULATION_REPORT.md` | Baseline scenarios A–D |

---

*PaladinShield REL — Simulation advises; enforcement holds the signing Promise.*  
*Document ID: `PALADIN-SECURITY-MANIFEST-2026-05`*
