# TESTING CLEARSIGN

## Evidence Card - Attack Blocked

- **Incident Type:** `message_signature_intent_detected` (`signMessage`)
- **Origin:** `https://spl-token-faucet.com`
- **Request ID:** `9336bc62-65c7-40aa-ac3b-688b9979e2bd`
- **Captured At:** `2026-05-05T03:58:55.499Z`
- **Forensic Logged At:** `2026-05-05T03:59:03.007Z`

## Malicious Payload (Captured Pre-Signature)

- **messageText:**  
  `SECURITY ALERT: Unauthorized access detected. Sign this URGENT verification message to secure your SEED phrase and prevent wallet drainage immediately.`
- **messageHex:** captured and stored in forensic report
- **messageBase64:** captured and stored in forensic report

## Semantic Verdict (OpenAI gpt-4o-mini + Policy)

- **Risk:** `Alto`
- **Action:** `Bloquear`
- **Reasoning:** social-engineering pattern detected:
  - urgency words (`URGENT`, `IMMEDIATELY`)
  - trust-abuse words (`VERIFICATION`, `SECURITY`)
  - key-compromise cues (`SEED`, `PHRASE`)

## Runtime Enforcement Outcome

- Signature flow was physically blocked before wallet execution.
- PaladinShield required explicit authorization and rejected the malicious request.
- This confirms runtime execution control, not warning-only UX.

## Demo Impact Statement

**Without PaladinShield, this message would have been signed blindly.  
With PaladinShield, the malicious payload was captured, semantically classified, and execution was blocked before the wallet could sign.**
