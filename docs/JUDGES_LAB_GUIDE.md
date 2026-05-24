# PaladinShield — Judges Lab Guide

**Audience:** Colosseum reviewers · security auditors · reproducibility checks  
**Scope:** Two complementary surfaces — **MV3 extension** (judged demo) and **REL Integration Lab** (SDK embed simulator)

---

## Before you start

| Requirement | Notes |
|-------------|--------|
| **Chrome** | Load unpacked extension from `src/extension/` |
| **Phantom** (extension lab only) | Connect wallet on the test page |
| **OpenAI key** (optional) | `npm run env:sync` from repo root — enables semantic Tier B enrichment |
| **Network** (wallet lab only) | First load pulls `@solana/web3.js` from esm.sh once |

After code changes: reload the extension at `chrome://extensions`.

---

## Lab A — MV3 Extension (primary judged path)

This is the **Runtime Enforcement Layer** demo: Promise gating on `window.solana` in a real browser tab.

### Setup

1. From repo root:
   ```bash
   npm run env:sync
   ```
2. Chrome → `chrome://extensions` → Developer mode → **Load unpacked** → select `src/extension/`
3. Open **[https://spl-token-faucet.com](https://spl-token-faucet.com)**
4. Connect Phantom (or compatible wallet)
5. Confirm console shows PaladinShield runtime enforcement active

### Mode toggle (REL 2.0 local)

Open the extension popup:

| Mode | Label | Behavior |
|------|--------|----------|
| **Full REL** | Gate every signature | Operator review (Tier B) or block (Tier C) |
| **Smart Path** | Tiered routing | Tier **A** aligned intents may pass **without popup** |

### Benign regression (faucet mint)

Use the faucet’s normal **mint / airdrop** flow (not a console script):

| Mode | Expected |
|------|----------|
| **Smart Path** | No popup · Tier A fast path · Phantom may sign |
| **Full REL** | Popup **REVIEW** · TRUST / BLOCK |

**Audit trail:** Popup → *Open Evidence Hub* → **Smart Path audit log** lists silent Tier A releases.

### Hostile PoCs (DevTools console)

On **spl-token-faucet.com**: `F12` → **Console** → paste entire contents of a script from `scripts/lab/` → Enter.

| Script | Attack class | Expected tier | Pass signal |
|--------|--------------|---------------|-------------|
| `e-attack-poc.js` | E — Blind Signer (`signMessage`) | C | `✅ TEST PASS` · `POLICY_BLOCK` |
| `f-attack-poc.js` | F — Drainer DApp | C | `FRONTAL_DRAINER` |
| `g-attack-poc.js` | G — Program hijack | C | `FRONTAL_DRAINER` / `POLICY_BLOCK` |
| `j-attack-poc.js` | J — Stealth drainer (2 ix) | C | `FRONTAL_DRAINER` |
| `k-attack-poc.js` | K — Faucet drainer | C | Block even on faucet origin |
| `l-attack-poc.js` | L — Identity ghost / delegate | C | `POLICY_BLOCK` |
| `subtle-drift-attack-poc.js` | Semantic drift | C | `SEMANTIC_DRIFT` |

**Both Full REL and Smart Path** must block Tier C:

- In-page `PaladinShieldInterventionError` (Promise rejected)
- Popup **BLOCKED** + **ACKNOWLEDGE**
- Phantom signing modal **does not** open

### Forensic evidence

After a Tier C block:

1. Acknowledge in popup
2. Open **Evidence Hub** from popup link
3. Verify **Paladin Forensic Hash** (SHA-256) + downloadable JSON / certificate

Verified results and registry digests: [`docs/lab-verified/`](lab-verified/) · catalog [`PALADIN_SECURITY_MANIFEST.md`](PALADIN_SECURITY_MANIFEST.md)

### Quick checklist (extension)

```
[ ] Popup loads · Full REL / Smart Path toggle works
[ ] Smart Path + benign mint → no popup · audit log entry
[ ] Full REL + benign mint → REVIEW + TRUST/BLOCK
[ ] Attack F → Tier C in both modes
[ ] Evidence Hub → hash + Smart Path audit section
```

---

## Lab B — REL Integration Lab (SDK embed simulator)

**Not the judged MV3 demo.** Shows where REL middleware embeds in a **wallet signing surface** (operator UI, decision tokens, shadow mode) using `@paladinshield/rel-core`.

### Start the lab

From repo root:

```bash
npm run demo:wallet-lab
```

Open in browser:

**http://localhost:3456/packages/rel-core/examples/wallet-lab.html**

### Built-in scenarios (left panel)

| Button | What it tests | Expected (enforce mode) |
|--------|---------------|-------------------------|
| **Hostile signMessage** | Phishing-style message bytes | `[BLOCKED]` in dApp log |
| **Benign faucet signTransaction** | SystemProgram transfer (web3.js) | Operator prompt or pass · `SUCCESS` after approve |
| **Medium-risk signMessage** | Benign routine message | Operator prompt · approve to complete |
| **Hostile signAndSendTransaction** | Audit marker + hostile metadata | `[BLOCKED]` |

**REL mode** (header dropdown):

| Mode | Behavior |
|------|----------|
| **enforce** | Block / operator prompt (production-like) |
| **shadow** | Log verdict only — no gate |

**Signing surface (right panel):** Approve / Reject · **Simulate spoof attack** tests decision-token anti-spoof.

### Running catalog PoCs in Wallet Lab

The lab exposes `window.solana` as the REL-wrapped provider. You can run the **same** `scripts/lab/*.js` PoCs from the browser console on the wallet-lab page:

1. Keep wallet lab open (`enforce` mode recommended)
2. `F12` → Console
3. Paste full script (e.g. `f-attack-poc.js`) → Enter
4. Watch **dApp log** (left) and **signing surface** (right)

| PoC | Wallet lab note |
|-----|-----------------|
| **E, F, G, J, K, L, drift** | Should log `BLOCKED — …` and show block callback / forensic hash snippet |
| **Benign mint (real faucet)** | Use **Benign faucet signTransaction** button instead — uses real web3.js tx |

**Difference from extension lab:** Wallet Lab uses **rel-core** policy (`evaluateIntent`) — no Smart Path / Full REL popup toggle yet (roadmap P3). Tier routing semantics match shared policy; UX is the simulated wallet panel, not the MV3 popup.

---

## Which lab when?

| Question | Use |
|----------|-----|
| “Does REL block drainer PoCs in the wild?” | **Lab A** — MV3 extension on spl-token-faucet.com |
| “How would a wallet embed REL?” | **Lab B** — Integration Lab |
| “Are attacks E–L documented?” | **Lab A** PoCs + [`docs/lab-verified/`](lab-verified/) |
| “Decision tokens & operator gate?” | **Lab B** — Approve/Reject + spoof button |

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `window.solana.signTransaction not available` | Connect wallet (extension lab) or use wallet-lab page (Lab B sets `window.solana`) |
| No PaladinShield console message | Reload extension + hard refresh page |
| Wallet lab “Module load failed” | Run `npm run demo:wallet-lab` from repo root · check network for esm.sh |
| OpenAI timeout in Tier B | Fail-safe Warn — not Tier C · operator TRUST/BLOCK manually |
| Attack not blocked | Reload extension · confirm unpacked path is `src/extension/` (local REL 2.0) |

---

## Honest scope note

- **GitHub judged baseline:** MV3 extension + manifest attestation ([`PALADIN_SECURITY_MANIFEST.md`](PALADIN_SECURITY_MANIFEST.md))
- **Local REL 2.0:** Smart Path / Full REL toggle, tier UX, extended lab catalog — verify via Lab A
- **Integration Lab:** SDK reference · post-submit roadmap · not scored as the consumer extension product

For architecture and module map: [`docs/superteam-agentic-engineering/TECHNICAL_DOCUMENTATION.md`](superteam-agentic-engineering/TECHNICAL_DOCUMENTATION.md)
