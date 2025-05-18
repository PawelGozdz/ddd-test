import { AggregateRoot } from '../domain';
import { IDomainEvent } from './domain';
import { EventBusRegistry } from './event-bus-registry';
import { IEventProcessor } from './event-processor';

/**
 * Event middleware function signature
 * Enables creation of processing pipelines for events
 */
export type EventMiddleware = (
  event: IDomainEvent,
  next: (event: IDomainEvent) => Promise<void>,
) => Promise<void>;

/**
 * Interface for event dispatchers
 * Responsible for dispatching events to appropriate buses
 */
export abstract class IEventDispatcher {
  /**
   * Dispatch all events from an aggregate and clear them
   */
  abstract dispatchEventsForAggregate(
    aggregate: AggregateRoot<any>,
  ): Promise<void>;

  /**
   * Dispatch a single event
   */
  abstract dispatchEvent(event: IDomainEvent): Promise<void>;

  /**
   * Dispatch multiple events
   */
  abstract dispatchEvents(...events: IDomainEvent[]): Promise<void>;
}

/**
 * Extended event dispatcher with middleware and processor support
 */
export abstract class IEnhancedEventDispatcher extends IEventDispatcher {
  /**
   * Add middleware to the event pipeline
   */
  abstract use(middleware: EventMiddleware): this;

  /**
   * Register an event processor
   */
  abstract registerProcessor(processor: IEventProcessor): this;

  /**
   * Get access to the event bus registry
   */
  abstract getRegistry(): EventBusRegistry;
}
