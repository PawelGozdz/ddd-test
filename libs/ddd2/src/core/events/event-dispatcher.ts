import { AggregateRoot, IDomainEvent, IEventBus, IEventDispatcher } from "..";

/**
 * Default implementation of event dispatcher
 */
export class EventDispatcher implements IEventDispatcher {
  constructor(private readonly eventBus: IEventBus) {}

  /**
   * Dispatch all events from an aggregate and clear them
   */
  async dispatchEventsForAggregate(aggregate: AggregateRoot<any>): Promise<void> {
    const events = aggregate.getDomainEvents();
    
    if (events.length === 0) return;
    
    // Publish each event
    await this.dispatchEvents(...events);
    
    // Clear events from aggregate
    aggregate.commit();
  }
  /**
   * Dispatch all events
   */
  async dispatchEvents(...events: IDomainEvent<any>[]): Promise<void> {
    for (const event of events) {
      await this.eventBus.publish(event);
    }
  }
}


/**
 * Factory function to create an event dispatcher
 */
export function createEventDispatcher(eventBus: IEventBus): IEventDispatcher {
  return new EventDispatcher(eventBus);
}