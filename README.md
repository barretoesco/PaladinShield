# PaladinShield 🛡️

**Category:** Security Tools & Infrastructure  
**Sub-Category:** Runtime Enforcement Layer (REL) for Solana  
**Architecture:** Manifest V3 Unpacked Extension (Page Injection Context)  
**Author:** Andrés Barreto (Lead Infrastructure Architect)  

PaladinShield is an infrastructure-grade, low-level browser containment layer designed to secure user intent in Web3. Unlike passive, alert-driven extensions that operate as post-execution advisory tools, PaladinShield enforces security policies directly inside the browser's JavaScript runtime environment **before any signature payload can ever reach the wallet provider interface**.

---

## 🔬 Core Problem: The Myth of Passive Security

Web3 transaction signing currently operates under an architecture that suffers from extreme human risk. Legacy solutions—including passive simulation layers and visual contract analyzers—rely strictly on *Alert-Driven UX*. They parse payloads asynchronously, display warning highlights or risk scores on-screen, and leave the execution pathway wide open.

Under acute market stress, phishing scenarios, or psychological FOMO, users frequently experience *Alert Fatigue*, override warnings, and finalize compromised transaction promises. If the malicious script host has active access to the injected wallet object, a distracted user results in total capital destruction.  

---

## ⚡ The Solution: PaladinShield Runtime Enforcement Layer (REL)

PaladinShield moves the defensive perimeter from the visual interface straight into the browser’s JavaScript execution thread, introducing a deterministic barrier on-device.

### 1. Default-Deny Asynchronous Promise Gating
Operating as a specialized Promise Proxy, PaladinShield intercepts the global `window.solana` provider object via an early-stage self-executing script (`inject.js`) evaluated at millisecond zero (`document_start`).  

When a dApp triggers critical provider signing pipelines—specifically `signTransaction`, `signAllTransactions`, or `signMessage`—the execution path is physically trapped. PaladinShield forces the asynchronous sequence to remain in a persistent `pending` state. The native wallet extension is completely decoupled from the runtime; until explicit manual authorization is granted through our secure transaction portal, the promise remains unresolved, preventing any communication down-stream to the signing layer.
---

## 🛠️ System Architecture & File Registry

The containment engine maps a secure enforcement structure inside the browser via isolated Manifest V3 execution contexts:

```text
src/extension/
├── manifest.json              # Extension manifest (Programmatic scripts, MV3 declaration)
├── inject.js                  # Page Runtime Layer: Hooks the window provider context at document_start
├── content_script.js          # Isolated Bridge: Facilitates secure context serialization between page and extension
├── background.js              # Orchestration Engine: Coordinates state, popup state, and blocks lifecycle routines
├── forensic-certificate.js    # Cryptographic Engine: Generates on-device SHA-256 evidence footprints
├── translator.js              # Semantic Processor: Executes multi-vector threat profile queries via LLM API
└── ui/
    ├── popup.html / popup.js  # Physical Gate: High-fidelity user verification and transaction authorization portal
    ├── evidence.html / .js    # Evidence Hub: Verifiable forensic dashboard displaying captured exploit footprints
    └── popup.css              # Glassmorphism Security Interface UI
```
---

## 🧬 Shipped: Evidence Hub & Cryptographic Forensics (Fase 1 MVP)

Unlike theoretical roadmaps, PaladinShield ships with an active **Evidence Hub** designed to generate immutable proof-of-work documentation for every intercepted threat:

* **On-Device SHA-256 Fingerprinting:** When an exploit vector or malicious instruction schema is caught by the Promise gate, `forensic-certificate.js` compiles the raw transaction parameters, metadata origin (`context.origin`), and DOM state into an unalterable package, passing it through a deterministic SHA-256 calculation to produce a unique `paladinForensicHash`.
* **Exportable JSON Evidence:** Users and security researchers can access `ui/evidence.html` to review, analyze, and export local forensic JSON reports of the blocked signature vector, turning silent attacks into auditable data streams.

---

## 🚀 Architectural Trajectory (The Roadmap of Force)

