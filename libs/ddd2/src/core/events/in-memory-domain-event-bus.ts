import {
  IDomainEvent,
  IEventBus,
  EventBusMiddleware,
  EventHandlerFn,
  IEventHandler,
  isEventHandler,
} from '../../core';

/**
 * Options for configuring the InMemoryEventBus
 */
export interface InMemoryEventBusOptions {
  /**
   * Enable or disable logging
   */
  enableLogging?: boolean;

  /**
   * Custom error handler
   */
  errorHandler?: (error: Error, eventType: string) => void;

  /**
   * Middleware pipeline to process events
   */
  middlewares?: EventBusMiddleware[];
}

/**
 * In-memory implementation of the event bus
 * Handles event publication and subscription in a simple in-memory fashion
 */
export class InMemoryEventBus implements IEventBus {
  private handlers: Map<string, Set<EventHandlerFn<any> | IEventHandler<any>>> =
    new Map();
  private readonly options: InMemoryEventBusOptions;
  private publishPipeline: (event: IDomainEvent) => Promise<void>;

  /**
   * Create a new in-memory event bus
   *
   * @param options - Configuration options
   */
  constructor(options: InMemoryEventBusOptions = {}) {
    this.options = {
      enableLogging: false,
      ...options,
    };

    // Build the middleware pipeline
    this.publishPipeline = this.buildPublishPipeline();
  }

  /**
   * Get the event type name from a constructor
   */
  private getEventName<T extends IDomainEvent>(
    eventType: new (...args: any[]) => T,
  ): string {
    const prototype = eventType.prototype;
    if (prototype && 'eventType' in prototype) {
      return prototype.eventType;
    }

    return eventType.name;
  }

  /**
   * Publish an event to all subscribed handlers
   */
  async publish<T extends IDomainEvent>(event: T): Promise<void> {
    // Use the middleware pipeline for publishing
    return this.publishPipeline(event);
  }

  /**
   * Subscribe a function handler to an event type
   */
  subscribe<T extends IDomainEvent>(
    eventType: new (...args: any[]) => T,
    handler: EventHandlerFn<T>,
  ): void {
    const eventName = this.getEventName(eventType);

    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, new Set());
    }

    this.handlers.get(eventName)!.add(handler);

    if (this.options.enableLogging) {
      console.log(`[EventBus] Handler subscribed to ${eventName}`);
    }
  }

  /**
   * Register a class-based handler
   */
  registerHandler<T extends IDomainEvent>(
    eventType: new (...args: any[]) => T,
    handler: IEventHandler<T>,
  ): void {
    const eventName = this.getEventName(eventType);

    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, new Set());
    }

    this.handlers.get(eventName)!.add(handler);

    if (this.options.enableLogging) {
      console.log(`[EventBus] Class handler registered for ${eventName}`);
    }
  }

  /**
   * Unsubscribe a handler from an event type
   */
  unsubscribe<T extends IDomainEvent>(
    eventType: new (...args: any[]) => T,
    handler: EventHandlerFn<T> | IEventHandler<T>,
  ): void {
    const eventName = this.getEventName(eventType);
    const handlers = this.handlers.get(eventName);

    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.handlers.delete(eventName);
      }

      if (this.options.enableLogging) {
        console.log(`[EventBus] Handler unsubscribed from ${eventName}`);
      }
    }
  }

  /**
   * Build the publishing pipeline with middleware
   */
  private buildPublishPipeline(): (event: IDomainEvent) => Promise<void> {
    // TODO: check if we can get it better for the enableLogging if statement
    // Also is we can pass custom logger
    // The core publishing logic
    const basePipeline = async (event: IDomainEvent): Promise<void> => {
      const eventName = (event as any).eventType || event.constructor.name;
      const handlers = this.handlers.get(eventName);
      if (!handlers || handlers.size === 0) {
        if (this.options.enableLogging) {
          console.log(`[EventBus] No handlers for ${eventName}`);
        }
        return;
      }

      if (this.options.enableLogging) {
        console.log(
          `[EventBus] Publishing ${eventName} to ${handlers.size} handlers`,
        );
      }

      const promises: Promise<void>[] = [];

      for (const handler of handlers) {
        try {
          let result: void | Promise<void>;

          if (isEventHandler(handler)) {
            // Class-based handler
            result = handler.handle(event);
          } else {
            // Function handler
            result = handler(event);
          }

          if (result instanceof Promise) {
            promises.push(result);
          }
        } catch (error) {
          this.handleError(error as Error, eventName);
        }
      }

      if (promises.length > 0) {
        try {
          await Promise.all(promises);
        } catch (error) {
          this.handleError(error as Error, eventName);
        }
      }
    };

    // If there are no middlewares, return the base pipeline
    if (!this.options.middlewares || this.options.middlewares.length === 0) {
      return basePipeline;
    }

    // Apply middlewares in reverse order (last middleware is closest to the event handlers)
    let pipeline = basePipeline;
    for (let i = this.options.middlewares.length - 1; i >= 0; i--) {
      pipeline = this.options.middlewares[i](pipeline);
    }

    return pipeline;
  }

  /**
   * Handle errors during event publishing
   */
  private handleError(error: Error, eventType: string): void {
    if (this.options.errorHandler) {
      this.options.errorHandler(error, eventType);
    } else {
      console.error(`[EventBus] Error publishing event ${eventType}:`, error);
      throw error;
    }
  }

  /**
   * Add a middleware to the event bus
   * This rebuilds the pipeline with the new middleware
   *
   * @param middleware - The middleware to add
   */
  public addMiddleware(middleware: EventBusMiddleware): void {
    this.options.middlewares = [
      ...(this.options.middlewares || []),
      middleware,
    ];
    this.publishPipeline = this.buildPublishPipeline();
  }
}
