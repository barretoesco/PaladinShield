# PaladinShield — Technical Documentation (Agentic Engineering)

**Project:** PaladinShield (ClearSign AI)  
**Category:** Runtime Enforcement Layer (REL) for Solana  
**Grant track:** [Superteam Agentic Engineering Grants](https://superteam.fun/earn/grants/agentic-engineering/)  
**Chain:** Solana  
**Demo vehicle:** Chromium MV3 extension (Phase 1)  
**Product vision:** REL embedded across Solana wallets (post-hackathon)

---

## 1. Executive summary

PaladinShield is **agentic security infrastructure** for Solana signing surfaces. It does not behave as a conversational copilot that merely explains risk. It runs an **autonomous semantic policy agent** on every signature intent, emits a **structured enforcement verdict**, and **physically gates** wallet signing Promises until policy and explicit user authorization allow execution.

**Agentic engineering** here means: an LLM-backed auditor operates in a closed loop with deterministic runtime controls—intercept → analyze → verdict → gate → forensic artifact—without requiring the user to prompt the model.

---

## 2. Problem statement

Solana users lose funds when they approve signatures they do not understand (blind signing, narrative mismatch, session phishing via `signMessage`). Existing tools often:

- **Simulate** or **warn** without holding execution.
- **Explain** transactions in natural language without enforcing default-deny.
- Operate as **wallet replacements** rather than a portable security layer.

PaladinShield targets the **execution boundary**: the moment `window.solana.signTransaction`, `signAllTransactions`, or `signMessage` is invoked.

---

## 3. What “agentic” means in PaladinShield

| Typical “AI assistant” | PaladinShield REL agent |
|------------------------|-------------------------|
| User asks questions | System **automatically** audits every intercepted intent |
| Free-form chat | **Structured JSON** only: `riesgo`, `accion`, `mensaje` |
| Suggestions | **Enforcement input** to Promise gating and UI |
| Optional UX | **Default-deny** if popup closed without approval |
| No durable artifact | **Forensic certificate + SHA-256 hash** per incident |

The LLM is configured as a **semantic policy engine** (`AUDITOR_ROLE_PROMPT` in `translator.js`), not a general assistant. System instructions explicitly forbid trusting site reputation over payload analysis and require origin-vs-payload comparison on every evaluation.

---

## 4. System architecture

### 4.1 Layer diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  Malicious or benign dApp / page                                  │
│  calls window.solana.sign* / signMessage                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  PAGE RUNTIME — inject.js                                       │
│  • Wraps signTransaction, signAllTransactions, signMessage      │
│  • Builds intent payload (instructions, origin, message text)   │
│  • Promise-gated: await decision before original.apply()        │
└────────────────────────────┬────────────────────────────────────┘
                             │ postMessage → content script
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  BRIDGE — content_script.js                                     │
│  • Relays SIGNATURE_INTENT / MESSAGE_SIGNATURE_INTENT           │
│  • chrome.runtime.sendMessage → service worker                    │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  ORCHESTRATION — background.js (MV3 service worker)             │
│  • pendingSignatureRequests Map (requestId → tab)               │
│  • State machine: idle → analyzing → completed / failed         │
│  • callAiAnalysisEngine → translator.js                           │
│  • Forensic report on Alto / Bloquear                           │
│  • User decision → dispatch to tab (approve / block)            │
└────────────────────────────┬────────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                             ▼
┌──────────────────────────┐   ┌──────────────────────────┐
│  SEMANTIC AGENT           │   │  HUMAN GATE — popup.js   │
│  translator.js             │   │  CONFIAR / BLOQUEAR      │
│  OpenAI gpt-4o-mini        │   │  GET_CURRENT_STATE sync  │
│  JSON mode + fail-safe     │   └──────────────────────────┘
└──────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────┐
│  EVIDENCE — forensic-certificate.js + evidence.html               │
│  • forensicCertificate (human-readable)                           │
│  • paladinForensicHash = SHA-256(canonical integrity JSON)      │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Core modules

| Module | Path | Responsibility |
|--------|------|----------------|
| Promise gate | `src/extension/scripts/inject.js` | Intercept and hold signing Promises |
| Bridge | `src/extension/scripts/content_script.js` | Isolated-world → extension messaging |
| Orchestrator | `src/extension/scripts/background.js` | Analysis pipeline, state, decisions |
| Semantic agent | `src/extension/scripts/translator.js` | LLM policy + heuristics |
| Forensics | `src/extension/scripts/forensic-certificate.js` | Certificate text + hash |
| Verdict UI | `src/extension/ui/popup.html`, `popup.js` | Human authorization |
| Evidence Hub | `src/extension/ui/evidence.html`, `evidence.js` | Export JSON / certificate |

---

## 5. Real-time interception flow

1. **Intercept:** Wrapped wallet method invoked; `requestId` assigned.
2. **Publish:** Intent payload sent to extension (`SIGNATURE_INTENT` or `MESSAGE_SIGNATURE_INTENT`).
3. **Hold:** `decisionPromise` created; original wallet Promise does not resolve.
4. **Analyze:** Service worker calls `translateTransaction(signatureIntent)`.
5. **Verdict:** Model returns `{ riesgo, accion, mensaje }` (validated schema).
6. **Present:** Popup shows risk level, parsed intent panels, policy action.
7. **Decide:** User approves or blocks; or popup close triggers default-deny block.
8. **Release or reject:** `inject.js` resolves or rejects `decisionPromise`; only then does the wallet method continue or fail.

**Critical property:** Closing the popup without approval does **not** release the signing Promise. This is deterministic gating, not a dismissible overlay.

---

## 6. LLM physical gating of signing Promises

### 6.1 Code-level mechanism

In `inject.js`, each wrapped method follows this pattern:

```javascript
const decisionPromise = waitForUserDecision(requestId);
publishPayload(payload);
await sleep(HOLD_MS);
await decisionPromise;  // blocks until extension + user decision
return original.apply(this, args);
```

The LLM does not directly mutate wallet state. It **feeds the enforcement layer**:

- **Input:** Serialized transaction context, origin, `originProfileHint`, program IDs, transfer signals, or decoded `signMessage` text.
- **Output:** Normalized verdict consumed by `background.js` and `popup.js`.
- **Effect:** High-risk verdicts (`Alto`, `Bloquear`) trigger forensic persistence; user must explicitly approve via `USER_DECISION_CHANNEL` or the Promise is rejected.

### 6.2 Semantic agent configuration

- **Model:** OpenAI `gpt-4o-mini` (Chat Completions API).
- **Response format:** `response_format: { type: "json_object" }` for parse-safe output.
- **Timeout:** 4 seconds (`OPENAI_REQUEST_TIMEOUT_MS`); on failure → **fail-safe** local verdict `Alto` + `Bloquear`.
- **Pre-LLM heuristics:** Honey-pot patterns, `signMessage` social-engineering keywords (fast path without API call when matched).

### 6.3 Policy rules (non-exhaustive)

- Compare **expected origin reputation** vs **actual payload**; mismatch → block.
- Never lower risk based on URL alone.
- Blind signing / claim narrative vs transfer instructions → block.
- Optional `AyudaAlAdministrador` when origin looks legitimate but payload is anomalous (compromised-site narrative).

---

## 7. Forensic and verifiability

Each critical block can produce a `PaladinShield_Forensic_Report` containing:

- `maliciousPayload` (captured intent)
- `semanticAnalysis` (verdict fields)
- `forensicCertificate` (human-readable narrative)
- `paladinForensicHash` — SHA-256 over canonical JSON of integrity fields

Tampering with certificate text or bound metadata changes the hash. The Evidence Hub exports `.json` and certificate `.txt` for auditors and downstream interoperability (e.g. threat intelligence, wallet SDK integration).

---

## 8. Validation performed

Documented attack simulation (`docs/ATTACK_SIMULATION_REPORT.md`):

- Console-injected `signMessage` with social-engineering text (`SECURITY`, `OWNERSHIP`, urgency).
- Interception at provider layer confirmed.
- Promise held until decision; attack blocked before wallet confirmation.

---

## 9. Roadmap alignment (grant relevance)

| Phase | Deliverable | Agentic role |
|-------|-------------|--------------|
| **Phase 1 (now)** | MV3 extension demo | Autonomous per-intent semantic audit + Promise gate |
| **Phase 2** | RPC Guard + Paladin Verified | Same policy semantics at network edge |
| **Phase 3** | Wallet REL SDK | Embeddable `evaluateIntent()` for all Solana wallets |

The extension is a **time-boxed demonstration vehicle**. The grant-funded work extends **agentic enforcement** toward wallet-native and ecosystem-wide deployment.

---

## 10. Security and production notes

See `SECURITY_ROADMAP.md`:

- Demo builds may embed API keys for frictionless demos; **production** uses a backend proxy, no secrets in the client.
- MV3 CSP-compliant; no inline script execution in extension pages.

---

## 11. Repository map (for reviewers)

```
src/extension/
  manifest.json
  scripts/
    inject.js              # Promise gating
    content_script.js      # Bridge
    background.js          # Orchestration
    translator.js          # Semantic policy agent (OpenAI)
    forensic-certificate.js
  ui/
    popup.html / popup.js  # Verdict UI
    evidence.html / evidence.js
docs/
  ATTACK_SIMULATION_REPORT.md
  DEMO_SCRIPT.md
  superteam-agentic-engineering/   # This grant pack
SECURITY_ROADMAP.md
README.md
```

---

## 12. Differentiation (ecosystem)

- **vs simulation-only extensions:** Physical Promise hold, not post-hoc warning.
- **vs explain-only AI (e.g. transaction narrators):** Structured verdict drives enforcement.
- **vs wallet products:** PaladinShield is **middleware** aimed at integration into existing wallets.

---

*Document version: 1.0 — Superteam Agentic Engineering grant submission pack.*
