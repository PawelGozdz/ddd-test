// event-dispatcher.ts
import { IAggregateRoot } from '../domain/';
import { IDomainEvent } from './domain';

/**
 * Interface for event dispatchers
 */
export abstract class IEventDispatcher {
  /**
   * Dispatch all events from an aggregate
   */
  abstract dispatchEventsForAggregate(
    aggregate: IAggregateRoot<any>,
  ): Promise<void>;

  /**
   * Dispatch all events from an aggregate
   */
  abstract dispatchEvents(...events: IDomainEvent[]): Promise<void>;
}
