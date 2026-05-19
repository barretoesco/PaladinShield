# Superteam Agentic Engineering Grant — Application Responses

**Grant listing:** https://superteam.fun/earn/grants/agentic-engineering/  
**Use:** Copy sections below into the Superteam Earn form fields. Adjust team name, links, and contact as needed.

---

## Project name

**PaladinShield** (ClearSign AI)

---

## One-line description (≤160 characters)

AI-driven Runtime Enforcement Layer for Solana: intercepts signing, runs semantic policy agents, and physically gates wallet Promises until safe.

---

## Short summary (2–3 sentences)

PaladinShield is agentic security infrastructure for Solana. On every `signTransaction`, `signAllTransactions`, or `signMessage` call, an autonomous LLM policy agent audits the intent and returns a structured verdict that controls **physical Promise gating**—the wallet cannot sign until policy and the user allow it. We ship this today as an MV3 extension demo; our roadmap embeds the same REL into Solana wallets ecosystem-wide.

---

## What problem are you solving?

Users lose funds when they sign transactions or messages they do not understand. Warnings and simulations are not enough: execution still reaches the wallet. PaladinShield stops signing **at the provider Promise boundary** with default-deny semantics and produces verifiable forensic evidence (certificate + SHA-256 hash) at the point of attack.

---

## How does your project use agentic engineering?

PaladinShield uses **agentic engineering** in four concrete ways:

1. **Autonomous policy agent (no user prompt):** Every intercepted signature intent triggers `translateTransaction()` without the user asking the model anything. The agent runs under a fixed auditor system prompt and must output strict JSON (`riesgo`, `accion`, `mensaje`).

2. **Real-time interception loop:** `inject.js` → `content_script.js` → `background.js` forms a closed pipeline from dApp call to verdict in seconds, with MV3 service worker orchestration.

3. **Semantic auditing, not chat:** The LLM compares origin reputation vs decoded payload (instructions, transfers, `signMessage` text), detects blind-signing and narrative mismatch, and can emit administrator guidance (`AyudaAlAdministrador`) for compromised-site scenarios.

4. **Enforcement coupling:** The agent’s verdict is not decorative—it gates **JavaScript Promises** on `window.solana` signing methods. High-risk outcomes persist forensic packages; closing the verdict UI without approval keeps the Promise rejected (default-deny).

**Model stack:** OpenAI `gpt-4o-mini` with `response_format: json_object`, 4s timeout, and local fail-safe `Alto`/`Bloquear` if the API fails—REL remains fail-closed.

---

## How do LLMs physically gate signing Promises?

Traditional tools explain risk after the fact. PaladinShield **binds LLM output to execution control**:

1. Wallet methods are wrapped in `inject.js`.
2. Each call creates `decisionPromise = waitForUserDecision(requestId)` **before** invoking the original signer.
3. The extension runs the semantic agent on the serialized intent.
4. The popup displays the verdict; the user approves or blocks (or closes the popup → block).
5. Only after `decisionPromise` resolves with `approve` does `original.apply(this, args)` run.

**Without LLM + REL:** the dApp could reach Phantom/Solflare immediately.  
**With PaladinShield:** the Promise is held until the agentic audit and human gate complete.

This is **physical gating**, not a browser notification.

---

## Technical architecture (paragraph for form)

PaladinShield is a Chromium MV3 extension with four layers: (1) **page runtime** (`inject.js`) wrapping Solana wallet provider methods with Promise gating; (2) **bridge** (`content_script.js`) relaying intents to the service worker; (3) **orchestration** (`background.js`) managing state machines, OpenAI analysis, forensic persistence, and user decisions; (4) **semantic agent** (`translator.js`) implementing policy via OpenAI Chat Completions with JSON mode, heuristics, and fail-safe blocking. Forensic artifacts use `forensic-certificate.js` and the Evidence Hub UI. Full diagram and module table: `docs/superteam-agentic-engineering/TECHNICAL_DOCUMENTATION.md`.

