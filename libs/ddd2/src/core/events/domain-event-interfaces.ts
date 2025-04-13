/**
 * Interface defining the basic structure of a domain event
 * Domain events represent something that happened in the domain
 */
export interface IDomainEvent<T = any> {
  /**
   * Unique identifier for the event
   */
  readonly eventId: string;
  
  /**
   * When the event occurred
   */
  readonly occurredOn: Date;
  
  /**
   * Type of the event, typically the class name
   */
  readonly eventType: string;
  
  /**
   * Payload containing the event data
   */
  readonly payload?: T;
}

/**
 * Optional metadata for domain events
 * This can be extended based on specific needs
 */
export interface DomainEventMetadata {
  /**
   * ID to correlate related events
   */
  correlationId?: string;
  
  /**
   * ID of the event that caused this event
   */
  causationId?: string;
  
  /**
   * When the event occurred (may differ from occurredOn in some scenarios)
   */
  timestamp?: Date;
  
  /**
   * Who or what initiated the action leading to this event
   */
  actor?: string;
  
  /**
   * Custom metadata fields
   */
  [key: string]: any;
}

/**
 * Extended domain event interface with metadata
 */
export interface IExtendedDomainEvent<T = any> extends IDomainEvent<T> {
  /**
   * Event metadata
   */
  readonly metadata?: DomainEventMetadata;
}

/**
 * Information about changes to an aggregate
 * Can be used for optimistic concurrency control
 */
export interface IAggregateChangeTracker {
  /**
   * Aggregate ID
   */
  readonly aggregateId: string;
  
  /**
   * Aggregate type
   */
  readonly aggregateType: string;
  
  /**
   * Previous version of the aggregate
   */
  readonly previousVersion: number;
  
  /**
   * New version of the aggregate
   */
  readonly newVersion: number;
}
