# Paladin REL Integration Lab — signing surface simulator

**Status:** Demo / integration proof only · **not a wallet** · **not a product**  
**Last updated:** 2026-05-19

## What this is (and is not)

| Is | Is not |
|----|--------|
| A **simulator** of where REL sits in a wallet signing stack | A consumer wallet |
| A **demo hook** for wallet teams and judges | Competition with Phantom, Backpack, etc. |
| Middleware showcase — `wrapSolanaProvider` + operator UI mock | Key storage, RPC, mobile app, distribution |

PaladinShield is **REL infrastructure**. Wallet teams keep their product; they **embed** the gate. This lab answers one question: *"Where does REL live, and what does the operator see?"*

## Why this exists

Wallet teams often want to see REL **inside a signing surface**, not only in a Node script. The Integration Lab is a **minimal mock shell** that:

- Exposes a Phantom-shaped `window.solana` provider
- Embeds `@paladinshield/rel-core` via `wrapSolanaProvider`
- Shows operator UI (approve / reject) on the wallet side
- Supports **enforce** vs **shadow** mode for pilot-style rollout

Use it to **record demos** and **show embed path** in outreach — *"Here's REL inside a simulated signing surface; your team swaps this UI for yours."*

**You are not entering the wallet market.** You are selling **enforcement middleware**.

---

## Run locally

```bash
npm run demo:wallet-lab
```

Open:

```
http://localhost:3456/packages/rel-core/examples/wallet-lab.html
```

---

## Architecture

```text
┌─────────────────────┐         ┌──────────────────────────────┐
│  dApp simulator     │  call   │  Simulated signing surface   │
│  (left panel)       │ ──────► │  window.solana (REL-wrapped) │
│  hostile / benign   │         │  → evaluateIntent            │
│  signing buttons    │         │  → operator UI (right panel) │
└─────────────────────┘         │  → native mock signer        │
                                └──────────────────────────────┘
```

Same integration path documented in `WALLET_SDK_INTEGRATION.md` — the wallet team replaces the lab UI with their production confirm screen.

---

## Feasibility (honest)

| Aspect | Assessment |
|--------|------------|
| **Technical** | Highly feasible — reuses rel-core; no chain RPC required for policy demos |
| **Scope for "basic wallet"** | Mock signer + REL + UI ≈ what the lab already is |
| **Real wallet parity** | Needs key storage, RPC, MWA, Wallet Standard, mobile — out of lab scope |
| **As outreach hook** | Strong — visual, reproducible, shows embed path without asking partner to integrate first |
| **As product** | Not the goal — lab proves REL embeddability, not wallet market fit |

**Recommendation:** Ship the lab as **REL integration proof**, never as a wallet. Position: *"Simulated signing surface — your wallet replaces the mock UI; REL stays."*

---

## Modes

| Mode | Behavior |
|------|----------|
| **enforce** | Critical → hard-block; medium → operator prompt; benign → prompt or pass per policy |
| **shadow** | Always signs; logs verdict via `onShadowVerdict` (pilot Phase 1 pattern) |

---

## What to add later (optional)

- Decision-token flow in lab UI (parity with `wallet-with-tokens.mjs`)
- Remote policy via `@paladinshield/rel-policy`
- Decision tokens in lab UI + `@solana/web3.js` fixtures for faucet/hostile tx paths
- Screen recording preset for X / pilot outreach

---

## Related

- [WALLET_SDK_INTEGRATION.md](./WALLET_SDK_INTEGRATION.md)
- [WALLET_PILOT.md](./WALLET_PILOT.md)
- [SDK_ROADMAP.md](./SDK_ROADMAP.md)
