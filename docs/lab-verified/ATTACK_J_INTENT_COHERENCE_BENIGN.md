# Attack J — Intent coherence & shield behavior (benign-context regression)

**Case type:** Contextual coherence (not hostile PoC)  
**Related attack class:** J — The Stealth Drainer (lab family)  
**Recorded:** 2026-05-23 (UTC)  
**Status:** **BLOCKED / EXPECTED** — semantic policy correctly elevated scrutiny

---

## Purpose

Document how PaladinShield behaves when the **declared user-facing intent** looks structurally benign (single staking instruction) but is **incoherent with the dApp surface** (public SPL token faucet). This validates intent-coherence enforcement without origin allowlists: utility reputation does not auto-trust mismatched narratives.

---

## Scenario

| Field | Value |
|-------|--------|
| **Page** | `https://spl-token-faucet.com` |
| **REL mode** | Smart Path (semantic engine active; OpenAI timeout 8s) |
| **Method** | `signTransaction` |
| **Declared intent** | `"Stake 1 SOL in Protocol"` |
| **Payload** | Single instruction: `STAKING_PROTOCOL_PROGRAM_ID` + `STAKE_SOL_INSTRUCTION` (no hidden second ix) |
| **Fixture source** | Gemini lab script — “Case J (Legitimate Flow)” patch verification |

---

## Expected shield behavior

Although the **instruction shape** alone is not a classic stealth drainer (no secondary transfer ix), PaladinShield should still treat the request as **high risk** when:

1. The **origin** is a known **faucet / public utility** surface (mint, drip, devnet aid).
2. The **declared narrative** asks the user to **stake** in an external protocol.
3. Faucets **do not** normally offer staking flows — the combination suggests blind signing, injected script, or site compromise.

The REL must **block** (default-deny) and produce an **auditable explanation** so the user understands *why* the shield fired, and site operators receive **OperatorHelp** guidance.

---

## Observed result

| Criterion | Outcome |
|-----------|---------|
| **Tier** | Critical path — signature **blocked in-page** (Promise rejected) |
| **Popup** | BLOCKED (AUTO) + acknowledge to return to watch mode |
| **Semantic analysis** | OpenAI responded within 8s timeout |
| **Verdict** | **Block** — origin vs payload misalignment |
| **Narrative quality** | Clear user-facing explanation (not silent deny) |

**Representative analysis (abridged):**

> The origin `https://spl-token-faucet.com` suggests a legitimate utility faucet, but the payload indicates a request to sign a transaction for staking 1 SOL in a protocol with an unidentified program ID. This misalignment raises concerns about the legitimacy of the transaction, as it involves blind signing without clear justification for the transfer.  
> **OperatorHelp:** Review deployment integrity and security of scripts associated with the faucet origin.

---

## Interpretation (intent coherence thesis)

| Layer | Finding |
|-------|---------|
| **User-presented intent** | Plausible in isolation — “stake 1 SOL” with one staking-like instruction |
| **Site-appropriate intent** | **Incoherent** — a faucet should not solicit protocol staking |
| **Policy outcome** | Block + forensic narrative — **not** a false positive in the security sense |
| **Design goal met** | Shield explains the anomaly; operator help nudges site integrity review |

This is the intended behavior for **ambiguous / context-dependent** cases: PaladinShield prioritizes **declared intent vs operational context** over static domain whitelists. A staking flow on a dedicated yield dApp may warrant Tier B operator review; the **same narrative on a faucet** correctly triggers Block.

---

## Relation to hostile Attack J

| Variant | Instructions | Primary detector |
|---------|--------------|------------------|
| **J hostile** (`j-attack-poc.js`) | Staking lead ix + hidden `TRANSFER_ALL` | Local `evaluateStealthDrainerRisk` / `FRONTAL_DRAINER` (Tier C, no OpenAI required) |
| **J benign-context** (this report) | Single staking ix only | Semantic coherence — origin utility vs stake narrative (Tier C via analysis) |

Both belong to the **Attack J lab family** but test different guarantees: bytecode stealth vs **contextual narrative mismatch**.

---

## Configuration notes

- OpenAI request timeout raised to **8s** (local REL) so borderline cases receive semantic narrative instead of fail-safe `timeout_*` only.
- Colosseum-submitted GitHub snapshot may differ; this report documents **local lab REL** behavior.

---

## Conclusion

**PASS (coherence regression).** PaladinShield blocked a structurally mild payload because the **faucet origin and staking narrative do not align**, warned the user with actionable analysis, and surfaced OperatorHelp for possible site compromise — matching the product thesis for context-aware Runtime Enforcement without faucet auto-trust.

*Copy to Notion or link from `docs/PALADIN_SECURITY_MANIFEST.md` under Attack J.*
