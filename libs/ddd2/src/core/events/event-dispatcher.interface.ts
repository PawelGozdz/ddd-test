import { AggregateRoot } from '../domain';
import { IDomainEvent } from './domain';

/**
 * Event middleware function signature
 * Allows intercepting, transforming, or enhancing events
 */
export type EventMiddleware = (
  event: IDomainEvent,
  next: (event: IDomainEvent) => Promise<void>,
) => Promise<void>;

/**
 * Interface for event dispatchers
 */
export interface IEventDispatcher {
  /**
   * Dispatch all events from an aggregate and clear them
   */
  dispatchEventsForAggregate(aggregate: AggregateRoot<any>): Promise<void>;

  /**
   * Dispatch a single event
   */
  dispatchEvent(event: IDomainEvent): Promise<void>;

  /**
   * Dispatch multiple events
   */
  dispatchEvents(...events: IDomainEvent[]): Promise<void>;
}

/**
 * Extended event dispatcher with middleware support
 */
export interface IEnhancedEventDispatcher extends IEventDispatcher {
  /**
   * Add middleware to the event pipeline
   */
  use(middleware: EventMiddleware): this;
}
