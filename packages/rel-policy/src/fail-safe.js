/** @typedef {import('../../rel-core/src/types.js').PolicyVerdict} PolicyVerdict */
/** @typedef {import('../../rel-core/src/types.js').SignatureIntent} SignatureIntent */

/**
 * Fail-closed verdict when remote policy is unavailable (REL default-deny).
 * @param {string} reason
 * @param {SignatureIntent} [_intent]
 * @returns {PolicyVerdict}
 */
export function buildFailClosedVerdict(reason, _intent = {}) {
  return {
    riesgo: "Alto",
    accion: "Bloquear",
    mensaje: `Accion: Motor de politica remoto no disponible (${reason}). Analisis: REL fail-closed — no se pudo auditar el intent; firma bloqueada por politica.`,
  };
}

/**
 * Softer fail-safe for utility origins (matches extension translator posture).
 * @param {string} reason
 * @param {SignatureIntent} [intent]
 * @returns {PolicyVerdict}
 */
export function buildUtilityFailSafeVerdict(reason, intent = {}) {
  const origin = intent?.origin || "";
  const isUtility = /faucet|airdrop|testnet|devnet|spl-token|token-faucet|drip|\.solana\.org|explorer\.solana/i.test(
    String(origin).toLowerCase()
  );

  if (isUtility) {
    return {
      riesgo: "Medio",
      accion: "Advertir",
      mensaje: `Accion: Motor de politica remoto no disponible (${reason}). Analisis: Origen tipo faucet o utilidad publica — revisa el payload manualmente antes de autorizar.`,
    };
  }

  return buildFailClosedVerdict(reason, intent);
}
