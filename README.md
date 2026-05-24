# PaladinShield 🛡️

**Category:** Security Tools & Infrastructure  
**Sub-Category:** Runtime Enforcement Layer (REL) for Solana  
**Architecture:** Manifest V3 Unpacked Extension (Page Injection Context)  
**Author:** Andrés Barreto (Lead Infrastructure Architect)  

PaladinShield is an infrastructure-grade, low-level browser containment layer designed to secure user intent in Web3. Unlike passive, alert-driven extensions that operate as post-execution advisory tools, PaladinShield enforces security policies directly inside the browser's JavaScript runtime environment **before any signature payload can ever reach the wallet provider interface**.

## For reviewers & judges (start here)

**The evaluated product is the MV3 extension** — fully functional without Node.js, npm, or the SDK. Enforcement is a **physical Promise hold** on `window.solana`: signing bytes do not reach the wallet until policy and operator action release the gate (not a simulation overlay).

### Five-minute verification path

1. Load unpacked → `src/extension/` ([Installation](#-installation--local-deployment-unpacked-mv3)).
2. Reproduce the hostile drill → [docs/ATTACK_SIMULATION_REPORT.md](docs/ATTACK_SIMULATION_REPORT.md) (`signMessage` / drainer-class patterns).
3. Confirm **default-deny**: close the popup without approving → Promise rejected; wallet stays inert on hostile flows.
4. Optional: open **Evidence Hub** → export JSON and verify `paladinForensicHash` (SHA-256 over canonical fields).

| Path | Status | Action |
|------|--------|--------|
| `src/extension/` | **Shipped — judge here** | Unpacked MV3 demo; Full REL gate (see [docs/ROADMAP.md](docs/ROADMAP.md) for post-review product tiers) |
| `docs/ATTACK_SIMULATION_REPORT.md` | Reproducible PoE | Hostile `signMessage` and block outcome |
| `docs/THREAT_MODEL.md` | Scope & limits | In-scope threats and explicit non-goals |
| `docs/ROADMAP.md` | Design record | Tier A/B/C and Smart Path — **planned after Frontier review** (adoption; reduces friction without weakening Tier C) |
| `docs/PALADIN_SECURITY_MANIFEST.md` | Lab attestation | Attacks **E–L** — verified runs, registry hashes, post-deadline patches **PF-01–03** |
| `docs/colosseum/SUBMISSION_DEV_LOG.md` | Forensic justification | Enforcement thesis vs passive / simulation stacks |
| `packages/rel-core/` | Optional depth | Wallet-embed REL scaffold + Integration Lab — **not required to score the extension** → [docs/SDK_ROADMAP.md](docs/SDK_ROADMAP.md) |

**Do not run `npm install` at repo root to judge PaladinShield** — root `package.json` is tooling-only. The extension is the complete evaluation path.

**Differentiation in one line:** simulation and alert UX **advise**; PaladinShield **holds the signing Promise** until an explicit approve path releases it.

**REL 2.0 (local development):** The working tree includes a **Smart Path / Full REL** mode toggle, tier routing (A/B/C), and the extended industrial lab catalog (`scripts/lab/`, `docs/lab-verified/`). **GitHub’s judged baseline** remains the hackathon submission extension + manifest attestation; Smart Path is specified in [docs/ROADMAP.md](docs/ROADMAP.md) and **active in local REL 2.0** (e.g. Tier **A** fast path for aligned faucet mint; Tier **C** on hostile or incoherent requests).

---

## 🔬 Core Problem: The Myth of Passive Security

Web3 transaction signing currently operates under an architecture that suffers from extreme human risk. Legacy solutions—including passive simulation layers and visual contract analyzers—rely strictly on *Alert-Driven UX*. They parse payloads asynchronously, display warning highlights or risk scores on-screen, and leave the execution pathway wide open.

Under acute market stress, phishing scenarios, or psychological FOMO, users frequently experience *Alert Fatigue*, override warnings, and finalize compromised transaction promises. If the malicious script host has active access to the injected wallet object, a distracted user results in total capital destruction.

---

## ⚡ The Solution: PaladinShield Runtime Enforcement Layer (REL)

PaladinShield moves the defensive perimeter from the visual interface straight into the browser's JavaScript execution thread. The **physical enforcement layer** is a Promise gate on-device; semantic policy informs the operator but does not replace the gate.

### 1. Default-Deny Asynchronous Promise Gating

Operating as a specialized Promise Proxy, PaladinShield intercepts the global `window.solana` provider via an early-stage script (`scripts/inject.js`) loaded at `document_start` through the content-script bridge.

When a dApp calls `signTransaction`, `signAllTransactions`, `signMessage`, or `signAndSendTransaction`, the wrapped call creates a `decisionPromise` and **awaits** it before invoking the original wallet method. Until the extension delivers an explicit **approve** decision, the caller's Promise stays `pending` and the wallet never receives signing bytes.

If the operator closes the verification window without approving, `background.js` dispatches a **block** decision; `scripts/inject.js` rejects the gate at the decision handler (`scripts/inject.js`, reject path ~line 267). Popup close maps to *signature rejected* under default-deny policy.

### 2. Hybrid Policy Engine & Local Fail-Safe

PaladinShield couples fast client-side checks with optional semantic analysis:

* **Local heuristics (zero network):** `evaluateMessageRisk()` and `evaluateHoneyPotRisk()` in `scripts/translator.js` flag known social-engineering and structural drain patterns before any remote call.
* **Semantic analysis:** `background.js` forwards captured intents to `translator.js`, which calls OpenAI Chat Completions (`gpt-4o-mini`, JSON mode) per `manifest.json` host permission `https://api.openai.com/*`.
* **4-second fail-safe:** If the API times out, returns invalid JSON, or no key is configured, the engine applies a **fail-closed** local verdict (honest “semantic engine unavailable” messaging; faucet utility origins may receive `Advertir` instead of hard block). The signing Promise remains held until the operator blocks, closes the popup, approves explicitly, or hits the inject-layer timeout (90s).
* **Production note:** Hackathon demos may set `DEMO_OPENAI_API_KEY` in `scripts/translator.js`. Public releases should use a backend proxy (see `SECURITY_ROADMAP.md`)—MV3 unpacked builds do not read a `.env` file automatically.

### 3. signMessage Parity & Session Hardening

Off-chain vectors—blind-signing prompts, SIWE-style messages, and session-phishing text—use the same Promise gate as transaction flows via `wrapSignMessage()` in `scripts/inject.js`.

---

## 🛠️ System Architecture & File Registry

The containment engine runs across isolated Manifest V3 contexts:

```text
src/extension/
├── manifest.json
├── scripts/
│   ├── inject.js                 # Page runtime: Promise proxy on window.solana (page world)
│   ├── content_script.js         # Bridge: inject + relay SIGNATURE_INTENT / decisions
│   ├── background.js             # Service worker: state, popup, policy orchestration
│   ├── translator.js             # OpenAI semantic verdict (imports policy-heuristics.js)
│   ├── policy-heuristics.js      # Shared local heuristics (extension + rel-core SDK)
│   └── forensic-certificate.js   # SHA-256 Paladin Forensic Hash + certificate text
└── ui/
    ├── popup.html / popup.js     # Physical gate: approve / block
    ├── popup.css
    ├── evidence.html / evidence.js   # Evidence Hub: hash display + JSON export
    └── dashboard.html / dashboard.js # Supplementary forensic dashboard
```

**Additional docs:** [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md) (scope & limits) · `PROMPT_ENGINEERING.md` (semantic policy pipeline) · [docs/ATTACK_SIMULATION_REPORT.md](docs/ATTACK_SIMULATION_REPORT.md) (hostile `signMessage` drill and block outcome).

---

## 🧬 Shipped: Evidence Hub & Cryptographic Forensics (Phase 1 MVP)

PaladinShield ships an active **Evidence Hub**, not only a roadmap item:

* **On-device SHA-256 fingerprinting:** On critical blocks, `forensic-certificate.js` builds a canonical integrity object (`requestId`, `timestamp`, `maliciousPayload`, `semanticAnalysis`, `forensicCertificate`) and computes `paladinForensicHash` via `crypto.subtle.digest` (SHA-256 over sorted JSON).
* **Captured context:** The payload includes page `origin`, serialized instructions or message bytes, and policy fields—sufficient for audit; it is not a full DOM tree snapshot.
* **Exportable evidence:** Open `ui/evidence.html` from the extension to review entries and download forensic JSON for third-party verification.

---

## 🚀 Architectural Trajectory (Roadmap)

### Phase 2 — Decentralized Threat Intelligence (Hive-Mind, planned)

* **Distributed cache:** Broadcasting `paladinForensicHash` to a shared threat cache so peers can hard-block matching exploit fingerprints locally (not implemented in Phase 1).
* **Local inference:** Moving semantic parsing from remote API calls to on-device inference where hardware allows (planned).

### Phase 3 — Wallet-native REL & RPC Guard (documented; extension remains the judge path)

PaladinShield is a **Runtime Enforcement Layer (REL)** — the MV3 extension is the Phase 1 proof surface; wallet-native embedding is the architectural destination (not a browser-extension product long term).

* **RPC Guard:** JSON-RPC edge policy aligned with REL semantics (**planned** — not shipped).
* **Embedded Policy SDK (`@paladinshield/rel-core`):** Same Promise-gate semantics for wallet hosts — documented for partners and technical reviewers who want depth beyond the extension. Details: [docs/SDK_ROADMAP.md](docs/SDK_ROADMAP.md) · [docs/WALLET_SDK_INTEGRATION.md](docs/WALLET_SDK_INTEGRATION.md).
* **Policy tiers & Smart Path:** Specified in [docs/ROADMAP.md](docs/ROADMAP.md). **Judged submission:** Full REL baseline. **Local REL 2.0:** Smart Path prototype with tier A/B/C routing (popup toggle); lab-verified against [docs/PALADIN_SECURITY_MANIFEST.md](docs/PALADIN_SECURITY_MANIFEST.md) catalog **E–L**.
* **Paladin Verified:** Reputation layer referenced in extension metadata; roadmap only.

#### Optional repository depth (SDK & Integration Lab)

The following artifacts support **wallet pilot conversations** and technical due diligence. They are **optional** — skip them unless you have already validated the extension.

| Addition | Purpose |
|----------|---------|
| `policy-heuristics.js` shared with SDK | Same local policy as the extension; no drift |
| `packages/rel-core/examples/wallet-shell.mjs` | Node demo: mock `window.solana` + `createRelGate` (A–D scenarios) |
| `packages/rel-core/examples/browser-demo.html` | Browser demo A–D — `npm run demo:browser` |
| `packages/rel-core/examples/wallet-lab.html` | **REL Integration Lab** — simulated signing surface + dApp (not a wallet product) |
| `@paladinshield/rel-policy` stub | Mock/HTTP `policyEngine` adapters for remote semantic policy |

**Wallet-native direction (SDK — not a wallet product).** PaladinShield is a Runtime Enforcement Layer (REL): middleware that sits **before** a wallet’s native signer, not a competitor to Phantom or any consumer wallet. The post-submit `@paladinshield/rel-core` package and the **[REL Integration Lab](packages/rel-core/examples/wallet-lab.html)** simulate how enforcement embeds in a wallet’s signing surface — policy verdict, operator approve/reject, decision-token anti-spoof, and shadow mode — so wallet teams can see the integration path without shipping a new app. The MV3 extension remains the judged demo; the SDK and Lab are optional for reviewers and partners exploring embeddable REL on Solana.

If curious (Node 18+ only, skip otherwise):

```bash
npm test
node packages/rel-core/examples/wallet-shell.mjs
npm run demo:browser
npm run demo:wallet-lab
```

Reproducibility for reviewers: **[docs/JUDGES_LAB_GUIDE.md](docs/JUDGES_LAB_GUIDE.md)** (MV3 extension lab + Integration Lab + PoC catalog E–L).

See also: [docs/SDK_ROADMAP.md](docs/SDK_ROADMAP.md) · [docs/WALLET_LAB.md](docs/WALLET_LAB.md)

---

## 🎯 Differentiation vs. Competition

| Architectural Feature | Passive Cloud Simulation (Blockaid / Blowfish) | Alert-Driven Visual UX (Pocket Universe / Kerberus) | PaladinShield (Solana REL Core) |
| :--- | :--- | :--- | :--- |
| **Execution Tier** | Off-device / asynchronous cloud API | In-page visual simulation wrapper | **On-device JavaScript execution gating** |
| **Defensive Moat** | Warning banners / risk scores | Asset-change charts / UI pop-ups | **Forced Promise hold (`Promise <pending>`)** |
| **Zero-Day Resilience** | Low (global propagation lag) | Low (visual/DOM bypass risk) | **High** (pre-sign gate; policy fail-closed; operator must approve to release) |
| **Failsafe State** | Often default-allow if API drops | Often default-allow if UI breaks | **Semantic default-deny** on API error/timeout; **physical** deny on popup close / block |
| **Forensic Capture** | Centralized proprietary stores | Typically none at pre-sign boundary | **Local SHA-256 verification & export** |

---

## 🛠️ Installation & Local Deployment (Unpacked MV3)

### Prerequisites

* Google Chrome, Brave, or another Chromium-based browser.
* (Optional) Node.js only if you work on root-level tooling in `package.json`—**not** required to load the unpacked extension.

### Step-by-step

1. Clone the repository:

   ```bash
   git clone https://github.com/barretoesco/PaladinShield.git
   cd PaladinShield
   ```

2. **(Optional) Enable semantic analysis for local demos**

   Copy `.env.example` to `.env`, set `OPENAI_API_KEY`, then sync into the extension (MV3 cannot read `.env` at runtime):

   ```bash
   cp .env.example .env
   # edit .env — add your key
   npm run env:sync
   ```

   This writes `src/extension/scripts/openai-env.js` (gitignored). Without a key, REL uses local heuristics + fail-safe only. Do not commit real keys.

3. Open `chrome://extensions/`.

4. Enable **Developer mode** (top-right).

5. Click **Load unpacked** and select the **`src/extension/`** folder from this repository.

6. **Verification:** The PaladinShield icon appears in the toolbar. Connect a wallet on a Solana dApp (e.g. Devnet faucet), trigger a signing intent, and confirm the popup gate appears before Phantom signs. See `docs/ATTACK_SIMULATION_REPORT.md` for a hostile `signMessage` test pattern.

---

## ⚖️ Open-Source Licensing & Dual Model

PaladinShield uses a **dual-licensing framework**:

### 1. Open Source Copyleft (GPL-3.0-only)

The core REL runtime (`scripts/inject.js`, `scripts/content_script.js`, promise interceptors, and related enforcement logic) is licensed under **GNU GPL v3.0 only** (`GPL-3.0-only`). See the `LICENSE` file and `package.json` field `name`: `paladinshield-rel`. Distributed derivatives that embed this engine must comply with GPL copyleft.

### 2. Commercial OEM / Enterprise SDK

Closed-source wallets, institutional dApps, and enterprise platforms may obtain a **private commercial license** to integrate the containment engine without triggering copyleft on their proprietary codebases, including support and customized policy thresholds.

---

*Disclaimer: PaladinShield enforces security at local JavaScript signing boundaries. Persistent `pending` promises and aborted flows after explicit deny or popup close are intentional states designed to preserve assets under hostile page conditions.*
