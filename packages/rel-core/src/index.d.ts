export type PolicyRisk = "Alto" | "Medio" | "Bajo";
export type PolicyAction = "Bloquear" | "Advertir" | "Confiar";
export type OperatorDecision = "approve" | "block";

export interface PolicyVerdict {
  riesgo: PolicyRisk;
  accion: PolicyAction;
  mensaje: string;
}

export interface SignatureIntent {
  requestId?: string;
  method?: "signTransaction" | "signAllTransactions" | "signMessage" | "signAndSendTransaction";
  action?: string;
  origin?: string;
  messageText?: string;
  programIds?: string[];
  transactions?: Array<Record<string, unknown>>;
  analysisInput?: Record<string, unknown>;
  timestamp?: string;
}

export interface RelGateOptions {
  evaluateIntent: (intent: SignatureIntent) => Promise<PolicyVerdict>;
  requestUserDecision: (ctx: {
    intent: SignatureIntent;
    verdict: PolicyVerdict;
    requestId: string;
  }) => Promise<OperatorDecision>;
  decisionTimeoutMs?: number;
  hardBlockOnCritical?: boolean;
  onBlocked?: (intent: SignatureIntent, verdict: PolicyVerdict) => void;
}

export interface WrapSolanaProviderOptions extends RelGateOptions {
  origin?: string;
}

export interface ForensicReportInput {
  requestId: string;
  maliciousPayload: SignatureIntent | Record<string, unknown>;
  semanticAnalysis: PolicyVerdict;
  timestamp?: string;
  forensicCertificate?: string;
}

export function isCriticalVerdict(verdict: PolicyVerdict | null | undefined): boolean;

export function isUtilityOrigin(origin: string | undefined): boolean;

export function evaluateUtilityOriginBenign(
  intent: SignatureIntent
): PolicyVerdict | null;

export function evaluateHoneyPotRisk(intent: SignatureIntent): PolicyVerdict | null;

export function evaluateMessageRisk(intent: SignatureIntent): PolicyVerdict | null;

export function evaluateIntentHeuristics(intent: SignatureIntent): PolicyVerdict | null;

export function evaluateIntent(
  intent: SignatureIntent,
  options?: {
    policyEngine?: (intent: SignatureIntent) => Promise<PolicyVerdict>;
  }
): Promise<PolicyVerdict>;

export function createRelGate(options: RelGateOptions): (
  method: string,
  args: unknown[],
  originalFn: (...args: unknown[]) => unknown,
  origin?: string
) => Promise<unknown>;

export function wrapSolanaProvider(
  provider: Record<string, unknown>,
  options: WrapSolanaProviderOptions
): Record<string, unknown>;

export function canonicalJsonStringify(value: unknown): string;

export function prepareIntegrityPayload(inner: Record<string, unknown>): Record<string, unknown> | null;

export function computePaladinForensicHash(inner: Record<string, unknown>): Promise<string>;

export function buildForensicReport(input: ForensicReportInput): Promise<Record<string, unknown>>;
