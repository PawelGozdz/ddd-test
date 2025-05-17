import {
  IIntegrationEvent,
  IIntegrationEventFilter,
} from './integration-event-interfaces';

/**
 * Handler function type for integration events
 */
export type IntegrationEventHandlerFn<T = any> = (
  event: IIntegrationEvent<T>,
) => Promise<void> | void;

/**
 * Handler interface for integration events
 */
export interface IIntegrationEventHandler<T = any> {
  handle(event: IIntegrationEvent<T>): Promise<void> | void;
}

/**
 * Interface for integration event bus
 */
export interface IIntegrationEventBus {
  /**
   * Publish an integration event
   * @param event Integration event to publish
   */
  publish<T = any>(event: IIntegrationEvent<T>): Promise<void>;

  /**
   * Subscribe to integration events
   * @param eventType Event type to subscribe to
   * @param handler Event handler function
   * @param filter Optional filter to apply
   */
  subscribe<T = any>(
    eventType: string,
    handler: IntegrationEventHandlerFn<T> | IIntegrationEventHandler<T>,
    filter?: IIntegrationEventFilter,
  ): void;

  /**
   * Unsubscribe from integration events
   * @param eventType Event type to unsubscribe from
   * @param handler Event handler to remove
   */
  unsubscribe<T = any>(
    eventType: string,
    handler: IntegrationEventHandlerFn<T> | IIntegrationEventHandler<T>,
  ): void;

  /**
   * Clear all subscriptions
   */
  clear(): void;
}
