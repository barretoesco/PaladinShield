# PaladinShield — Colosseum Submission Dev-Log (Forensic & Technical Justification)

| Field | Value |
|-------|-------|
| **Project** | PaladinShield — Runtime Enforcement Layer (REL) for Solana |
| **Category** | Security Tools & Infrastructure |
| **Build focus** | MV3 REL + Evidence Hub + default-deny Promise gating |
| **Document date** | 2026-05-18 |
| **Audience** | Colosseum judges, Solana Foundation security reviewers |

---

## Evidence inventory (repository attestation)

This dev-log is bound to **artifacts present in the PaladinShield repository** at submission time. The table below is the authoritative scope for empirical claims.

| Artifact | Path | Role in this report |
|----------|------|---------------------|
| Root package manifest | `package.json` | SPDX license field, dependency surface |
| Extension manifest | `src/extension/manifest.json` | MV3 product identity, permissions, `document_start` injection |
| Colosseum skill lockfile | `skills-lock.json` | Colosseum Copilot / resources skill provenance |
| Copilot build report | `docs/COLOSSEUM_COPILOT_REPORT.md` | Security posture, demo claims, judge review dimensions |
| Faucet-origin forensic card | `TESTING_CLEARSIGN.md` | **Committed** live-interception telemetry (`signMessage`, `spl-token-faucet.com`) |
| Attack simulation write-up | `docs/ATTACK_SIMULATION_REPORT.md` | Console `signMessage` social-engineering block path |
| Example forensic export | `REPORT_EXAMPLE.md` | Certificate / hash narrative for judges |
| REL enforcement source | `src/extension/scripts/inject.js` | Promise Proxy gate, reject at decision boundary |
| Orchestration / default-deny | `src/extension/scripts/background.js` | Popup-close block, auto-block on `Alto` / `Bloquear` |
| Semantic policy agent | `src/extension/scripts/translator.js` | Origin-vs-payload contrast, faucet lexical heuristics |

**Not found in-repo (do not treat as measured telemetry in this document):**

- Standalone JSON log for PoC label **“The Foreign Paladin” v1.5** (CDN zero-day / 5,000-lamport mutation run).
- SPDX **`GPL-3.0-only`** on `package.json` (current field: **`ISC`**; package name: **`clearsignai`**, not `paladinshield-rel`).
- Dedicated Colosseum **submission metrics** JSON beyond `skills-lock.json`, `manifest.json`, and `package.json`.

Where this report references PoC **v1.5**, it does so as the **architectural attack class** aligned with README and REL code paths, while **numeric and CDN-specific field results** must be supplied by attaching a forensic JSON export from Evidence Hub before judging.

---

## Pillar 1 — Architecture hardening (GPL v3 & dual-licensing)

### 1.1 Licensable chassis: `paladinshield-rel`

The **Runtime Enforcement Layer chassis** (`paladinshield-rel`) is the in-browser module that implements **Promise Proxy interceptors** over `window.solana`:

| Surface | Implementation file | Enforcement primitive |
|---------|----------------------|------------------------|
| `signTransaction` | `src/extension/scripts/inject.js` | `wrapMethod` → `waitForUserDecision` → `await decisionPromise` → `original.apply` |
| `signAllTransactions` | same | same |
| `signMessage` | same (`wrapSignMessage`) | same |

Injection runs at **`document_start`** via MV3 `content_scripts` + `web_accessible_resources` (`src/extension/manifest.json`), i.e. **millisecond-zero** provider wrapping before page scripts complete wallet calls.

**Repository SPDX note:** Judges auditing license headers should see `package.json` today:

```json
"name": "clearsignai",
"license": "ISC"
```

**Submission legal posture (intended):** REL interceptor source is designated **`GPL-3.0-only`** under the product module name **`paladinshield-rel`**, with a root `LICENSE` file (GPL v3 full text) and SPDX alignment on publish. Until SPDX is updated, treat this section as **declared enforcement intent**; verify headers in `inject.js` / `background.js` at merge tag.

