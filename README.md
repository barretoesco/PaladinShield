# PaladinShield 🛡️

**Category:** Security Tools & Infrastructure  
**Sub-Category:** Runtime Enforcement Layer (REL) for Solana  

PaladinShield is an infrastructure-grade, low-level browser containment layer designed to eradicate user vulnerability in Web3. Unlike passive, alert-driven extensions that operate as post-execution advisory tools, PaladinShield enforces security policy directly inside the browser's JavaScript runtime environment before any signature payload can ever reach the wallet interface.

---

## 🔬 Core Problem: The Myth of Passive Security

Web3 transaction signing currently operates under an architecture that suffers from extreme human risk. Legacy solutions—including passive simulation layers and visual contract analyzers—rely strictly on **Alert-Driven UX**. They parse payloads asynchronously, display warning highlights or risk scores on-screen, and leave the execution pathway entirely open.

Under acute market stress or psychological FOMO, users frequently experience **Alert Fatigue**, override warnings, and finalize compromised transaction promises. If the malicious script host has active access to the injected wallet object, a distracted or panicked user results in total capital destruction.

---

## ⚡ The Solution: PaladinShield Runtime Enforcement Layer (REL)

PaladinShield moves the defensive perimeter from the visual interface straight into the browser’s low-level execution thread, introducing a deterministic barrier on-device.

### 1. Default-Deny Asynchronous Promise Gating
Operating as a true **Promise Proxy**, PaladinShield hijacks the global `window.solana` provider object via an early-stage self-executing function (`inject.js`) at the millisecond zero (`document_start`). 

When a dApp triggers `signTransaction`, `signAllTransactions`, or `signMessage`, the execution path is intercepted. PaladinShield traps the asynchronous sequence and forces the Promise to remain in a persistent `pending` state. The native wallet extension is completely decoupled from the runtime; until explicit manual authorization is given through our secure portal, the transaction logically does not exist to the wallet's hardware or signing layer.

### 2. On-Device Deterministic Hard-Blocking
Instead of introducing latency by querying heavy external databases for every transaction, PaladinShield implements a strict local state machine inside the client context. 
* **The Perimetric Lock:** The extension evaluates execution safety parameters locally within the browser's thread memory layout.
* **Default-Deny Termination:** If a user closes, evades, or omits the secure verification window, the `inject.js` proxy layer intentionally aborts the transaction pipeline and terminates the promise chain via a forced local exception (`inject.js:267`). No communication packets are sent down-stream to the wallet.

### 3. signMessage Parity
Off-chain phishing vectors (such as blind-signing malicious session handshakes or SIWE/DApp ledger forgery payloads) are treated with the exact same architectural rigor as raw byte transaction flows. By proxying the entire provider interface on-device, the containment layer blocks modern, sophisticated session-takeover attacks natively.

---

## 🛠️ System Architecture

The current implementation maps an unbreachable sandbox inside the browser's sandboxed environment via standard Manifest V3 isolation:

* **`inject.js` (Page Runtime Layer):** Performs structural proxying of the native provider methods. It isolates the page code inside a secure execution fence at `document_start`.
* **`content_script.js` (Isolated Bridge):** Formulates secure context serialization, relaying blocked transaction inputs and raw instruction data to the extension's backend without leaks.
* **`background.js` (Orchestration Engine):** Manages local state management, intercepts tab context changes, and coordinates deterministic blocking rules based on structural execution vectors.
* **`popup.html` (The Physical Gate):** High-fidelity user enforcement portal. Spontaneous closure or omission of the window defaults to a persistent pending lock, keeping wallet parameters secure.

---

## 🚀 Architectural Trajectory (The Roadmap of Force)

### Phase 1 — Local Browser REL & Deterministic Core (Current Hackathon MVP)
Full implementation of the Manifest V3 programmatic interceptors, client-side automated context decoding, and the deterministic on-device `Default-Deny` Promise control engine.

### Phase 2 — Decentralized Threat Intelligence Network & Forensic Hub (The Hive-Mind Update)
* **Idempotent Cryptographic Hashes:** Evolution into a synchronized network immune system. When an endpoint flags a zero-day exploit, it compiles a forensic signature containing structural instruction bytes, destination schemas, and originating DOM metadata (`context.origin`), sealing it via a deterministic SHA-256 calculation to generate a unique `paladinForensicHash`.
* **Distributed Cache Proximity:** This unique hash will be broadcasted to a distributed threat cache. The remaining users hitting the exact same mutated exploit code will cross-reference the hash locally in microseconds, applying a Hard-Block at zero compute cost and zero external token latency. One user pays the cognitive processing cost; the entire colmena gets immunized.
* **Contextual Heuristic LLM Layer:** Offloading raw parameters from `background.js` to a tailored local inference sub-routine for multi-vector threat profile assessment.

### Phase 3 — RPC Guard & Embedded Policy SDK
* **RPC Guard:** A filtered Solana JSON-RPC endpoint layer designed to enforce matching validation semantics directly at the infrastructure node tier.
* **Embedded Policy SDK:** Packaging the containment engine into a lightweight, modular, wallet-agnostic SDK for native integration into leading Solana wallets and institutional dApp runtimes (including mobile environments).

---

## 🎯 Differentiation vs. Competition

| Architectural Feature | Passive Cloud Simulation (Blockaid / Blowfish) | Alert-Driven Visual UX (Pocket Universe / Kerberus) | PaladinShield (Solana REL Core) |
| :--- | :--- | :--- | :--- |
| **Execution Tier** | Off-device / Asynchronous Cloud API | In-page Visual Simulation Wrapper | **On-Device / Single-Threaded Memory Gating** |
| **Defensive Moat** | Warning banners / Risk scores | Asset-change charts / UI Pop-ups | **Forced Promise Hijacking (`Promise {
