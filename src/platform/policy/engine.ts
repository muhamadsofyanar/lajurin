export type PolicyDecision = Readonly<{
  allowed: boolean;
  reason: string;
}>;

export type PolicyRule<TContext, TResource = undefined> = Readonly<{
  name: string;
  evaluate(context: TContext, resource: TResource): PolicyDecision | boolean;
}>;

export class PolicyDeniedError extends Error {
  readonly code = "POLICY_DENIED";
  constructor(readonly policyName: string, readonly reason: string) {
    super(`Akses ditolak oleh ${policyName}: ${reason}`);
  }
}

export function evaluatePolicy<TContext, TResource>(
  rule: PolicyRule<TContext, TResource>,
  context: TContext,
  resource: TResource,
): PolicyDecision {
  const result = rule.evaluate(context, resource);
  return typeof result === "boolean"
    ? { allowed: result, reason: result ? "ALLOWED" : "DENIED" }
    : result;
}

export function enforcePolicy<TContext, TResource>(
  rule: PolicyRule<TContext, TResource>,
  context: TContext,
  resource: TResource,
) {
  const decision = evaluatePolicy(rule, context, resource);
  if (!decision.allowed) throw new PolicyDeniedError(rule.name, decision.reason);
  return decision;
}
