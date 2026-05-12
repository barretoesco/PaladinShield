# PaladinShield Demo Script (Final Pitch)

## 1) Opening (10s)
"Perder fondos por un click ciego no es un error tecnico, es un error de contexto.  
PaladinShield intercepta y detiene toda firma antes de que llegue a la wallet."

## 2) Attack Setup (20s)
1. Open a malicious dApp or browser console payload.
2. Trigger `signMessage` with social-engineering text (`SECURITY`, `OWNERSHIP`, `VERIFY NOW`).
3. Show that PaladinShield popup appears immediately.

## 3) Deterministic Gating Proof (25s)
- Point to `SHIELD ACTIVE: Physical Gating Enabled`.
- Explain:
  - "This is not a warning overlay."
  - "This is deterministic gating: the wallet Promise is blocked."
- Key line for judges:
  - **"Unlike Breakout-style explainers or ChainGPT-like warning layers, if a PaladinShield user closes the popup without approving, the transaction NEVER occurs. Default state is block."**

## 4) Semantic Defense (20s)
- Show intent panels:
  - `LO QUE QUIEREN HACER`
  - `LO QUE CLEARSIGN ESTA HACIENDO`
- Explain that Llama 3.1 classifies intent and risk in plain language before signature release.

## 5) Incident Evidence + Solana Differentiator (20s)
- Click `BLOQUEAR`.
- Show evidence flow and explain:
  - PaladinShield creates a structured malicious-attempt record.
  - The payload is ready to be reported to Solana for immutable threat logging.

## 6) Closing (10s)
"Without PaladinShield, this signature would execute blind.  
With PaladinShield, execution is physically blocked until safe intent is proven."
