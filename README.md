# PaladinShield

**Category:** **Runtime Enforcement Layer (REL)** for Solana — not a passive “security tool.” PaladinShield is **infrastructure-grade compliance**: policy executes in the **browser’s runtime** before signatures exist.

We understand the pain of losing assets from a single careless click. **PaladinShield stops execution at the provider boundary, default-deny, with forensic artifacts you can verify offline.**

---

## Why PaladinShield?

### Default-Deny Gating (vs. visual-only layers)
Competitors such as **GuardSOL** or **Iteration 0001** rightly stress simulation, scoring, or education — often experienced as **UI and alerts**. PaladinShield **hijacks the wallet’s Promise flow**: the wrapped `signTransaction` / `signAllTransactions` / `signMessage` calls **do not resolve** until policy and explicit user authorization allow it. **Without authorization, the signature does not exist.** That is enforcement **in code paths**, not only on screen.

### Forensic-First
We are the layer that produces **verifiable artifacts at the point of attack**: each report includes a human-readable **`forensicCertificate`** and a **`paladinForensicHash`** (SHA-256 over canonical integrity fields). Evidence is bound to the verdict — **tamper the JSON or the certificate text, and the hash fails.**

### signMessage Parity
**Session phishing and off-chain prompts** (e.g. SIWE-style `signMessage`) are gated with the **same rigor as on-chain transactions**. Many extensions under-specify this surface; we do not.

### Roadmap of Force — Phase 2
PaladinShield does **not** end in the browser. **Phase 2** moves policy to the **network edge**:

- **RPC Guard** — filtered Solana JSON-RPC: policy derived from the same enforcement semantics you already run locally, applied at the node / endpoint.
- **Paladin Verified** — a **dynamic allowlist** of safer dApps and reputational signal, **fed by community forensic exports** (hashes + certificates), becoming a **source of truth for filtering at the RPC boundary** — not another static vendor list.

Mobile extension browsers and a B2B policy SDK remain on the map; the **north star** is **edge + attestation**, not a lone extension.

---

## What It Does
- **Integridad Criptográfica de Extremo a Extremo: Cada reporte genera un Hash Forense inmutable que vincula la evidencia técnica con el veredicto humano** (`forensicCertificate` + `paladinForensicHash` sobre el payload canónico).
- Intercepts `signTransaction`, `signAllTransactions`, and **`signMessage`** at the provider level.
- Uses **deterministic Promise gating** so wallet execution stays paused until explicit approval under policy.
- Runs Groq (`llama-3.1-8b-instant`) as the **semantic policy engine** inside the REL — structured verdict (`riesgo`, `accion`, `mensaje`) under default-deny, never free-form assistant mode.
- Blocks high-risk flows and persists **forensic packages** for audit and interoperability.

## Core Architecture (REL)
- **Page runtime:** `inject.js` wraps `window.solana` methods — the enforcement surface.
- **Bridge:** `content_script.js` relays intents to the extension runtime.
- **Orchestration:** `background.js` — analysis, decisions, forensic persistence.
- **Human gate:** `popup.html` — authorization UI; closing it remains a hard block.

## MVP Promise
Default-deny: closing or ignoring the gate **does not** release the Promise. The wallet does not receive the signing call until the user actively allows **after** context and policy.

## Differentiation vs Competition
- **REL vs. non-enforcing NLP:** We do not ship a copilot that only narrates risk; we **enforce** a gate the dApp cannot bypass in-page—the model feeds **policy verdict**, not open-ended assistance.
- **Vs. GuardSOL / Iteration-style stacks:** They overlap on risk and sim; our **unfair advantage** is **Promise seizure + forensic hash + signMessage parity** as one productized story.
- Evidence objects are structured for **downstream immutability** (e.g. optional on-chain reporting) and **third-party verification** of the same bytes the user sees.

## 🚀 Roadmap (Infrastructure Trajectory)

### Phase 1 — Now: Browser REL + Forensic Evidence Hub
Runtime enforcement in MV3, certificates and **Paladin Forensic Hash**, export pipeline.

### Phase 2 — RPC Guard + Paladin Verified
Phase 2 is **not** a loose promise: it is the **projection** of the same REL semantics you prove today—verdict taxonomy, origins, forensic hashes—from **browser telemetry** onto the **RPC edge**. Operators who already gate locally would point wallets at an endpoint that applies **matching policy classes** derived from aggregated field reports (fewer naive calls, reputational choke points).

- **RPC Guard:** JSON-RPC tier applies allow/deny/query shaping using signals raised by the REL (including Paladin Verified feeds).
- **Paladin Verified:** dynamic trust surface fed by **exported forensic artifacts** (`paladinForensicHash`, certificates)—the REL in the browser remains the **attestation origin**; RPC is enforcement at scale.

### Phase 3 — Distribution & SDK
Mobile-capable browsers (Kiwi, Mises, etc.), and a **PaladinShield policy SDK** so wallets and infra can embed the same enforcement semantics.

### Pitch
**PaladinShield is wallet-agnostic REL infrastructure. The extension is Phase 1; the network edge is Phase 2.**
