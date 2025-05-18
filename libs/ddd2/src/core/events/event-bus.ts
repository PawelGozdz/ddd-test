import { IAuditEvent } from './audit';
import { IDomainEvent } from './domain';
import { IIntegrationEvent } from './integration';

/**
 * Interface for event buses
 * Defines the core contract for event publication and subscription
 * Generic type TEvent allows handling different event types (domain, integration, audit)
 */
export abstract class IEventBus<TEvent = IDomainEvent> {
  /**
   * Publish an event to all subscribed handlers
   *
   * @param event - The event to publish
   */
  abstract publish(event: TEvent): Promise<void>;

  /**
   * Subscribe a function to handle events of a specific type
   *
   * @param eventType - The event type constructor or string identifier
   * @param handler - The handler function
   */
  abstract subscribe<T extends TEvent>(
    eventType: string | (new (...args: any[]) => T),
    handler: (event: T) => Promise<void> | void,
  ): void;

  /**
   * Register a class-based handler for events of a specific type
   *
   * @param eventType - The event type constructor or string identifier
   * @param handler - The event handler object
   */
  abstract registerHandler<T extends TEvent>(
    eventType: string | (new (...args: any[]) => T),
    handler: {
      handle(event: T): Promise<void> | void;
    },
  ): void;

  /**
   * Unsubscribe a handler from events of a specific type
   *
   * @param eventType - The event type constructor or string identifier
   * @param handler - The handler to unsubscribe
   */
  abstract unsubscribe<T extends TEvent>(
    eventType: string | (new (...args: any[]) => T),
    handler:
      | ((event: T) => Promise<void> | void)
      | {
          handle(event: T): Promise<void> | void;
        },
  ): void;
}

/**
 * Common type aliases for clarity
 */
export type IDomainEventBus = IEventBus<IDomainEvent>;
export type IIntegrationEventBus = IEventBus<IIntegrationEvent>;
export type IAuditEventBus = IEventBus<IAuditEvent>;

/**
 * Symbol for custom middleware
 * Used to mark middleware added by users
 */
export const CUSTOM_MIDDLEWARE_SYMBOL = Symbol('CUSTOM_MIDDLEWARE');