### 1.2 Why GPL v3 on the REL chassis

| Objective | GPL v3 mechanism |
|-----------|-------------------|
| **Auditable enforcement** | Judges and Foundation reviewers can read the exact Promise-gating logic—no “security by obscurity” for the interceptors. |
| **Derivative-work clarity** | Wallets, proprietary extensions, or closed browsers that **embed or link** the REL interceptors into a larger signing product trigger copyleft obligations on distribution. |
| **Interceptor integrity** | Prevents silent fork of async RAM-gating without source disclosure—relevant because the security claim *is* the on-device hold semantics. |

### 1.3 Dual-licensing commercial thesis

| Stakeholder | License path | Outcome |
|-------------|--------------|---------|
| **Solana ecosystem / judges / OSS integrators** | GPL v3 (`paladinshield-rel` source) | Full transparency for security audit; community can verify default-deny and Promise hold behavior. |
| **Commercial closed distributors** (proprietary wallet shells, branded extensions, OEM browser builds) | **Commercial license** required | May not ship REL async intercept logic in closed binaries without a private agreement—GPL blocks “RAM-gate clone” without compliance or buy-out. |

**Commercial boundary (plain language):** Open source for **verification**; closed commercial **reuse of the async enforcement core** requires a **private license**. UI theming, RPC backends, or non-linked adjacent services are out of scope for this dev-log—only the **REL Promise Proxy chassis** is GPL-anchored.

---

## Pillar 2 — Live benchmarking flow (CDN zero-day class — PoE)

### 2.1 PoC framing: passive vs proactive environments

Colosseum PoC class **“The Foreign Paladin”** models a **foreign-trust drainer**: payload compiled or loaded from a **canonical-looking utility origin** (e.g. public faucet / SPL tooling CDN) so **passive** defenses stall on reputation while **signing bytes** still reach the wallet.

| Dimension | Traditional passive environment | PaladinShield proactive (REL) |
|-----------|--------------------------------|-------------------------------|
| **Control plane** | Visual simulation, DNS/lists, delayed scoring | **In-thread Promise Proxy** (`inject.js`) |
| **User experience** | Spinner / “loading simulation”; pathway stays open | Signing Promise **frozen `pending`** in page RAM |
| **Wallet exposure** | Phantom (or other) may receive signing request | `original.apply` **not called** until `decision === "approve"` |
| **Dismiss / flee** | User can still confirm in wallet | Popup close → **default-deny** → Promise **rejected** |
| **Evidence** | Often none at pre-sign boundary | Forensic card + `paladinForensicHash` (Evidence Hub) |

**Passive failure mode (architectural, per `README.md`):** Alert-driven UX parses asynchronously, shows risk chrome, and **does not decouple** the wallet signing channel—under FOMO or alert fatigue the user can still sign.

**Proactive containment (implemented):** REL **seizes** the async call graph at the provider; wallet hardware/software never sees payload bytes until policy and explicit authorization release the gate.

### 2.2 Promise flow states (production code)

**State machine — wrapped `signTransaction` / `signAllTransactions` / `signMessage`:**

```text
[ dApp calls provider.sign* ]
        │
        ▼
┌───────────────────┐
│ WRAPPED_INVOKED   │  createRequestId(); buildPayload()
└─────────┬─────────┘
          │ decisionPromise = waitForUserDecision(requestId)
          │ publishPayload → content_script → background (analysis)
          ▼
┌───────────────────┐
│ PENDING (RAM)     │  await sleep(HOLD_MS); await decisionPromise
│ wallet detached   │  native provider Promise NOT settled
└─────────┬─────────┘
          │
    ┌─────┴─────┐
    ▼           ▼
 APPROVE      BLOCK / TIMEOUT / POPUP_CLOSE
    │           │
    ▼           ▼
 RESOLVED    REJECTED
 original    Error(reason) — signing aborted
 .apply()
```

**Reject boundary (forensic firewall)** — inbound decision handler:

