import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  InMemoryEventBus,
  InMemoryEventBusOptions,
} from './in-memory-domain-event-bus';
import { IEventHandler, EventBusMiddleware } from '..';
import { safeRun } from '../../utils';
import { IDomainEvent } from './domain';

// Test events
class TestEvent implements IDomainEvent {
  eventType: string;
  constructor(
    public readonly payload: { value: string } = { value: 'default' },
  ) {}
}

class AnotherTestEvent implements IDomainEvent {
  eventType: string;
  constructor(public readonly payload: { id: number } = { id: 0 }) {}
}

// Test handler implementations
class TestEventHandler implements IEventHandler<TestEvent> {
  public handledEvents: TestEvent[] = [];

  handle(event: TestEvent): void {
    this.handledEvents.push(event);
  }
}

class AsyncTestEventHandler implements IEventHandler<TestEvent> {
  public handledEvents: TestEvent[] = [];
  public delay: number = 10;
  public shouldFail: boolean = false;

  async handle(event: TestEvent): Promise<void> {
    if (this.shouldFail) {
      throw new Error('Async handler failed');
    }

    await new Promise((resolve) => setTimeout(resolve, this.delay));
    this.handledEvents.push(event);
  }
}

describe('InMemoryEventBus', () => {
  // Test variables
  let eventBus: InMemoryEventBus;
  let consoleSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    // Reset and prepare spies
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Create a default event bus
    eventBus = new InMemoryEventBus();
  });

  afterEach(() => {
    // Clean up
    vi.clearAllMocks();
  });

  describe('Basic functionality', () => {
    it('should initialize with default options', () => {
      // Assert
      expect(eventBus).toBeInstanceOf(InMemoryEventBus);
      // Internal properties are private, so we mainly verify the instance was created
    });

    it('should initialize with custom options', () => {
      // Arrange
      const options: InMemoryEventBusOptions = {
        enableLogging: true,
        errorHandler: vi.fn(),
      };

      // Act
      const customEventBus = new InMemoryEventBus(options);

      // Assert
      expect(customEventBus).toBeInstanceOf(InMemoryEventBus);
      // We'll verify the options take effect in specific tests below
    });
  });

  describe('Event subscription', () => {
    it('should subscribe function handlers', () => {
      // Arrange
      const handler = vi.fn();

      // Act
      eventBus.subscribe(TestEvent, handler);

      // Assert - We can't directly check internal state, but we can test behavior
      // by publishing an event and seeing if the handler gets called
      const event = new TestEvent();
      eventBus.publish(event);

      expect(handler).toHaveBeenCalledWith(event);
    });

    it('should register class handlers', () => {
      // Arrange
      const handler = new TestEventHandler();

      // Act
      eventBus.registerHandler(TestEvent, handler);

      // Assert - Test by publishing
      const event = new TestEvent();
      eventBus.publish(event);

      expect(handler.handledEvents).toHaveLength(1);
      expect(handler.handledEvents[0]).toBe(event);
    });

    it('should log subscriptions when logging is enabled', () => {
      // Arrange
      const loggingEventBus = new InMemoryEventBus({ enableLogging: true });
      const handler = vi.fn();

      // Act
      loggingEventBus.subscribe(TestEvent, handler);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Handler subscribed to TestEvent'),
      );
    });

    it('should subscribe multiple handlers to the same event', () => {
      // Arrange
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = new TestEventHandler();

      // Act
      eventBus.subscribe(TestEvent, handler1);
      eventBus.subscribe(TestEvent, handler2);
      eventBus.registerHandler(TestEvent, handler3);

      // Assert - Publish and check all handlers were called
      const event = new TestEvent();
      eventBus.publish(event);

      expect(handler1).toHaveBeenCalledWith(event);
      expect(handler2).toHaveBeenCalledWith(event);
      expect(handler3.handledEvents).toHaveLength(1);
      expect(handler3.handledEvents[0]).toBe(event);
    });

    it('should handle multiple event types independently', () => {
      // Arrange
      const testEventHandler = vi.fn();
      const anotherEventHandler = vi.fn();

      // Act
      eventBus.subscribe(TestEvent, testEventHandler);
      eventBus.subscribe(AnotherTestEvent, anotherEventHandler);

      // Assert - Only specific handler should be called
      const testEvent = new TestEvent();
      eventBus.publish(testEvent);

      expect(testEventHandler).toHaveBeenCalledWith(testEvent);
      expect(anotherEventHandler).not.toHaveBeenCalled();

      // Reset
      vi.clearAllMocks();

      // Publish another event type
      const anotherEvent = new AnotherTestEvent();
      eventBus.publish(anotherEvent);

      expect(anotherEventHandler).toHaveBeenCalledWith(anotherEvent);
      expect(testEventHandler).not.toHaveBeenCalled();
    });
  });

  describe('Event unsubscription', () => {
    it('should unsubscribe function handlers', async () => {
      // Arrange
      const handler = vi.fn();
      eventBus.subscribe(TestEvent, handler);

      // Act
      eventBus.unsubscribe(TestEvent, handler);

      // Assert - Handler should not be called
      await eventBus.publish(new TestEvent());
      expect(handler).not.toHaveBeenCalled();
    });

    it('should unsubscribe class handlers', async () => {
      // Arrange
      const handler = new TestEventHandler();
      eventBus.registerHandler(TestEvent, handler);

      // Act
      eventBus.unsubscribe(TestEvent, handler);

      // Assert - Handler should not process the event
      await eventBus.publish(new TestEvent());
      expect(handler.handledEvents).toHaveLength(0);
    });

    it('should log unsubscriptions when logging is enabled', () => {
      // Arrange
      const loggingEventBus = new InMemoryEventBus({ enableLogging: true });
      const handler = vi.fn();
      loggingEventBus.subscribe(TestEvent, handler);

      // Act
      loggingEventBus.unsubscribe(TestEvent, handler);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Handler unsubscribed from TestEvent'),
      );
    });

    it('should remove only the specified handler', async () => {
      // Arrange
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.subscribe(TestEvent, handler1);
      eventBus.subscribe(TestEvent, handler2);

      // Act - Unsubscribe only one handler
      eventBus.unsubscribe(TestEvent, handler1);

      // Assert - Only handler2 should be called
      await eventBus.publish(new TestEvent());
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it('should handle unsubscribing a non-existent handler', () => {
      // Arrange
      const handler = vi.fn();

      // Act & Assert - Should not throw
      expect(() => {
        eventBus.unsubscribe(TestEvent, handler);
      }).not.toThrow();
    });

    it('should handle unsubscribing from a non-existent event type', () => {
      // Arrange
      const handler = vi.fn();

      // Act & Assert - Should not throw
      expect(() => {
        eventBus.unsubscribe(TestEvent, handler);
      }).not.toThrow();
    });
  });

  describe('Event publishing', () => {
    it('should publish events to all subscribed handlers', async () => {
      // Arrange
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = new TestEventHandler();

      eventBus.subscribe(TestEvent, handler1);
      eventBus.subscribe(TestEvent, handler2);
      eventBus.registerHandler(TestEvent, handler3);

      // Act
      const event = new TestEvent();
      await eventBus.publish(event);

      // Assert
      expect(handler1).toHaveBeenCalledWith(event);
      expect(handler2).toHaveBeenCalledWith(event);
      expect(handler3.handledEvents).toHaveLength(1);
      expect(handler3.handledEvents[0]).toBe(event);
    });

    it('should do nothing when publishing to an event with no handlers', async () => {
      // Arrange - No handlers subscribed

      // Act
      const [_, result] = await safeRun(() =>
        eventBus.publish(new TestEvent()),
      );

      // Assert
      expect(result).toBeUndefined();
    });

    it('should log when publishing events with logging enabled', async () => {
      // Arrange
      const loggingEventBus = new InMemoryEventBus({ enableLogging: true });
      const handler = vi.fn();
      loggingEventBus.subscribe(TestEvent, handler);

      // Act
      await loggingEventBus.publish(new TestEvent());

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Publishing TestEvent to 1 handlers'),
      );
    });

    it('should log when no handlers are available with logging enabled', async () => {
      // Arrange
      const loggingEventBus = new InMemoryEventBus({ enableLogging: true });

      // Act
      await loggingEventBus.publish(new TestEvent());

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('No handlers for TestEvent'),
      );
    });

    it('should properly handle errors in synchronous handlers', async () => {
      // Arrange
      const handler = vi.fn().mockImplementation(() => {
        throw new Error('Test error');
      });

      eventBus.subscribe(TestEvent, handler);

      // Act
      const [error] = await safeRun(() => eventBus.publish(new TestEvent()));

      // Assert
      expect(error).not.toBeNull();
      expect(error?.message).toBe('Test error');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should use custom error handler when provided', async () => {
      // Arrange
      const errorHandler = vi.fn();
      const customEventBus = new InMemoryEventBus({ errorHandler });

      const handler = vi.fn().mockImplementation(() => {
        throw new Error('Custom handled error');
      });

      customEventBus.subscribe(TestEvent, handler);

      // Act
      await customEventBus.publish(new TestEvent());

      // Assert - Should use our custom handler instead of throwing
      expect(errorHandler).toHaveBeenCalledWith(expect.any(Error), 'TestEvent');
    });

    it('should handle asynchronous handlers', async () => {
      // Arrange
      const asyncHandler = new AsyncTestEventHandler();
      eventBus.registerHandler(TestEvent, asyncHandler);

      // Act
      const event = new TestEvent();
      await eventBus.publish(event);

      // Assert
      expect(asyncHandler.handledEvents).toHaveLength(1);
      expect(asyncHandler.handledEvents[0]).toBe(event);
    });

    it('should handle errors in asynchronous handlers', async () => {
      // Arrange
      const asyncHandler = new AsyncTestEventHandler();
      asyncHandler.shouldFail = true;
      eventBus.registerHandler(TestEvent, asyncHandler);

      // Act
      const [error] = await safeRun(() => eventBus.publish(new TestEvent()));

      // Assert
      expect(error).not.toBeNull();
      expect(error?.message).toBe('Async handler failed');
    });

    it('should continue execution if one handler throws', async () => {
      // Arrange
      // Create a custom event bus that doesn't re-throw errors
      const errorHandler = vi.fn();
      const customEventBus = new InMemoryEventBus({ errorHandler });

      const failingHandler = vi.fn().mockImplementation(() => {
        throw new Error('Handler error');
      });

      const successHandler = vi.fn();

      customEventBus.subscribe(TestEvent, failingHandler);
      customEventBus.subscribe(TestEvent, successHandler);

      // Act
      const [error] = await safeRun(() =>
        customEventBus.publish(new TestEvent()),
      );

      // Assert
      expect(error).toBeUndefined(); // Custom error handler should prevent errors from propagating
      expect(errorHandler).toHaveBeenCalled();
      expect(successHandler).toHaveBeenCalled();
    });

    it('should handle multiple async handlers correctly', async () => {
      // Arrange
      const asyncHandler1 = new AsyncTestEventHandler();
      asyncHandler1.delay = 20;

      const asyncHandler2 = new AsyncTestEventHandler();
      asyncHandler2.delay = 10;

      eventBus.registerHandler(TestEvent, asyncHandler1);
      eventBus.registerHandler(TestEvent, asyncHandler2);

      // Act
      const event = new TestEvent();
      await eventBus.publish(event);

      // Assert
      expect(asyncHandler1.handledEvents).toHaveLength(1);
      expect(asyncHandler2.handledEvents).toHaveLength(1);
    });
  });

  describe('Middleware functionality', () => {
    it('should initialize with middleware', async () => {
      // Arrange
      const middleware: EventBusMiddleware = (next) => {
        return async (event) => {
          event.payload.value = 'modified';
          await next(event);
        };
      };

      const middlewareEventBus = new InMemoryEventBus({
        middlewares: [middleware],
      });

      const handler = vi.fn();
      middlewareEventBus.subscribe(TestEvent, handler);

      // Act
      const event = new TestEvent();
      await middlewareEventBus.publish(event);

      // Assert
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: { value: 'modified' },
        }),
      );
    });

    it('should add middleware after initialization', async () => {
      // Arrange
      const handler = vi.fn();
      eventBus.subscribe(TestEvent, handler);

      // Act - Add middleware after creation
      const middleware: EventBusMiddleware = (next) => {
        return async (event) => {
          event.payload.value = 'added later';
          await next(event);
        };
      };

      eventBus.addMiddleware(middleware);

      // Assert
      const event = new TestEvent();
      await eventBus.publish(event);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: { value: 'added later' },
        }),
      );
    });

    it('should execute middleware in the correct order', async () => {
      // Arrange
      const executionOrder: string[] = [];

      const middleware1: EventBusMiddleware = (next) => {
        return async (event) => {
          executionOrder.push('before-middleware1');
          await next(event);
          executionOrder.push('after-middleware1');
        };
      };

      const middleware2: EventBusMiddleware = (next) => {
        return async (event) => {
          executionOrder.push('before-middleware2');
          await next(event);
          executionOrder.push('after-middleware2');
        };
      };

      const middlewareEventBus = new InMemoryEventBus({
        middlewares: [middleware1, middleware2],
      });

      const handler = vi.fn().mockImplementation(() => {
        executionOrder.push('handler');
      });

      middlewareEventBus.subscribe(TestEvent, handler);

      // Act
      await middlewareEventBus.publish(new TestEvent());

      // Assert
      // Middleware should execute in correct order
      // First middleware1, then middleware2, then handler, then back up the chain
      expect(executionOrder).toEqual([
        'before-middleware1',
        'before-middleware2',
        'handler',
        'after-middleware2',
        'after-middleware1',
      ]);
    });

    it('should allow middleware to short-circuit the pipeline', async () => {
      // Arrange
      const shortCircuitMiddleware: EventBusMiddleware = (next) => {
        return async (event) => {
          // Don't call next, stop the pipeline
          return;
        };
      };

      const executionOrder: string[] = [];

      const middleware2: EventBusMiddleware = (next) => {
        return async (event) => {
          executionOrder.push('should not be called');
          await next(event);
        };
      };

      const middlewareEventBus = new InMemoryEventBus({
        middlewares: [shortCircuitMiddleware, middleware2],
      });

      const handler = vi.fn();
      middlewareEventBus.subscribe(TestEvent, handler);

      // Act
      await middlewareEventBus.publish(new TestEvent());

      // Assert
      expect(executionOrder).toEqual([]);
      expect(handler).not.toHaveBeenCalled();
    });

    it('should allow middleware to handle errors', async () => {
      // Arrange
      const errorHandlingMiddleware: EventBusMiddleware = (next) => {
        return async (event) => {
          try {
            await next(event);
          } catch (error) {
            // Suppress the error
          }
        };
      };

      const middlewareEventBus = new InMemoryEventBus({
        middlewares: [errorHandlingMiddleware],
      });

      const handler = vi.fn().mockImplementation(() => {
        throw new Error('Handler error');
      });

      middlewareEventBus.subscribe(TestEvent, handler);

      // Act
      const result = await middlewareEventBus.publish(new TestEvent());
      // Assert
      expect(result).toBeUndefined();
    });

    it('should allow middleware to transform events', async () => {
      // Arrange
      const transformMiddleware: EventBusMiddleware = (next) => {
        return async (event) => {
          if (event instanceof TestEvent) {
            // Transform the event before passing it down
            const transformedEvent = new TestEvent({
              value: `transformed: ${event.payload.value}`,
            });
            await next(transformedEvent);
          } else {
            await next(event);
          }
        };
      };

      const middlewareEventBus = new InMemoryEventBus({
        middlewares: [transformMiddleware],
      });

      const handler = vi.fn();
      middlewareEventBus.subscribe(TestEvent, handler);

      // Act
      await middlewareEventBus.publish(new TestEvent({ value: 'original' }));

      // Assert
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: { value: 'transformed: original' },
        }),
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle undefined or null events gracefully', async () => {
      // Note: TypeScript would prevent this at compile time,
      // but we're testing runtime behavior for robustness

      // Act & Assert
      const [undefinedError] = await safeRun(() => eventBus.publish(undefined));
      expect(undefinedError).not.toBeNull();

      const [nullError] = await safeRun(() => eventBus.publish(null));
      expect(nullError).not.toBeNull();
    });

    it('should handle malformed events', async () => {
      // Arrange
      const handler = vi.fn();
      eventBus.subscribe(TestEvent, handler);

      // Act & Assert
      // @ts-expect-error for testing
      await eventBus.publish({ notAProperEvent: true });

      expect(handler).toHaveBeenCalledTimes(0);
    });

    it('should handle subscribing the same handler multiple times', async () => {
      // Arrange
      const handler = vi.fn();

      // Act - Subscribe the same handler twice
      eventBus.subscribe(TestEvent, handler);
      eventBus.subscribe(TestEvent, handler);

      // Assert - Handler should only be called once (Set deduplication)
      await eventBus.publish(new TestEvent());
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should handle unsubscribing a handler multiple times', () => {
      // Arrange
      const handler = vi.fn();
      eventBus.subscribe(TestEvent, handler);

      // Act - Unsubscribe multiple times
      eventBus.unsubscribe(TestEvent, handler);

      // Assert - Should not throw
      expect(() => {
        eventBus.unsubscribe(TestEvent, handler);
      }).not.toThrow();
    });

    it('should handle extreme cases of many handlers', async () => {
      // Arrange
      const handlerCount = 100;
      const handlers = Array.from({ length: handlerCount }, () => vi.fn());

      // Register all handlers
      handlers.forEach((handler) => {
        eventBus.subscribe(TestEvent, handler);
      });

      // Act
      await eventBus.publish(new TestEvent());

      // Assert - All handlers should be called
      handlers.forEach((handler) => {
        expect(handler).toHaveBeenCalledTimes(1);
      });
    });

    it('should work correctly with inheritance in event types', async () => {
      // Arrange
      // Create derived event class
      class DerivedTestEvent extends TestEvent {
        constructor(
          payload: { value: string; extra?: string } = { value: 'derived' },
        ) {
          super(payload);
        }
      }

      const baseHandler = vi.fn();
      const derivedHandler = vi.fn();

      eventBus.subscribe(TestEvent, baseHandler);
      eventBus.subscribe(DerivedTestEvent, derivedHandler);

      // Act - Publish base event
      await eventBus.publish(new TestEvent());

      // Assert
      expect(baseHandler).toHaveBeenCalledTimes(1);
      expect(derivedHandler).not.toHaveBeenCalled();

      // Reset
      vi.clearAllMocks();

      // Act - Publish derived event
      await eventBus.publish(new DerivedTestEvent());

      // Assert - Only derived handler is called due to event name matching
      expect(baseHandler).not.toHaveBeenCalled();
      expect(derivedHandler).toHaveBeenCalledTimes(1);
    });
  });
});

describe('Performance considerations', () => {
  const eventBus = new InMemoryEventBus();

  it('should handle high throughput of events', async () => {
    // This is more of a benchmark than a strict test
    // Arrange
    const handler = vi.fn();
    eventBus.subscribe(TestEvent, handler);

    // Act - Publish many events in rapid succession
    const eventCount = 1000;
    const events = Array.from(
      { length: eventCount },
      (_, i) => new TestEvent({ value: `event-${i}` }),
    );

    // Measure time
    const startTime = performance.now();

    const promises = events.map((event) =>
      safeRun(() => eventBus.publish(event)),
    );
    const results = await Promise.all(promises);

    const endTime = performance.now();

    // Assert
    // Verify no errors occurred
    const errors = results.filter(([error]) => error);
    expect(errors.length).toBe(0);

    expect(handler).toHaveBeenCalledTimes(eventCount);

    // Log performance info if needed (useful for optimizations)
    // console.log(`Published ${eventCount} events in ${endTime - startTime}ms`);
  });
});
