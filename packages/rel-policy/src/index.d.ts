import type { PolicyVerdict, SignatureIntent } from "@paladinshield/rel-core";

export interface MockPolicyRule {
  match: (intent: SignatureIntent) => boolean;
  verdict: PolicyVerdict;
}

export interface MockPolicyEngineOptions {
  latencyMs?: number;
  rules?: MockPolicyRule[];
  defaultVerdict?: PolicyVerdict;
  onEvaluate?: (intent: SignatureIntent) => void;
}

export interface RemotePolicyClientOptions {
  endpoint: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  headers?: Record<string, string>;
  buildFailSafeVerdict?: (reason: string, intent: SignatureIntent) => PolicyVerdict;
}

export function normalizeVerdict(raw: unknown): PolicyVerdict;
export function tryNormalizeVerdict(raw: unknown): PolicyVerdict | null;

export function buildFailClosedVerdict(reason: string, intent?: SignatureIntent): PolicyVerdict;
export function buildUtilityFailSafeVerdict(reason: string, intent?: SignatureIntent): PolicyVerdict;

export function createMockPolicyEngine(
  options?: MockPolicyEngineOptions
): (intent: SignatureIntent) => Promise<PolicyVerdict>;

export function createRemotePolicyClient(
  options: RemotePolicyClientOptions
): (intent: SignatureIntent) => Promise<PolicyVerdict>;
