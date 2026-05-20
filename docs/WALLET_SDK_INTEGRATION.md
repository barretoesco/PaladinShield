# PaladinShield Wallet SDK Integration (`@paladinshield/rel-core`)

> **Status: in development (Phase 3 roadmap).**  
> This package is an **early reference starter** — API surface and contracts aligned with the MV3 extension, plus a Node smoke example. It is **not** a finished wallet SDK and is **not** required to run or judge the hackathon demo. **Shipped and functional today:** the MV3 extension in `src/extension/`.

Phase 3 target: **wallet-native** Runtime Enforcement Layer (REL). The extension remains the public demo vehicle; `@paladinshield/rel-core` documents where the same enforcement logic is heading for embeddable Promise gating.

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

Same JSON shape as the MV3 extension semantic engine (`translator.js` + `policy-heuristics.js`).

## Policy source of truth

Local heuristics: **`src/extension/scripts/policy-heuristics.js`** (shipped with the extension). `@paladinshield/rel-core` imports that module — judges evaluate the extension; SDK folder shows post-submit direction only. See [SDK_ROADMAP.md](./SDK_ROADMAP.md).

## Scope honesty

`@paladinshield/rel-core` v0.1.0 is **roadmap scaffolding**, not a release candidate:

| Shipped in starter | Not shipped (roadmap) |
|--------------------|---------------------|
| Local heuristics (`signMessage` patterns, honey-pot checks) | OpenAI / remote policy client |
| Promise gate primitives (`createRelGate`, `wrapSolanaProvider`) | MV3 bridge, popup UX, decision tokens |
| Forensic hash helpers | Full certificate narrative (`forensic-certificate.js` parity) |
| Smoke example (`examples/smoke.mjs`) | npm publish, wallet partner integration, RPC Guard |

We only document this folder to show **direction and API intent** post-hackathon — same policy contract as `translator.js`, embeddable beyond the browser extension.

## Related

- Extension demo: `src/extension/`
- Post-submit hardening: `docs/POST_SUBMIT_SECURITY_HARDENING.md`
- Threat model limits: extension README + `SECURITY_ROADMAP.md`
