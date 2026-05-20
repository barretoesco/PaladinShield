# @paladinshield/rel-policy

**Post-submit stub** — mock and HTTP adapters for the `policyEngine` hook in `@paladinshield/rel-core`.

Not production-ready. Not submission scope. Use to show wallet teams where **remote semantic policy** plugs in after local heuristics.

## Install (monorepo)

```bash
npm install file:./packages/rel-policy
```

Peer: `@paladinshield/rel-core` (optional in demos — import via relative paths in examples).

## API

| Export | Role |
|--------|------|
| `createMockPolicyEngine(options)` | Scripted async `policyEngine` with rules + latency |
| `createRemotePolicyClient(options)` | POST intent JSON → `PolicyVerdict`; fail-closed on errors |
| `buildFailClosedVerdict(reason, intent)` | Alto/Bloquear when remote is down |
| `buildUtilityFailSafeVerdict(reason, intent)` | Utility-origin soft warn (extension parity) |
| `normalizeVerdict(raw)` | Validate remote JSON against REL contract |

## Run

```bash
node packages/rel-policy/examples/policy-hook-demo.mjs
npm test   # from repo root — includes rel-policy tests
```

## Integration pattern

```javascript
import { evaluateIntent } from "@paladinshield/rel-core";
import { createRemotePolicyClient } from "@paladinshield/rel-policy";

const policyEngine = createRemotePolicyClient({
  endpoint: "https://your-policy-service/v1/audit",
  headers: { Authorization: "Bearer …" },
});

const verdict = await evaluateIntent(intent, { policyEngine });
```

Local heuristics in `rel-core` always run first; `policyEngine` only applies when they return `null`.