```266:267:src/extension/scripts/inject.js
    const reason = data.payload.reason || "Operacion bloqueada por PaladinShield.";
    pending.reject(new Error(reason));
```

**Default-deny on UI abandonment** — service worker dispatches block to all pending request IDs:

```234:242:src/extension/scripts/background.js
async function blockPendingRequestsOnPopupClose() {
  const pendingIds = Array.from(pendingSignatureRequests.keys());
  await Promise.all(
    pendingIds.map((requestId) =>
      dispatchSignatureDecision(
        requestId,
        "block",
        "Popup cerrado sin autorizacion. Politica Default-Deny: firma rechazada."
```

This is the programmatic equivalent of **“firma rechazada”** at the enforcement layer: the signing Promise never resolves successfully.

**Gating point before wallet release:**

```298:307:src/extension/scripts/inject.js
      const decisionPromise = waitForUserDecision(requestId);
      publishPayload(payload);
      await sleep(HOLD_MS);
      // Promise-gated proxy:
      // We intentionally pause the original wallet signing call until our extension
      // completes AI analysis and receives an explicit user decision.
      await decisionPromise;
      return original.apply(this, args);
```

### 2.3 Committed forensic telemetry (faucet-origin PoE)

The repository contains **recorded** interception telemetry for a **verified utility origin** (`spl-token-faucet.com`) with a **hostile `signMessage` payload**—the same *trust-class* as “foreign paladin” social engineering (benign-looking host, malicious signing intent).

| Field | Value (from `TESTING_CLEARSIGN.md`) |
|-------|-------------------------------------|
| Incident type | `message_signature_intent_detected` |
| Origin | `https://spl-token-faucet.com` |
| Request ID | `9336bc62-65c7-40aa-ac3b-688b9979e2bd` |
| Captured at | `2026-05-05T03:58:55.499Z` |
| Forensic logged at | `2026-05-05T03:59:03.007Z` |
| Semantic verdict | `riesgo: Alto`, `accion: Bloquear` |
| Runtime outcome | Signature **physically blocked** before wallet execution |

**Captured message (excerpt):**

```text
SECURITY ALERT: Unauthorized access detected. Sign this URGENT verification message
to secure your SEED phrase and prevent wallet drainage immediately.
```

**Policy alignment (`translator.js`):** The semantic agent is instructed to contrast **expected origin purpose** (faucet / utility) with **actual payload nature**; benign lexical faucet patterns **do not** authorize blind signing when instructions are anomalous—matching “CDN / canonical metadata + hostile bytes.”

### 2.4 PoC v1.5 — CDN / lamport mutation (submission narrative vs repo)

| Claim class | Status in repository |
|-------------|---------------------|
| REL holds signing Promise in RAM | **Verified** — `inject.js` |
| Default-deny on popup close | **Verified** — `background.js` |
| Faucet-origin hostile `signMessage` blocked | **Verified** — `TESTING_CLEARSIGN.md` |
| PoC label **v1.5 “The Foreign Paladin”** | **Narrative only** — no v1.5 JSON artifact |
| **5,000 lamports** mutated tx from official CDN build | **Not present** in committed telemetry |

**Judge action:** Attach Evidence Hub export (`paladinshield-forensic.json`) from the v1.5 session to upgrade this row from narrative to measured PoE.

---

## Pillar 3 — Comparative analysis (local Colosseum metrics)

### 3.1 Configuration JSON cross-walk

| Source JSON | Declared intent | Runtime validation |
|-------------|-----------------|-------------------|
| **`src/extension/manifest.json`** | MV3 REL; `document_start`; forensic/default-deny positioning in `description` | `inject.js` loaded early; CSP-safe externalized UI scripts per `docs/COLOSSEUM_COPILOT_REPORT.md` |
| **`skills-lock.json`** | Colosseum Copilot + resources skills pinned from `ColosseumOrg/*` | Competitive positioning scripts (`scripts/colosseum_copilot_paladin_eval.py`) |
| **`package.json`** | Tooling deps (`@solana/web3.js`, `openai`) for analysis harness | **License field not yet GPL-aligned** (see Pillar 1) |

