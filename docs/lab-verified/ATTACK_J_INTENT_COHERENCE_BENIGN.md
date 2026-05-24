# Attack J — Intent coherence & shield behavior (benign-context regression)

**Case type:** Contextual coherence (not hostile PoC)  
**Related attack class:** J — The Stealth Drainer (lab family)  
**Recorded:** 2026-05-23 (UTC)  
**Status:** **BLOCKED / EXPECTED** — semantic policy correctly elevated scrutiny

---

## Purpose

Document how PaladinShield behaves when the **declared user-facing intent** looks structurally benign (single staking instruction) but is **not what this dApp is expected to do** (public SPL token faucet). This validates intent-coherence enforcement without domain allowlists: a familiar dApp surface does not auto-trust mismatched signing requests.

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

1. The **dApp** presents as a **faucet / public utility** (mint, drip, devnet aid).
2. The **declared narrative** asks the user to **stake** in an external protocol.
3. That behavior is **outside what users should expect** from this dApp — suggesting injected script, blind signing, or deployment compromise (not “wrong domain on a list”).

The REL must **block** (default-deny) and produce an **auditable explanation** so the user understands *why* the shield fired, and dApp operators receive **OperatorHelp** guidance.

---

## Observed result

| Criterion | Outcome |
|-----------|---------|
| **Tier** | Critical path — signature **blocked in-page** (Promise rejected) |
| **Popup** | BLOCKED (AUTO) + acknowledge to return to watch mode |
| **Semantic analysis** | OpenAI responded within 8s timeout |
| **Verdict** | **Block** — signing request inconsistent with expected dApp behavior |
| **Narrative quality** | Clear user-facing explanation (not silent deny) |

**Representative analysis (abridged):**

> The origin `https://spl-token-faucet.com` suggests a legitimate utility faucet, but the payload indicates a request to sign a transaction for staking 1 SOL in a protocol with an unidentified program ID. This misalignment raises concerns about the legitimacy of the transaction, as it involves blind signing without clear justification for the transfer.  
> **OperatorHelp:** Review deployment integrity and security of scripts associated with the faucet origin.

---

## Interpretation (expected dApp behavior)

| Layer | Finding |
|-------|---------|
| **User-presented intent** | Plausible in isolation — “stake 1 SOL” with one staking-like instruction |
| **Expected dApp behavior** | **Incoherent** — a faucet dApp should not solicit protocol staking |
| **Policy outcome** | Block + forensic narrative — **not** a false positive in the security sense |
| **Design goal met** | Shield explains the anomaly; OperatorHelp nudges deployment integrity review |

This is the intended behavior for **ambiguous / context-dependent** cases: PaladinShield checks whether the **signing request matches what this dApp is for**, not whether the domain appears on a whitelist. A staking flow on a dedicated yield dApp may warrant Tier B operator review; the **same narrative on a faucet dApp** correctly triggers Block.

---

## Relation to hostile Attack J

| Variant | Instructions | Primary detector |
|---------|--------------|------------------|
| **J hostile** (`j-attack-poc.js`) | Staking lead ix + hidden `TRANSFER_ALL` | Local `evaluateStealthDrainerRisk` / `FRONTAL_DRAINER` (Tier C, no OpenAI required) |
| **J benign-context** (this report) | Single staking ix only | Semantic analysis — request outside expected faucet dApp behavior (Tier C via analysis) |

Both belong to the **Attack J lab family** but test different guarantees: bytecode stealth vs **contextual narrative mismatch**.

---

## Configuration notes

- OpenAI request timeout raised to **8s** (local REL) so borderline cases receive semantic narrative instead of fail-safe `timeout_*` only.
- Colosseum-submitted GitHub snapshot may differ; this report documents **local lab REL** behavior.

---

## Conclusion

**PASS (behavior regression).** PaladinShield blocked a structurally mild payload because **staking is not expected behavior for this faucet dApp**, warned the user with actionable analysis, and surfaced OperatorHelp for possible deployment compromise — matching the product thesis for intent-aware Runtime Enforcement without domain auto-trust.

*Internal lab note — not linked from public manifest. Prefer user-facing copy: “request inconsistent with what this dApp should ask you to sign,” not “site coherence policy.”*