---

## What have you built so far? (MVP / traction)

- Working MV3 extension with REL ACTIVE state and verdict popup.
- Promise gating on `signTransaction`, `signAllTransactions`, and `signMessage`.
- OpenAI-powered semantic policy engine with structured verdicts and fail-safe.
- Forensic Evidence Hub with SHA-256 **Paladin Forensic Hash** and export paths.
- Documented attack simulation (`docs/ATTACK_SIMULATION_REPORT.md`) blocking social-engineering `signMessage`.
- Demo script and pitch materials for judges (`docs/DEMO_SCRIPT.md`).

---

## Why Solana?

PaladinShield targets Solana’s wallet-adapter surface (`window.solana`) where DeFi, gaming, and consumer apps concentrate signing risk. Fast, high-frequency signing makes blind approval especially costly; REL at the signing boundary is chain-agnostic in design but Solana-first in implementation and ecosystem rollout (wallet SDK, future RPC Guard).

---

## Roadmap (what grant funds enable)

| Milestone | Outcome |
|-----------|---------|
| **M1 — Production semantic backend** | Move OpenAI calls off-client; rate limits, audit logs, no embedded API keys |
| **M2 — Wallet REL SDK spec + reference integration** | Document `evaluateIntent()` API for one partner wallet or adapter |
| **M3 — Automated attack fixture suite** | CI runs drainer / phishing / benign faucet scenarios against gating |
| **M4 — Evidence interoperability** | Publish hash/certificate schema for third-party forensic consumers |

**Vision:** Extension = Phase 1 demo; **native wallet REL** = Phase 2+ so every Solana user is protected at the signing surface without installing a separate extension.

---

## Team / skills alignment

- **Blockchain:** Solana transaction/message intent parsing, program ID hints, signing surface interception.
- **Backend:** MV3 service worker orchestration; planned policy proxy for LLM.
- **Frontend:** Verdict popup, Evidence Hub, real-time state sync (`GET_CURRENT_STATE`).
- **Content:** Forensic certificates, demo scripts, administrator guidance in verdict copy.

---

## Links (fill before submit)

| Field | Value |
|-------|--------|
| GitHub | `[YOUR_REPO_URL]` |
| Demo video | `[YOUR_VIDEO_URL]` |
| Live demo | Load unpacked extension from `src/extension/` |
| Technical doc | `docs/superteam-agentic-engineering/TECHNICAL_DOCUMENTATION.md` |

---

## Grant amount requested

Superteam lists **~$200 USDG** average grant size. Request **$200 USDG** (or platform default) toward:

- Hosted OpenAI / policy proxy costs for development and reviewer demos
- SDK documentation and one wallet integration spike
- Attack fixture automation for reproducible security demos

Adjust amount to match the form’s guidance.

---

## Why Agentic Engineering (not generic AI)?

We are not adding “ChatGPT to a wallet.” We built an **autonomous auditor** with:

- Fixed role and non-negotiable policy prompts
- Machine-readable outputs wired to **execution control**
- Fail-closed behavior on model timeout
- Forensic artifacts proving what the agent decided at interception time

That is agentic engineering applied to **security-critical infrastructure**, aligned with Superteam’s focus on builders shipping real agent loops on Solana.

---

## Optional: Elevator pitch (30s, English)

> PaladinShield is a Runtime Enforcement Layer for Solana. We use agentic engineering to audit every signing intent in real time and physically gate wallet Promises until a semantic policy agent and the user allow execution. Today we prove it as a browser extension; tomorrow we embed the same REL in Solana wallets so the whole ecosystem signs under default-deny protection—with verifiable forensic evidence at the point of attack.

---

## Contact

`[YOUR_EMAIL]`  
Questions about listing: support@superteam.fun

---

*Last updated for Superteam Agentic Engineering grant submission.*
