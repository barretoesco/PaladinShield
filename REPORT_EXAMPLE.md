# PaladinShield — Example forensic export (stress test artifact)

This document accompanies the English-only Evidence Hub and certificate formatter. It demonstrates the narrative and layout judges should expect after a hostile signing drill.

---

## Context

This report was produced during a **browser injection stress test**. An “artillery” script was pasted into the **developer console** while a wallet-backed page was mounted. The harness simulated traffic from a **malicious decentralized application** that attempted **blind signing** (routing opaque instructions or messages toward the signer without coherent human-readable consent). PaladinShield’s Runtime Enforcement Layer (REL) held the signing surface under **default-deny**, captured the intent at the pre-sign boundary, and emitted a verifiable package suitable for third-party review.

---

## The Report

Below is a representative **human-readable certificate** (as rendered by `formatReportForHuman` / `buildFullCertificateText`). Field values are illustrative; your live run will carry real `requestId`, timestamps, policy fields, and payload excerpts.

```
--- PALADINSHIELD FORENSIC REPORT ---
ID: req-stress-7f3a9c2e | Timestamp: 2026-05-05T14:22:11.804Z

══════════════════════════════════════
EXECUTIVE SUMMARY
══════════════════════════════════════

Verdict: Block

Risk Level: High

AI Analysis:
Blind-signing pattern: origin cannot justify message semantics; policy recommends hard stop and operator review before any signature material is released.

══════════════════════════════════════
CONTEXT DETAILS
══════════════════════════════════════

Origin (dApp / site): https://malicious-dapp.example

Intercepted method: signMessage (off-chain / session-phishing surface)

══════════════════════════════════════
INCIDENT RECORD
══════════════════════════════════════

Incident narrative: A signature attempt was intercepted from https://malicious-dapp.example via signMessage (off-chain / session-phishing surface). PaladinShield enforced a default-deny policy, neutralizing the intent based on a High-Risk assessment (operational verdict: Block).

--- NEUTRALIZED ATTACK CERTIFICATE ---
This document certifies that PaladinShield applied Runtime Enforcement Layer (REL) controls
for a signing intent originating at https://malicious-dapp.example. No signature could complete
without policy evaluation and authorization under default-deny. Retain this report together
with the Paladin Forensic Hash for cryptographic proof and third-party verification.

══════════════════════════════════════
CRYPTOGRAPHIC PROOF (INTEROPERABILITY)
══════════════════════════════════════
Copy the Paladin Forensic Hash from the Evidence Hub: it is the SHA-256 anchor over the
canonical integrity object (this certificate text plus bound metadata fields). PaladinShield
captures evidence at the browser pre-sign boundary; downstream Colosseum-corpus-style systems
such as ForenAI (on-chain chain-of-custody / evidence management) or CSDS (cyber-incident
recording and analysis with immutable audit trails) may consume the exported artifact — we
provide the field-captured, verifiable package; we do not replace institutional back-office tools.
The same digest appears on screen, in the clipboard, and in exported files.
```

A **technical annex** (not fully expanded here) appends `[TECHNICAL_PAYLOAD]` with captured message or transaction material as stored in `maliciousPayload`.

---

## Integrity

The **Paladin Forensic Hash** is a **SHA-256 digest** over the **canonical JSON** of the integrity object: `requestId`, `timestamp`, `maliciousPayload`, `semanticAnalysis`, and the full **`forensicCertificate`** text. Because the certificate embeds the executive summary, verdict, incident narrative, and interoperability language, **any tampering with the narrative or verdict changes the hash**. Presenting matching hash plus downloaded JSON confirms that the **attack intent bundle** was captured end-to-end at the interception point—not reconstructed later from partial logs.

*Example illustrative digest (do not verify against this document):*

`deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef`

Your live Evidence Hub surfaces the operative digest for **Copy Hash**, **Download JSON**, and **Download certificate (.txt)**.
