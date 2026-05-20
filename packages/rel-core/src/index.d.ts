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
  mode?: "enforce" | "shadow";
  resolveMode?: () => "enforce" | "shadow";
  onShadowVerdict?: (intent: SignatureIntent, verdict: PolicyVerdict) => void;
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

export function evaluatePayloadAuditMarkers(intent: SignatureIntent): PolicyVerdict | null;

export function evaluateIntentHeuristics(intent: SignatureIntent): PolicyVerdict | null;

export function evaluateIntent(
  intent: SignatureIntent,
  options?: {
    policyEngine?: (intent: SignatureIntent) => Promise<PolicyVerdict>;
  }
): Promise<PolicyVerdict>;

export function normalizeSigningIntent(input: {
  method: string;
  args: unknown[];
  origin?: string;
  requestId?: string;
  source?: string;
  chain?: string;
  timestamp?: string;
}): SignatureIntent;

export function normalizeTransactionRecords(
  method: string,
  args: unknown[]
): Array<Record<string, unknown>>;

export function collectProgramIds(transactions: Array<Record<string, unknown>>): string[];

export function decodeMessageBytes(messageInput: unknown): string;

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

export interface RelGateWithTokensOptions extends Omit<RelGateOptions, "requestUserDecision"> {
  registry?: DecisionTokenRegistry;
  requestOperatorApproval: (ctx: {
    intent: SignatureIntent;
    verdict: PolicyVerdict;
    requestId: string;
    decisionToken: string;
    registry: DecisionTokenRegistry;
  }) => Promise<boolean>;
  onTokenSpoofBlocked?: (ctx: { requestId: string }) => void;
}

export interface WrapSolanaProviderWithTokensOptions extends RelGateWithTokensOptions {
  origin?: string;
}

export function createRelGateWithTokens(
  options: RelGateWithTokensOptions
): (
  method: string,
  args: unknown[],
  originalFn: (...args: unknown[]) => unknown,
  origin?: string
) => Promise<unknown>;

export function wrapSolanaProviderWithTokens(
  provider: Record<string, unknown>,
  options: WrapSolanaProviderWithTokensOptions
): Record<string, unknown>;

export function simulateSpoofApprove(
  registry: DecisionTokenRegistry,
  requestId: string,
  spoofToken?: string
): boolean;

export function canonicalJsonStringify(value: unknown): string;

export function normalizeInnerReport(record: Record<string, unknown>): Record<string, unknown> | null;

export function formatReportForHuman(json: Record<string, unknown>): string;

export function formatTechnicalPayloadSection(json: Record<string, unknown>): string;

export function buildFullCertificateText(json: Record<string, unknown>): string;

export function prepareIntegrityPayload(inner: Record<string, unknown>): Record<string, unknown> | null;

export function computePaladinForensicHash(inner: Record<string, unknown>): Promise<string>;

export function buildForensicReport(input: ForensicReportInput): Promise<Record<string, unknown>>;

export function createDecisionToken(): string;

export interface DecisionTokenRegistry {
  register(requestId: string, decisionToken: string): void;
  validate(requestId: string, decisionToken: string): boolean;
  consume(requestId: string): void;
}

export function createDecisionTokenRegistry(): DecisionTokenRegistry;

export function acceptOperatorDecision(
  decision: OperatorDecision,
  decisionToken: string,
  registry: DecisionTokenRegistry,
  requestId: string
): boolean;
