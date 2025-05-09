/**
 * Metadata for integration events
 * Contains additional information relevant for inter-bounded context communication
 */
export interface IIntegrationEventMetadata {
  /** Unique identifier for the event */
  eventId?: string;

  /** When the event was created */
  timestamp?: Date;

  /** Correlation ID for related events */
  correlationId?: string;

  /** ID of the event that caused this event */
  causationId?: string;

  /** Version of the event schema (used for contract versioning) */
  schemaVersion?: number;

  /** Source bounded context */
  sourceContext?: string;

  /** Target bounded context (optional) */
  targetContext?: string;

  /** Routing path (e.g. topic/channel) */
  routingKey?: string;

  /** Additional application-specific metadata */
  [key: string]: any;
}

/**
 * Base interface for integration events
 * Represents an event communicated between bounded contexts
 */
export interface IIntegrationEvent<P = any> {
  /** Type of the event */
  eventType: string;

  /** Payload (data) of the event */
  payload?: P;

  /** Metadata of the event */
  metadata?: IIntegrationEventMetadata;
}

/**
 * Interface for domain to integration event transformer
 * Responsible for transforming domain events to integration events
 */
export interface IDomainToIntegrationEventTransformer<D = any, I = any> {
  /**
   * Transforms a domain event to an integration event
   * @param domainEvent Domain event to transform
   * @param additionalMetadata Optional additional metadata
   */
  transform(
    domainEvent: D,
    additionalMetadata?: Partial<IIntegrationEventMetadata>,
  ): IIntegrationEvent<I>;
}

/**
 * Interface for integration event filter
 * Determines if an event should be processed or not
 */
export interface IIntegrationEventFilter {
  /**
   * Checks if an event should be processed
   * @param event Integration event to check
   * @returns True if event should be processed, false otherwise
   */
  shouldProcess<T = any>(event: IIntegrationEvent<T>): boolean;
}
