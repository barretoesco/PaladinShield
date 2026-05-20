# @paladinshield/rel-core — Changelog

## 0.4.1 — 2026-05-19 (post-submit)

- **`createRelGateWithTokens` / `wrapSolanaProviderWithTokens`** — decision-token flow built into the gate
- **`simulateSpoofApprove`** — reference anti-spoof drill helper
- **Integration Lab:** decision-token UI + spoof button; real `@solana/web3.js` transaction fixtures
- **`solana-fixtures.js`** — web3.js via esm.sh bundle in browser (plain fallback offline)

## 0.4.0 — 2026-05-19 (post-submit)

- **Intent normalization:** `normalizeSigningIntent` — canonical parity with MV3 `inject.js` via `intent-normalizer.js`
- **Gate:** structured intents with `programIds`, instruction `dataHex`, message analysis fields
- **Shadow mode:** `mode: 'shadow'` + `onShadowVerdict` for pilot log-only rollout
- **REL Integration Lab:** `wallet-lab.html` — signing surface simulator + dApp panel (not a wallet product)
- **Tests:** intent normalizer + shadow mode coverage

## 0.3.x — 2026-05-19 (post-submit, continued)

- **Browser demo:** scenarios A–D including `signAndSendTransaction` + forensic hash
- **Browser demo UX:** serve from repo root; demo index at `http://localhost:3456/`
- **`wallet-with-tokens.mjs`:** decision-token anti-spoof reference for wallet hosts
- **Docs:** `WALLET_SDK_INTEGRATION.md`, `THREAT_MODEL` SDK token row
- **npm prep:** repository, homepage, bugs URLs

## 0.3.0 — 2026-05-19 (post-submit)

- **Forensic parity:** re-exports `forensic-certificate.js` from extension — same hash as Evidence Hub
- **Decision tokens:** reference helpers (`createDecisionToken`, registry) for wallet hosts
- **wallet-shell:** Scenario D — hostile `signAndSendTransaction` + forensic hash preview
- **Tests:** `forensic.test.mjs` (SDK ↔ extension hash parity)

## 0.2.0 — 2026-05-19 (post-submit)

- Gate unit tests, `signAndSendTransaction` in `wrapSolanaProvider`
- TypeScript `index.d.ts`, decision timeout leak fix
- `wallet-shell.mjs`, browser demo, docs (`WALLET_PILOT`, `THREAT_MODEL`)

## 0.1.x — 2026-05-19 (post-submit)

- Initial SDK scaffold: policy re-exports, `createRelGate`, minimal forensic helpers
- Unified `policy-heuristics.js` with MV3 extension