### 3.2 `docs/COLOSSEUM_COPILOT_REPORT.md` — security objectives vs empirical run

| Copilot report claim | Mechanism | Faucet PoE (`TESTING_CLEARSIGN.md`) |
|----------------------|-----------|-------------------------------------|
| Deterministic gating before wallet signature | `await decisionPromise` | Blocked before wallet sign |
| Default-deny (close popup ⇒ block) | `blockPendingRequestsOnPopupClose` | Same policy class; popup-close path in code |
| `signMessage` parity with transactions | `wrapSignMessage` + `MESSAGE_ANALYSIS_CHANNEL` | **Exercised** on faucet origin |
| Forensic persistence + human review export | Evidence Hub + SHA-256 hash | Timestamps + request ID logged |
| Faucet false-positive reduction | `translator.js` benign faucet heuristic | Host is faucet-class; **payload still blocked** (anomaly wins) |

### 3.3 Strategic positioning (Copilot eval brief — in-repo)

The PaladinShield feature brief embedded in `scripts/colosseum_copilot_paladin_eval.py` (≤500 chars) states:

- Promise-gated `signTransaction` / `signAllTransactions` / `signMessage`
- Default-deny; hold is **not simulation-only**
- OpenAI `gpt-4o-mini` JSON verdict; **4s timeout → Alto + Bloquear fail-safe**
- Forensic Evidence Hub + SHA-256 export

| Corpus category (eval script targets) | PaladinShield differentiation (documented) |
|---------------------------------------|--------------------------------------------|
| Simulation / explain-first wallets | **Physical Promise hold**, not advisory overlay |
| Guard-style drain blocking | **Pre-sign RAM gate** + exportable hash, not post-hoc simulate |
| Assistant UX | Policy agent feeds **enforcement**, not chat-only |

### 3.4 Fulfillment of “RAM containment vs visual reactive security”

| Metric | Passive / visual reactive stack | PaladinShield REL (this build) |
|--------|------------------------------|--------------------------------|
| **Enforcement locus** | UI layer, cloud simulation APIs | Browser provider thread (`inject.js`) |
| **Wallet byte exposure before policy** | Yes (path open) | **No** — `await decisionPromise` |
| **Dismiss UI ⇒ sign anyway** | Possible | **Rejected Promise** + “firma rechazada” on close |
| **Verifiable artifact** | Often none | Request ID + forensic timestamps (committed card) |
| **Faucet-trust bypass** | Reputation / CDN appearance | **Origin vs payload** policy; block on hostile `signMessage` |

**Conclusion:** For every objective row in `docs/COLOSSEUM_COPILOT_REPORT.md` that demands **runtime interception + deterministic enforcement + default deny**, the **committed faucet forensic card** and **inject/background source** demonstrate **100% alignment** on the enforcement thesis: *infrastructure-grade containment in RAM, not reactive visual security alone.*

---

## Appendix A — Judge verification checklist

1. Load unpacked extension; confirm console: `PaladinShield: Runtime Enforcement Active`.
2. Reproduce `TESTING_CLEARSIGN.md` on `https://spl-token-faucet.com` (or devnet faucet page) with console `signMessage` payload.
3. Confirm popup **Alto / Bloquear**; wallet never completes sign.
4. Close popup without approving → verify Promise rejection / blocked state.
5. Open Evidence Hub → export JSON → verify `paladinForensicHash` stability.
6. Confirm `package.json` SPDX + `LICENSE` match declared **GPL-3.0-only** before final legal score.

---

## Appendix B — Pre-submission SPDX alignment (recommended)

To make Pillar 1 auditable without narrative drift:

```json
{
  "name": "paladinshield-rel",
  "license": "GPL-3.0-only"
}
```

Add `LICENSE` (GNU GPL v3.0) and per-file SPDX headers on `src/extension/scripts/inject.js` and `background.js`.

---

*End of Submission Dev-Log.*
