import { LibUtils } from '../../utils';
import { IDomainEvent, IExtendedDomainEvent } from './domain';
import { EventBusMiddleware, IEventBus } from './event-bus';
import {
  InMemoryEventBus,
  InMemoryEventBusOptions,
} from './in-memory-domain-event-bus';

/**
 * Builder for creating and configuring event buses
 * Provides a fluent interface for setting up an event bus with middleware
 */
export class EventBusBuilder {
  private middlewares: EventBusMiddleware[] = [];
  private enableLogging: boolean = false;
  private errorHandler?: (error: Error, eventType: string) => void;

  /**
   * Create a new event bus builder
   */
  static create(): EventBusBuilder {
    return new EventBusBuilder();
  }

  /**
   * Add a middleware to the event bus
   *
   * @param middleware - The middleware function
   * @returns The builder instance for chaining
   */
  withMiddleware(middleware: EventBusMiddleware): EventBusBuilder {
    this.middlewares.push(middleware);
    return this;
  }

  /**
   * Enable logging in the event bus
   *
   * @returns The builder instance for chaining
   */
  withLogging(): EventBusBuilder {
    this.enableLogging = true;
    return this;
  }

  /**
   * Add a custom error handler
   *
   * @param handler - The error handler function
   * @returns The builder instance for chaining
   */
  withErrorHandler(
    handler: (error: Error, eventType: string) => void,
  ): EventBusBuilder {
    this.errorHandler = handler;
    return this;
  }

  /**
   * Add a correlation ID middleware
   * This middleware adds a correlation ID to events that don't have one
   *
   * @returns The builder instance for chaining
   */
  withCorrelation(): EventBusBuilder {
    return this.withMiddleware((next) => async (event) => {
      // Check if this is an extended event with metadata
      if ('metadata' in event) {
        const extendedEvent = event as IExtendedDomainEvent;
        // Initialize metadata if needed
        if (!extendedEvent.metadata) {
          extendedEvent.metadata = {};
        }
        // Generate a correlation ID if missing
        if (!extendedEvent.metadata.correlationId) {
          extendedEvent.metadata.correlationId = LibUtils.getUUID();
        }
      }
      await next(event);
    });
  }

  /**
   * Add a middleware that executes a custom function for each event
   *
   * @param fn - The function to execute
   * @returns The builder instance for chaining
   */
  withCustomMiddleware(
    fn: (
      event: IDomainEvent,
      next: (event: IDomainEvent) => Promise<void>,
    ) => Promise<void>,
  ): EventBusBuilder {
    return this.withMiddleware((next) => async (event) => {
      await fn(event, next);
    });
  }

  /**
   * Build the event bus with the configured options
   *
   * @returns A fully configured event bus
   */
  build(): IEventBus {
    const options: InMemoryEventBusOptions = {
      enableLogging: this.enableLogging,
      middlewares: this.middlewares,
      errorHandler: this.errorHandler,
    };

    return new InMemoryEventBus(options);
  }
}
