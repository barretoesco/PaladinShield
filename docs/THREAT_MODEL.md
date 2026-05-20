# PaladinShield REL — Threat model (scope & limits)

**Last updated:** 2026-05-19  
**Applies to:** MV3 extension (`src/extension/`) and SDK scaffold (`packages/rel-core/`)

This document states what PaladinShield **does** enforce, what it **does not** guarantee, and where responsibility remains with the wallet, user, or operator.

---

## Trust boundaries

```text
[ Hostile dApp / page JS ]
        │
        ▼
┌───────────────────────────────┐
│  PaladinShield REL (gate)     │  ← Promise hold + policy + operator decision
│  inject / wallet wrap         │
└───────────────────────────────┘
        │ approve only
        ▼
[ Wallet native signer / RPC ]
        │
        ▼
[ Solana cluster ]
```

REL operates **above** the wallet signer interface, not inside the wallet binary or on-chain programs.

---

## In scope (what we mitigate)

| Threat | Mechanism | Extension | SDK |
|--------|-----------|-----------|-----|
| Unauthorized sign while operator distracted | Promise gate until explicit approve | ✅ | ✅ (host must implement UI) |
| Hostile `signMessage` / social engineering text | Local heuristics + semantic policy | ✅ | ✅ heuristics; remote policy optional |
| Critical policy bypass via “trust UI” | Hard-block on `Alto` / `Bloquear` | ✅ v0.1.3+ | ✅ `hardBlockOnCritical` |
| Popup close / no decision | Default-deny reject | ✅ | Host responsibility |
| Policy engine unavailable | Fail-closed local verdict (extension); SDK fallback `Advertir` | ✅ | ✅ |
| Faucet false positives (utility origins) | `policy-heuristics.js` utility path | ✅ | ✅ shared module |
| Honey-pot style tx patterns (heuristic) | Local structural checks | ✅ | ✅ |
| Audit trail for blocks | SHA-256 forensic hash + export | ✅ Evidence Hub | ✅ hash helpers |
| Spoofed approve via page `postMessage` | Decision tokens + isolated delivery (extension) | ✅ v0.1.3+ | ❌ host must implement equivalent |
| Bypass via `signAndSendTransaction` | All standard wallet sign entry points wrapped | ✅ v0.1.4+ | ✅ v0.2.0+ |

---

## Partially in scope (best-effort)

| Area | Limit |
|------|--------|
| Transaction semantic risk | OpenAI JSON verdict (extension demo); timeout → fail-safe |
| Zero-day contract semantics | Heuristics + model inference — not formal verification |
| Malicious but syntactically benign txs | May reach operator as `Advertir` |
| Compromised benign origin | Detected when payload misaligns with origin profile (semantic path) |

---

## Out of scope (explicit non-goals)

| Area | Why |
|------|-----|
| **RPC Guard / node filtering** | Roadmap Phase 3 — not shipped |
| **On-chain enforcement** | REL is pre-sign client/runtime |
| **Wallet firmware / secure element** | Outside browser JS layer |
| **Phishing outside signing (fake sites, email)** | User education + browser URL bar |
| **Malware on OS** | Cannot protect against keyloggers reading seed offline |
| **Insider operator approves drain** | REL informs; human can override non-critical |
| **API key secrecy in unpacked MV3 demo** | Demo may embed key; production needs backend proxy |
| **MEV, sandwich, private mempool** | Different problem class |
| **NFT metadata / off-chain URLs** | Not parsed unless in sign payload |

---

## Attacker model (simplified)

**Assumed attacker can:**

- Run JavaScript in page context (malicious dApp or XSS)
- Call `window.solana` signing methods with attacker-chosen payloads
- Social-engineer user via message text and UI copy
- Attempt to spoof extension messages (extension hardening targets this)

**Assumed attacker cannot (without separate bugs):**

- Release signing Promise without REL approve path (extension inject path)
- Force `Confiar` on hard-blocked critical verdict (v0.1.3+)
- Bypass REL by calling wallet directly **if** all signing entry points are wrapped and host enforces gate (`signTransaction`, `signAllTransactions`, `signMessage`, `signAndSendTransaction` since v0.1.4)

---

## Extension vs SDK responsibilities

| Concern | Extension | SDK |
|---------|-----------|-----|
| Physical signing intercept | `inject.js` on `window.solana` | Wallet embeds `wrapSolanaProvider` |
| Operator UI | Popup | Wallet team |
| Decision anti-spoof | `background.js` tokens | Wallet team |
| Semantic policy | `translator.js` + OpenAI | Optional `policyEngine` hook |
| Evidence export UI | `evidence.html` | Wallet or backend |

---

## Residual risk statement

PaladinShield reduces **accidental and coerced signing under hostile page conditions**. It does **not** replace wallet secure storage, hardware keys, user diligence, or institutional approval workflows.

Persistent `pending` promises and user-visible rejects after deny or popup close are **intentional** security states.

---

## Related

- [ATTACK_SIMULATION_REPORT.md](./ATTACK_SIMULATION_REPORT.md) — hostile `signMessage` drill  
- [POST_SUBMIT_SECURITY_HARDENING.md](./POST_SUBMIT_SECURITY_HARDENING.md) — v0.1.3 extension hardening  
- [WALLET_PILOT.md](./WALLET_PILOT.md) — wallet integration pilot (generic)  
- [SDK_ROADMAP.md](./SDK_ROADMAP.md) — Phase 3 direction  
