import { IDomainEvent } from './domain-event-interfaces';
import { EventHandlerFn, IEventHandler } from './event-handler-interface';

/**
 * Interface for event buses
 * Defines the core contract for event publication and subscription
 */
export abstract class IEventBus {
  /**
   * Publish an event to all subscribed handlers
   *
   * @param event - The event to publish
   */
  abstract publish<T extends IDomainEvent>(event: T): Promise<void>;

  /**
   * Subscribe a function to handle events of a specific type
   *
   * @param eventType - The event type constructor
   * @param handler - The handler function
   */
  abstract subscribe<T extends IDomainEvent>(
    eventType: new (...args: any[]) => T,
    handler: EventHandlerFn<T>,
  ): void;

  /**
   * Register a class-based handler for events of a specific type
   *
   * @param eventType - The event type constructor
   * @param handler - The event handler object
   */
  abstract registerHandler<T extends IDomainEvent>(
    eventType: new (...args: any[]) => T,
    handler: IEventHandler<T>,
  ): void;

  /**
   * Unsubscribe a handler from events of a specific type
   *
   * @param eventType - The event type constructor
   * @param handler - The handler to unsubscribe
   */
  abstract unsubscribe<T extends IDomainEvent>(
    eventType: new (...args: any[]) => T,
    handler: EventHandlerFn<T> | IEventHandler<T>,
  ): void;
}

/**
 * Middleware function type for event buses
 * Enables creation of processing pipelines for events
 */
export type EventBusMiddleware = (
  next: (event: IDomainEvent) => Promise<void>,
) => (event: IDomainEvent) => Promise<void>;

/**
 * Symbol for custom middleware
 * Used to mark middleware added by users
 */
export const CUSTOM_MIDDLEWARE_SYMBOL = Symbol('CUSTOM_MIDDLEWARE');
