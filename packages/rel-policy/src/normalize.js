const VALID_RISK = new Set(["Alto", "Medio", "Bajo"]);
const VALID_ACTION = new Set(["Bloquear", "Advertir", "Confiar"]);

/**
 * @typedef {import('../../rel-core/src/types.js').PolicyVerdict} PolicyVerdict
 */

/**
 * Coerce remote/mock responses into the REL PolicyVerdict contract.
 * @param {unknown} raw
 * @returns {PolicyVerdict}
 */
export function normalizeVerdict(raw) {
  if (!raw || typeof raw !== "object") {
    throw new Error("normalizeVerdict: expected object verdict");
  }

  const riesgo = /** @type {{ riesgo?: string }} */ (raw).riesgo;
  const accion = /** @type {{ accion?: string }} */ (raw).accion;
  const mensaje = /** @type {{ mensaje?: string }} */ (raw).mensaje;

  if (!VALID_RISK.has(String(riesgo)) || !VALID_ACTION.has(String(accion))) {
    throw new Error("normalizeVerdict: invalid riesgo/accion");
  }

  if (typeof mensaje !== "string" || !mensaje.trim()) {
    throw new Error("normalizeVerdict: mensaje required");
  }

  return {
    riesgo: /** @type {PolicyVerdict["riesgo"]} */ (riesgo),
    accion: /** @type {PolicyVerdict["accion"]} */ (accion),
    mensaje: mensaje.trim(),
  };
}

/**
 * @param {unknown} raw
 * @returns {PolicyVerdict|null}
 */
export function tryNormalizeVerdict(raw) {
  try {
    return normalizeVerdict(raw);
  } catch {
    return null;
  }
}
