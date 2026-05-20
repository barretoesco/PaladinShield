/**
 * @typedef {'Alto'|'Medio'|'Bajo'} PolicyRisk
 * @typedef {'Bloquear'|'Advertir'|'Confiar'} PolicyAction
 */

/**
 * Structured REL policy verdict (same contract as MV3 extension / translator.js).
 * @typedef {Object} PolicyVerdict
 * @property {PolicyRisk} riesgo
 * @property {PolicyAction} accion
 * @property {string} mensaje
 */

/**
 * Normalized signing intent passed to policy engines and gates.
 * @typedef {Object} SignatureIntent
 * @property {string} [requestId]
 * @property {string} [method] signTransaction | signAllTransactions | signMessage
 * @property {string} [action]
 * @property {string} [origin]
 * @property {string} [messageText]
 * @property {Array<Record<string, unknown>>} [transactions]
 * @property {Record<string, unknown>} [analysisInput]
 */

/**
 * @typedef {Object} RelGateOptions
 * @property {(intent: SignatureIntent) => Promise<PolicyVerdict>} evaluateIntent
 * @property {(ctx: { intent: SignatureIntent, verdict: PolicyVerdict, requestId: string }) => Promise<'approve'|'block'>} requestUserDecision
 * @property {number} [decisionTimeoutMs=90000]
 * @property {boolean} [hardBlockOnCritical=true] Auto-reject Promise on Alto / Bloquear (no override)
 * @property {'enforce'|'shadow'} [mode='enforce'] shadow = evaluate + log only, never block
 * @property {() => 'enforce'|'shadow'} [resolveMode] Dynamic mode (overrides mode when set)
 * @property {(intent: SignatureIntent, verdict: PolicyVerdict) => void} [onShadowVerdict]
 * @property {(intent: SignatureIntent, verdict: PolicyVerdict) => void} [onBlocked]
 */

/**
 * @typedef {Object} RelGateWithTokensOptions
 * @property {import('./decision-token.js').createDecisionTokenRegistry extends () => infer R ? R : never} [registry]
 * @property {(ctx: {
 *   intent: SignatureIntent,
 *   verdict: PolicyVerdict,
 *   requestId: string,
 *   decisionToken: string,
 *   registry: ReturnType<typeof import('./decision-token.js').createDecisionTokenRegistry>,
 * }) => Promise<boolean>} requestOperatorApproval
 * @property {(ctx: { requestId: string }) => void} [onTokenSpoofBlocked]
 * @property {(intent: SignatureIntent) => Promise<PolicyVerdict>} evaluateIntent
 * @property {number} [decisionTimeoutMs]
 * @property {boolean} [hardBlockOnCritical]
 * @property {'enforce'|'shadow'} [mode]
 * @property {() => 'enforce'|'shadow'} [resolveMode]
 * @property {(intent: SignatureIntent, verdict: PolicyVerdict) => void} [onShadowVerdict]
 * @property {(intent: SignatureIntent, verdict: PolicyVerdict) => void} [onBlocked]
 */

export {};
