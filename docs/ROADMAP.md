# PaladinShield REL — Product Roadmap (Policy Tiers & Operating Modes)

**Document status:** Design record · **planned after public Frontier review**  
**Recorded:** May 2026 · **Audience:** Colosseum reviewers · wallet pilots · post-review engineering  

---

## For Colosseum reviewers (read this first)

| What is **shipped and judged today** | What this **roadmap** describes |
|--------------------------------------|----------------------------------|
| MV3 extension: Promise gate on `window.solana`, **default-deny**, critical-policy block, `signMessage` parity, forensic hash + Evidence Hub | **Next product layer:** tiered policy (A / B / C) and **Smart Path** vs **Full REL** to cut friction on aligned benign flows without auto-passing hostile or incoherent intents |
| Verify via [ATTACK_SIMULATION_REPORT.md](./ATTACK_SIMULATION_REPORT.md) and unpacked `src/extension/` | **Not** a claim that tier routing is already the behavior under test — it is the **studied, documented** adoption path after review |

**Why it exists:** Market and corpus research (including Colosseum Copilot positioning scripts in `scripts/`) showed that pre-sign **enforcement** is differentiated, but **alert fatigue** kills install rates if every benign signature raises the full gate. This document records how REL scales to mass adoption **without** replacing default-deny on Tier C.

For optional wallet-embed scaffold already in the repo, see [SDK_ROADMAP.md](./SDK_ROADMAP.md).

---

## Purpose of this document

This roadmap captures the **next evolution** of PaladinShield’s Runtime Enforcement Layer (REL): a **tiered policy model** and **user-selectable operating modes** that reduce friction for benign flows while preserving strict enforcement when declared intent and actual signing payload diverge.

It describes **what** we intend to build and **why** — product and policy semantics, not a line-by-line implementation guide. Engineering delivery is scheduled **after** the public hackathon review window.

For the wallet-embed SDK scaffold documented in parallel, see [SDK_ROADMAP.md](./SDK_ROADMAP.md).

---

## Strategic intent

PaladinShield’s core thesis remains unchanged: **hold the signing boundary** until policy and operator judgment release the gate. The roadmap below does **not** replace default-deny enforcement — it **routes** requests through proportionate response paths so that:

- Known-benign, intent-aligned activity encounters minimal friction.
- Ambiguous activity receives elevated scrutiny.
- Incoherent or hostile activity triggers full REL protection, forensic capture, and optional site-integrity signaling.

The **brain** of the system is **intent coherence**: what the user and site *declare* versus what the signing payload *actually does*. A compromised front-end may lie in copy or UX; structural and semantic evaluation of the signing intent remains the arbiter.

---

## Operating modes (user-facing)

Users choose how aggressively REL intervenes in day-to-day browsing. Two modes, toggled from the extension popup:

| Mode | Label | User expectation |
|------|--------|------------------|
| **Full REL** | 🛡️ Full REL | Every signing request passes through the complete gate: evaluation, operator surface, and enforce/block semantics as today. Maximum visibility and control. |
| **Smart Path** | ⚡ Smart Path | Tiered routing: aligned, low-risk flows may proceed on a **fast path**; misalignment or elevated risk escalates to full REL automatically. |

### Design principles (both modes)

- **No silent weakening of critical policy** — structural drain patterns and critical verdict classes must never auto-pass.
- **Explicit mode indicator** — the active mode is always visible so users never confuse “fast” with “off.”
- **Preference persistence** — the selected mode is remembered across sessions via **local extension storage** (device-only; no account required for v1).
- **Fail-closed default** — uncertainty, engine unavailability, or policy timeout escalates toward stricter behavior, not permissive bypass.

### Relationship to pilot “shadow” semantics

Wallet Integration Lab and SDK today expose **enforce** vs **shadow** for **wallet teams** (log-only pilots). Popup modes **Full REL** vs **Smart Path** are **end-user product semantics** in the MV3 extension. Both families will converge on the same tier definitions underneath; labels differ by audience.

---

## Tiered policy model (A / B / C)

All signing intents are classified into one of three tiers **before** deciding whether to open the full operator gate. Classification uses **local policy first**, then semantic enrichment where configured — aligned with the existing `{ riesgo, accion, mensaje }` contract.

### Tier A — Fast path eligible

**Profile:** Declared intent, page context, and normalized signing payload are **mutually consistent**; no structural honey-pot or drain markers; risk within benign bounds.

**REL behavior (Smart Path only):**

- Signing may proceed **without** raising the full shield UI.
- Optional **silent audit log** for transparency (user-reviewable in Evidence Hub).
- Full REL mode **may still evaluate** every request — product decision at implementation time; default design favors true fast path only under Smart Path.

**Examples (illustrative, non-exhaustive):**

- Faucet / devnet utility flows matching infrastructure program patterns.
- Well-formed swap intent on a recognized protocol surface where message, origin profile, and instruction shape align.

### Tier B — Elevated scrutiny

**Profile:** Partial alignment, uncommon parameters, elevated amounts, or policy returns **Advertir** without critical structural blockers.

**REL behavior:**

- Light operator prompt or abbreviated gate — user confirms with context.
- No automatic pass; friction is **moderate**, not maximal.

**Examples:**

- Benign-origin utility with unusual memo or rare program combination.
- Semantic engine unavailable → honest warn path (existing fail-safe posture).

### Tier C — Full shield

**Profile:** Declared intent **diverges** from payload reality; critical verdict (**Alto** / **Bloquear**); unknown hostile patterns; or spoof / bypass attempts.

**REL behavior:**

