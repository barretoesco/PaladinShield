# PaladinShield Wallet SDK Integration (`@paladinshield/rel-core`)

Phase 3 starter package for **wallet-native** Runtime Enforcement Layer (REL). The MV3 extension remains the public demo; this SDK exposes the same contracts for embeddable Promise gating.

**Audience:** Solana wallet teams, browser wallet shells, institutional signing surfaces — not consumer dApp developers (users inherit protection via wallet, not per-app integration).

## Install (monorepo / local path)

```bash
npm install file:./packages/rel-core
```

## Core API

| Export | Role |
|--------|------|
| `evaluateIntent(intent, { policyEngine })` | Local heuristics first; optional async remote policy |
| `isCriticalVerdict(verdict)` | `true` for `Alto` / `Bloquear` |
| `createRelGate(options)` | Promise gate around any signing function |
| `wrapSolanaProvider(provider, options)` | Drop-in wrap for `signTransaction` / `signAllTransactions` / `signMessage` |
| `computePaladinForensicHash(inner)` | SHA-256 anchor (Evidence Hub compatible) |
| `buildForensicReport({ requestId, maliciousPayload, semanticAnalysis })` | Forensic JSON bundle |

## Minimal wallet integration (~15 lines)

```javascript
import {
  evaluateIntent,
  wrapSolanaProvider,
  buildForensicReport,
  isCriticalVerdict,
} from "@paladinshield/rel-core";

const provider = wrapSolanaProvider(window.solana, {
  origin: window.location.origin,
  evaluateIntent: (intent) =>
    evaluateIntent(intent, {
      policyEngine: async (payload) => {
        const res = await fetch("https://your-policy-service/v1/audit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        return res.json(); // { riesgo, accion, mensaje }
      },
    }),
  requestUserDecision: async ({ intent, verdict, requestId }) => {
    if (isCriticalVerdict(verdict)) return "block";
    const approved = await myWalletUi.confirm({ intent, verdict, requestId });
    return approved ? "approve" : "block";
  },
  hardBlockOnCritical: true,
  onBlocked: async (intent, verdict) => {
    const report = await buildForensicReport({
      requestId: intent.requestId,
      maliciousPayload: intent,
      semanticAnalysis: verdict,
    });
    await myWalletUi.showForensic(report);
  },
});
```

## Policy verdict contract

```json
{
  "riesgo": "Alto|Medio|Bajo",
  "accion": "Bloquear|Advertir|Confiar",
  "mensaje": "Accion: ... Analisis: ..."
}
```

Same JSON shape as the MV3 extension semantic engine (`translator.js`).

## Scope honesty

`@paladinshield/rel-core` v0.1.0 ships:

- Local heuristics (`signMessage` phishing patterns, honey-pot structural checks)
- Promise gate primitives
- Forensic hash utilities

It does **not** ship: OpenAI client, MV3 bridge, RPC Guard, or full certificate narrative formatting (see extension `forensic-certificate.js` for production-grade exports).

## Related

- Extension demo: `src/extension/`
- Post-submit hardening: `docs/POST_SUBMIT_SECURITY_HARDENING.md`
- Threat model limits: extension README + `SECURITY_ROADMAP.md`
