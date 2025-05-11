// enhanced-event-dispatcher.ts
import { AggregateRoot } from '../domain';
import { IDomainEvent } from './domain';
import { IEventBus } from './event-bus';
import {
  IEnhancedEventDispatcher,
  EventMiddleware,
} from './event-dispatcher.interface';

/**
 * Enhanced implementation of event dispatcher with middleware support
 */
// TODO: naprawić testy
// TODO: zaktualizować HOW-TO
export class EnhancedEventDispatcher implements IEnhancedEventDispatcher {
  private middlewares: EventMiddleware[] = [];

  constructor(private readonly eventBus: IEventBus) {}

  /**
   * Add middleware to the event pipeline
   */
  use(middleware: EventMiddleware): this {
    this.middlewares.push(middleware);
    return this;
  }

  /**
   * Dispatch all events from an aggregate and clear them
   */
  async dispatchEventsForAggregate(
    aggregate: AggregateRoot<any>,
  ): Promise<void> {
    const events = aggregate.getDomainEvents();

    if (events.length === 0) return;

    // Dispatch all events
    await this.dispatchEvents(...events);

    // Clear events from aggregate
    aggregate.commit();
  }

  /**
   * Dispatch a single event
   */
  async dispatchEvent(event: IDomainEvent): Promise<void> {
    const pipeline = this.buildPipeline();
    await pipeline(event);
  }

  /**
   * Dispatch multiple events
   */
  async dispatchEvents(...events: IDomainEvent[]): Promise<void> {
    const pipeline = this.buildPipeline();

    for (const event of events) {
      await pipeline(event);
    }
  }

  /**
   * Build middleware pipeline
   */
  private buildPipeline(): (event: IDomainEvent) => Promise<void> {
    // Base function that publishes to event bus
    let pipeline = async (event: IDomainEvent): Promise<void> => {
      await this.eventBus.publish(event);
    };

    // Apply middleware in reverse order (last added, first executed)
    for (let i = this.middlewares.length - 1; i >= 0; i--) {
      const middleware = this.middlewares[i];
      const nextPipeline = pipeline;

      pipeline = async (event: IDomainEvent): Promise<void> => {
        await middleware(event, nextPipeline);
      };
    }

    return pipeline;
  }
}

// Common middleware implementations
export const eventDispatcherLoggingMiddleware: EventMiddleware = async (
  event,
  next,
) => {
  console.log(`Dispatching event: ${event.eventType}`);
  const start = Date.now();

  try {
    await next(event);
    console.log(
      `Event ${event.eventType} dispatched in ${Date.now() - start}ms`,
    );
  } catch (error) {
    console.error(`Error dispatching event ${event.eventType}:`, error);
    throw error;
  }
};

export const eventDispatcherCorrelationMiddleware: EventMiddleware = async (
  event,
  next,
) => {
  // Ensure all events have correlationId
  if (!event['metadata']?.correlationId) {
    event['metadata'] = {
      ...event['metadata'],
      correlationId: event['metadata']?.eventId || crypto.randomUUID(),
    };
  }

  await next(event);
};

/**
 * Factory function to create an enhanced event dispatcher
 */
export function createEnhancedEventDispatcher(
  eventBus: IEventBus,
  middlewares: EventMiddleware[] = [],
): IEnhancedEventDispatcher {
  const dispatcher = new EnhancedEventDispatcher(eventBus);

  // Apply all middleware
  middlewares.forEach((middleware) => dispatcher.use(middleware));

  return dispatcher;
}
