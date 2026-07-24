export type DomainEventPayload = Readonly<Record<string, unknown>>;

export type DomainEvent<TPayload extends DomainEventPayload = DomainEventPayload> = Readonly<{
  id: string;
  workspaceId: string | null;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  eventVersion: number;
  payload: TPayload;
  attempts: number;
  maxAttempts: number;
  correlationId: string;
  causationId: string | null;
  occurredAt: Date;
}>;

export type EnqueueDomainEventInput<TPayload extends DomainEventPayload = DomainEventPayload> = Readonly<{
  id?: string;
  workspaceId?: string | null;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  eventVersion?: number;
  payload: TPayload;
  correlationId: string;
  causationId?: string | null;
  deduplicationKey?: string | null;
  maxAttempts?: number;
  availableAt?: Date;
}>;

export type DomainEventHandler = (event: DomainEvent) => Promise<void>;
