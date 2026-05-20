# PaladinShield Wallet SDK Integration (`@paladinshield/rel-core`)



> **Status: Phase 3 post-submit (v0.3.x in development).**  

> Not required to judge the hackathon demo. **Shipped product today:** MV3 extension in `src/extension/`.



Wallet-native Runtime Enforcement Layer (REL) — same policy contract as the extension, embeddable via Promise gating.



**Audience:** Solana wallet teams and signing surfaces — not per-dApp integration.



## Install (monorepo)



```bash

npm install file:./packages/rel-core

```



## Core API (v0.3.x)



| Export | Role |

|--------|------|

| `evaluateIntent(intent, { policyEngine })` | Local heuristics first; optional remote policy |

| `evaluatePayloadAuditMarkers(intent)` | Tx/memo audit markers (hostile drill patterns) |

| `isCriticalVerdict(verdict)` | `true` for `Alto` / `Bloquear` |

| `createRelGate(options)` | Promise gate around any signing function |

| `createRelGateWithTokens(options)` | Gate with decision-token registration + validation |

| `wrapSolanaProviderWithTokens(provider, options)` | Provider wrap with built-in token-safe operator flow |

| `simulateSpoofApprove(registry, requestId)` | Anti-spoof drill helper for demos |

| `wrapSolanaProvider(provider, options)` | Wrap `signTransaction`, `signAllTransactions`, `signMessage`, `signAndSendTransaction` |

| `buildFullCertificateText(inner)` | Full forensic certificate (extension parity) |

| `computePaladinForensicHash(inner)` | SHA-256 anchor (Evidence Hub compatible) |

| `buildForensicReport({ requestId, maliciousPayload, semanticAnalysis })` | Forensic JSON envelope + hash |

| `createDecisionToken()` | Reference token generator for wallet hosts |

| `createDecisionTokenRegistry()` | In-memory registry (replace in production) |

| `acceptOperatorDecision(...)` | Validate token before releasing gate |



## Runnable examples



```bash

npm test

node packages/rel-core/examples/wallet-shell.mjs

node packages/rel-core/examples/wallet-with-tokens.mjs

node packages/rel-policy/examples/policy-hook-demo.mjs

npx --yes serve . -p 3456
# → http://localhost:3456/  (redirects to browser demo)

```



## Minimal wallet integration



```javascript

import {

  evaluateIntent,

  wrapSolanaProvider,

  buildForensicReport,

  isCriticalVerdict,

  createDecisionToken,

  createDecisionTokenRegistry,

  acceptOperatorDecision,

} from "@paladinshield/rel-core";



const tokenRegistry = createDecisionTokenRegistry();



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

        return res.json();

      },

    }),

  requestUserDecision: async ({ intent, verdict, requestId }) => {

    if (isCriticalVerdict(verdict)) return "block";



    const decisionToken = createDecisionToken();

    tokenRegistry.register(requestId, decisionToken);



    const approved = await myWalletUi.confirm({ intent, verdict, requestId });

    if (!approved) return "block";



    return acceptOperatorDecision("approve", decisionToken, tokenRegistry, requestId)

      ? "approve"

      : "block";

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



## Remote policy (`@paladinshield/rel-policy` stub)



When local heuristics return `null`, wire a remote semantic engine via `policyEngine`:



```javascript

import { evaluateIntent } from "@paladinshield/rel-core";

import { createRemotePolicyClient } from "@paladinshield/rel-policy";



const policyEngine = createRemotePolicyClient({

  endpoint: "https://your-policy-service/v1/audit",

});



const verdict = await evaluateIntent(intent, { policyEngine });

```



For pilots without a backend yet, use `createMockPolicyEngine()` — see `packages/rel-policy/examples/policy-hook-demo.mjs`.



## Policy verdict contract



```json

{

  "riesgo": "Alto|Medio|Bajo",

  "accion": "Bloquear|Advertir|Confiar",

  "mensaje": "Accion: ... Analisis: ..."

}

```



Canonical heuristics: `src/extension/scripts/policy-heuristics.js` (shared with SDK).



## Scope (v0.3.x)



| Shipped | Roadmap |

|---------|---------|

| Local heuristics + audit markers | Hosted policy backend (production) |

| Promise gate + all four sign methods | Production wallet UI kit |

| Full forensic certificate + hash parity | npm publish |

| Decision-token reference | `@paladinshield/rel-policy` mock/HTTP stub |

| Decision-token reference helpers | RPC Guard |

| Node + browser demos | Remote policy OpenAI client in SDK |



See [SDK_ROADMAP.md](./SDK_ROADMAP.md) · [WALLET_PILOT.md](./WALLET_PILOT.md) · [THREAT_MODEL.md](./THREAT_MODEL.md)



## Related



- Extension demo: `src/extension/`

- Post-submit hardening: `docs/POST_SUBMIT_SECURITY_HARDENING.md`