- **Full REL** engaged: Promise held, operator surface, hard-block on critical policy, decision-token validation where applicable.
- **Forensic certificate** generated (SHA-256 anchor, exportable evidence).
- **Site-integrity signal (planned):** metadata bundle suitable for notifying the affected origin’s operators that their surface may be compromised — user protection first, ecosystem hygiene second.

**Examples:**

- UX/copy promises “airdrop claim” while instructions move user funds outbound.
- Honey transaction structure, unlimited approval patterns, or social-engineering `signMessage` payloads.
- postMessage or UI spoof of approve actions (decision-token rejection path).

---

## Decision flow (conceptual)

```text
Signing request intercepted at REL boundary
        │
        ▼
┌───────────────────┐
│ Local policy +    │
│ intent coherence  │
└─────────┬─────────┘
          │
    ┌─────┴─────┐
    │ User mode │
    └─────┬─────┘
          │
   Full REL ──► always Tier B minimum → Tier C on risk
          │
   Smart Path ──► Tier A ? fast path : escalate → B or C
          │
          ▼
   Tier C ──► hold Promise · forensic · block/warn per verdict
```

---

## Intent coherence (core differentiator)

**Whitelist-by-brand alone is insufficient.** A malicious page can invoke legitimate program IDs or mimic known domains. Tier A eligibility therefore requires **coherence**, not reputation alone:

| Signal class | Role |
|--------------|------|
| Declared / UX intent | What the user believes they are doing (copy, prompts, message text) |
| Normalized signing intent | What the transaction or `signMessage` bytes actually encode |
| Origin profile | Page context — informative, never sole authority |
| Structural markers | Drain, approval, and honey patterns — veto power |

When declared and normalized intents **diverge**, Tier C is mandatory regardless of operating mode. This is the primary defense against **compromised but “familiar” sites**.

---

## Extension UX (planned)

### Mode switch

- Control location: **extension popup** (primary surface).
- Presentation: **⚡ Smart Path** ↔ **🛡️ Full REL** (toggle or segmented control).
- Persistent state: **local storage** on device — mode survives browser restart.
- Status badge: REL remains **ACTIVE** in both modes; copy clarifies *how* it is active (full gate vs smart routing).

### User education (short)

- **Full REL:** “I want to see every signing decision.”
- **Smart Path:** “Trust REL to speed up safe flows; full shield on anything suspicious.”

---

## Safe bypass semantics (terminology)

We use **fast path**, not **bypass**:

- **Fast path** = Tier A routing under Smart Path only, after coherence checks.
- **Never** a user-toggle “disable protection.”
- **Never** auto-pass on critical policy classes.
- **Storage-backed preference** applies only to **mode selection** (Full vs Smart), not per-site permanent allowlists in v1.

Future wallet-embed pilots may add **institutional policy** (issuer-side rules); that layer is documented under wallet pilot materials, not this extension roadmap.

---

## Post-hackathon delivery phases

| Phase | Scope | Outcome |
|-------|--------|---------|
| **P0 — Design lock** | Tier definitions, mode semantics, threat-model update | This document + THREAT_MODEL alignment |
| **P1 — Extension** | Popup switch, local preference, tier routing in MV3 REL | User-facing Smart Path / Full REL |
| **P2 — Shared policy** | Canonical tier evaluation in shared policy module | Extension and SDK cannot drift |
| **P3 — SDK & Lab** | Operating modes aligned with enforce / smart / shadow semantics; Lab selector | Wallet teams reproduce behavior |
| **P4 — Site integrity** | Optional report/export for compromised-origin signaling | Ecosystem-facing differentiator |

**Explicitly out of v1:** npm publish, hosted policy production, RPC Guard, per-site permanent whitelist without coherence checks.

---

## Migration path (extension → SDK → Lab)

The MV3 extension remains the **proving surface**. Tier logic will be authored once in the **shared policy layer** already consumed by `@paladinshield/rel-core`, then:

1. Extension service layer applies tiers according to stored user mode.
2. SDK provider-wrap layer exposes the same modes to wallet hosts via host configuration.
3. Integration Lab demonstrates Tier A / B / C side-by-side for partner demos.

No duplicate policy engines. One tier model, three surfaces.

---

## Success metrics (product)

| Metric | Target direction |
|--------|------------------|
| False-positive friction | Down in Smart Path for aligned benign flows |
| Critical-block recall | Unchanged vs Full REL baseline |
| Time-to-sign (benign) | Reduced median under Smart Path |
| Forensic usefulness | Tier C events produce actionable site-integrity bundles |
| Wallet pilot readiness | Lab + SDK mode parity demonstrable in one session |

---

## Honest limits (unchanged)

Smart Path does **not** claim:

- Protection against OS-level malware or seed exfiltration.
- Replacement of wallet-native secure elements or hardware signers.
- Perfect semantic understanding of every zero-day program behavior.

REL raises the bar at the **pre-sign boundary**; tiers optimize **how** the bar is applied, not **whether** existential threats outside that boundary exist.

---

## Document lineage

This roadmap records product direction formulated **after** the Frontier submission: the **enforcement core** (Promise hold, default-deny, forensics) is demonstrated in the MV3 extension; **tiers and Smart Path** are the adoption layer specified here for post-review delivery. It is the reference for wallet conversations and engineering prioritization once judging concludes.

**Related docs:** [THREAT_MODEL.md](./THREAT_MODEL.md) · [SDK_ROADMAP.md](./SDK_ROADMAP.md) · [WALLET_PILOT.md](./WALLET_PILOT.md) · [WALLET_LAB.md](./WALLET_LAB.md) · [colosseum/SUBMISSION_DEV_LOG.md](./colosseum/SUBMISSION_DEV_LOG.md)

---

*PaladinShield — Runtime Enforcement Layer for Solana. Middleware, not a wallet.*