### Phase 2 — Decentralized Threat Intelligence Network (The Hive-Mind Update)
* **Distributed Cache Proximity:** Broadasting the local `paladinForensicHash` to a distributed network cache. Peer nodes hitting the exact same mutated exploit code cross-reference hashes in microseconds, enforcing a hard-block at zero external compute overhead.
* **Local Inference Integration:** Transitioning the semantic parser from remote API calls to a localized, hardware-accelerated inference sub-routine running directly within the client architecture.

### Phase 3 — RPC Guard & Embedded Policy SDK
* **RPC Guard:** A filtered Solana JSON-RPC endpoint layer designed to enforce matching validation semantics directly at the infrastructure node tier.
* **Embedded Policy SDK:** Packaging the containment engine into a lightweight, modular, wallet-agnostic SDK (`@paladinshield/rel-sdk`) for native integration into leading Solana wallets and institutional dApp runtimes.
* ---

## 🎯 Differentiation vs. Competition

| Architectural Feature | Passive Cloud Simulation (Blockaid / Blowfish) | Alert-Driven Visual UX (Pocket Universe / Kerberus) | PaladinShield (Solana REL Core) |
| :--- | :--- | :--- | :--- |
| **Execution Tier** | Off-device / Asynchronous Cloud API | In-page Visual Simulation Wrapper | **On-Device / JavaScript Execution Gating** |
| **Defensive Moat** | Warning banners / Risk scores | Asset-change charts / UI Pop-ups | **Forced Promise Hijacking (`Promise <pending>`)** |
| **Zero-Day Resilience** | Low (Requires global propagation lag) | Low (Vulnerable to visual/DOM overrides) | **Absolute** (Default-Deny blocks unknown vectors) |
| **Failsafe State** | Default-Allow (Fails open if API drops) | Default-Allow (Fails open if DOM breaks) | **Default-Deny (Fails closed on timeout/error)** |
| **Forensic Capture** | Centralized in proprietary databases | None (Volatile runtime alert states) | **Local SHA-256 Verification & Export** |

---

## 🛠️ Installation & Local Deployment (Unpacked Manifest V3)

Follow these steps to load and test PaladinShield locally in developer mode:

### Prerequisites
* Google Chrome, Brave, or any Chromium-based browser.
* Node.js environment installed (for local dependencies).

### Step-by-Step Setup

1. Clone this repository to your local machine:
   ```bash
   git clone [https://github.com/your-username/paladinshield.git](https://github.com/your-username/paladinshield.git)
   cd paladinshield ```

2. Create a `.env` file inside the `src/extension/` directory to store your credentials:
   ```bash
   OPENAI_API_KEY=your_openai_api_key_here ```
   
3. Open your browser and navigate to the extensions management console:
   * URL: `chrome://extensions/`

4. Enable **Developer mode** by toggling the switch in the top-right corner.

5. Click on the **Load unpacked** (*Cargar descomprimida*) button in the top-left corner.

6. Select the `src/extension/` directory from this local repository folder.

7. **Verification:** The PaladinShield icon will appear in your extension bar. Connect to any Solana dApp on Devnet to test the default-deny promise gating.
---

## ⚖️ Open-Source Licensing & Dual-Model

PaladinShield is committed to securing the Web3 ecosystem as a core Public Good while safeguarding its underlying innovative engineering through a strategic **Dual-Licensing Framework**:

### 1. Open Source Copyleft Tier (GPL-3.0-only)
The core codebase, client runtime logic (`inject.js`, `content_script.js`), and deterministic promise interceptors hosted in this repository are strictly licensed under the **GNU General Public License v3 (GPL-3.0-only)**. Any distributed derivative work, consumer wallet modification, or open ecosystem fork that integrates this engine **must** remain entirely open-source, publishing its full codebase under the exact same GPL v3 copyleft terms.

### 2. Private Commercial & Enterprise SDK Tier (OEM License)
For institutional dApps, closed-source consumer applications, sovereign wallet providers, and enterprise DeFi platforms that require the security infrastructure of PaladinShield without exposing their proprietary codebases to copyleft terms, a private **Commercial OEM License** is available. This grants legal access to package the containment engine into closed runtimes, including enterprise support agreements and customized heuristic threshold controls.

---

*Disclaimer: PaladinShield enforces security at the local JavaScript execution boundaries. Spontaneous process termination or persistent pending promises are by-design states implemented to guarantee asset preservation under hostile environment vectors.*
