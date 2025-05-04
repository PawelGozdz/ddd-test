import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LibUtils } from '../../utils';
import { 
  DomainEvent,
  IDomainEvent,
  IExtendedDomainEvent,
} from '..';
import { EventBusBuilder } from './event-bus-builder';
import { InMemoryEventBus } from './in-memory-domain-event-bus';

describe('EventBusBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic functionality', () => {
    it('should create a basic event bus', () => {
      // Arrange
      const builder = EventBusBuilder.create();
      
      // Act
      const eventBus = builder.build();
      
      // Assert
      expect(eventBus).toBeInstanceOf(InMemoryEventBus);
    });

    it('should allow chaining methods', () => {
      // Arrange
      const builder = EventBusBuilder.create();
      const middleware = vi.fn(next => async (event) => next(event));
      const errorHandler = vi.fn();
      
      // Act
      const result = builder
        .withLogging()
        .withMiddleware(middleware)
        .withErrorHandler(errorHandler);
      
      // Assert
      expect(result).toBe(builder);
    });
  });

  describe('Logging configuration', () => {
    it('should configure event bus with logging', async () => {
      // Arrange
      const builder = EventBusBuilder.create();
      
      // Definicja klasy eventu
      class TestEvent implements IDomainEvent {
        eventType = 'TestEvent';
        payload = { test: true };
      }
      
      const event = new TestEvent();
      const handlerSpy = vi.fn();
      
      // Act
      const eventBus = builder.withLogging().build();
      
      // Subscribe a dummy handler
      eventBus.subscribe(TestEvent, handlerSpy);
      await eventBus.publish(event);
      
      // Assert
      expect(handlerSpy).toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should configure custom error handler', async () => {
      // Arrange
      const builder = EventBusBuilder.create();
      const errorHandler = vi.fn();
      const error = new Error('Test error');
      
      // Definicja klasy eventu
      class TestErrorEvent implements IDomainEvent {
        eventType = 'TestErrorEvent';
        payload = { test: true };
      }
      
      const event = new TestErrorEvent();
      
      // Create a handler that throws an error
      const errorThrowingHandler = async () => {
        throw error;
      };
      
      // Act
      const eventBus = builder.withErrorHandler(errorHandler).build();
      
      // Subscribe the error-throwing handler
      eventBus.subscribe(TestErrorEvent, errorThrowingHandler);
      await eventBus.publish(event);
      
      // Assert
      expect(errorHandler).toHaveBeenCalledWith(error, 'TestErrorEvent');
    });
  });

  describe('Middleware', () => {
    it('should apply middleware', async () => {
      // Arrange
      const builder = EventBusBuilder.create();
      const middlewareSpy = vi.fn().mockImplementation(next => async (event) => {
        event.payload.modified = true;
        return next(event);
      });
      
      const handlerSpy = vi.fn().mockResolvedValue(undefined);
      
      // Definicja klasy eventu
      class ModifiedEvent implements IDomainEvent {
        eventType = 'ModifiedEvent';
        payload = { test: true };
      }
      
      const event = new ModifiedEvent();
      
      // Act
      const eventBus = builder.withMiddleware(middlewareSpy).build();
      
      // Subscribe a test handler
      eventBus.subscribe(ModifiedEvent, handlerSpy);
      await eventBus.publish(event);
      
      // Assert
      expect(middlewareSpy).toHaveBeenCalled();
      expect(handlerSpy).toHaveBeenCalled();
      // Sprawdzamy, czy middleware zmodyfikowało event
      expect(event.payload).toHaveProperty('modified', true);
    });

    it('should add correlation ID to extended events', async () => {
      // Arrange
      const builder = EventBusBuilder.create();
      const handlerSpy = vi.fn().mockResolvedValue(undefined);
      
      // Definicja klasy eventu
      class CorrelatedEvent implements IExtendedDomainEvent {
        eventType = 'CorrelatedEvent';
        payload = { test: true };
        metadata = {};
      }
      
      const event = new CorrelatedEvent();
      
      // Act
      const eventBus = builder.withCorrelation().build();
      
      // Subscribe a test handler
      eventBus.subscribe(CorrelatedEvent, handlerSpy);
      await eventBus.publish(event);
      
      // Assert
      expect(handlerSpy).toHaveBeenCalled();
      expect(event.metadata).toHaveProperty('correlationId');
      expect(LibUtils.isValidUUID(event.metadata['correlationId'])).toBe(true);
    });

    it('should initialize metadata if it is missing', async () => {
      // Arrange
      const builder = EventBusBuilder.create();
      const handlerSpy = vi.fn().mockResolvedValue(undefined);
      
      // Definicja klasy eventu bez metadanych
      class NoMetadataEvent extends DomainEvent {
        eventType = 'NoMetadataEvent';
        payload = { test: true };
        // metadata is missing
      }
      
      const event = new NoMetadataEvent();
      
      // Act
      const eventBus = builder.withCorrelation().build();
      
      // Subscribe a test handler
      eventBus.subscribe(NoMetadataEvent, handlerSpy);
      await eventBus.publish(event);
      
      // Assert
      expect(handlerSpy).toHaveBeenCalled();
      expect(event).toHaveProperty('metadata');
      expect(event['metadata']).toHaveProperty('correlationId');
      expect(LibUtils.isValidUUID(event['metadata'].correlationId)).toBe(true);
    });

    it('should not overwrite existing correlation ID', async () => {
      // Arrange
      const builder = EventBusBuilder.create();
      const handlerSpy = vi.fn().mockResolvedValue(undefined);
      const existingId = LibUtils.getUUID();
      
      // Weryfikuj, że istniejący ID jest poprawnym UUID
      expect(LibUtils.isValidUUID(existingId)).toBe(true);
      
      // Definicja klasy eventu z istniejącym correlationId
      class ExistingCorrelationEvent implements IExtendedDomainEvent {
        eventType = 'ExistingCorrelationEvent';
        payload = { test: true };
        metadata = {
          correlationId: existingId
        };
      }
      
      const event = new ExistingCorrelationEvent();
      const originalId = event.metadata.correlationId;
      
      // Act
      const eventBus = builder.withCorrelation().build();
      
      // Subscribe a test handler
      eventBus.subscribe(ExistingCorrelationEvent, handlerSpy);
      await eventBus.publish(event);
      
      // Assert
      expect(handlerSpy).toHaveBeenCalled();
      expect(event.metadata.correlationId).toBe(originalId);
    });

    it('should apply custom middleware', async () => {
      // Arrange
      const customAction = vi.fn();
      const builder = EventBusBuilder.create();
      
      // Definicja klasy eventu
      class CustomMiddlewareEvent implements IDomainEvent {
        eventType = 'CustomMiddlewareEvent';
        payload = { test: true };
      }
      
      const event = new CustomMiddlewareEvent();
      const handlerSpy = vi.fn().mockResolvedValue(undefined);
      
      // Act
      const eventBus = builder
        .withCustomMiddleware(async (event, next) => {
          customAction(event);
          await next(event);
        })
        .build();
      
      // Subscribe a test handler
      eventBus.subscribe(CustomMiddlewareEvent, handlerSpy);
      await eventBus.publish(event);
      
      // Assert
      expect(customAction).toHaveBeenCalledWith(event);
      expect(handlerSpy).toHaveBeenCalled();
    });

    it('should apply multiple middlewares in the correct order', async () => {
      // Arrange
      const callOrder: string[] = [];
      const builder = EventBusBuilder.create();
      
      // Definicja klasy eventu
      class MultiMiddlewareEvent implements IDomainEvent {
        eventType = 'MultiMiddlewareEvent';
        payload = { test: true };
      }
      
      const event = new MultiMiddlewareEvent();
      
      const middleware1 = next => async (event) => {
        callOrder.push('middleware1-before');
        await next(event);
        callOrder.push('middleware1-after');
      };
      
      const middleware2 = next => async (event) => {
        callOrder.push('middleware2-before');
        await next(event);
        callOrder.push('middleware2-after');
      };
      
      const handlerSpy = vi.fn().mockImplementation(async () => {
        callOrder.push('handler');
      });
      
      // Act
      const eventBus = builder
        .withMiddleware(middleware1)
        .withMiddleware(middleware2)
        .build();
      
      // Subscribe a test handler
      eventBus.subscribe(MultiMiddlewareEvent, handlerSpy);
      await eventBus.publish(event);
      
      // Assert
      expect(callOrder).toEqual([
        'middleware1-before',
        'middleware2-before',
        'handler',
        'middleware2-after',
        'middleware1-after'
      ]);
    });
  });

  describe('Complete configurations', () => {
    it('should configure event bus with all features', async () => {
      // Arrange
      const errorHandler = vi.fn();
      const middleware = vi.fn(next => async (event) => next(event));
      
      // Definicja klasy eventu z metadanymi
      class CompleteEvent extends DomainEvent {
        eventType = 'CompleteEvent';
        payload = { test: true };
      }
      
      const event = new CompleteEvent();
      const handlerSpy = vi.fn().mockResolvedValue(undefined);
      
      // Act
      const eventBus = EventBusBuilder.create()
        .withLogging()
        .withCorrelation()
        .withMiddleware(middleware)
        .withErrorHandler(errorHandler)
        .build();
      
      // Subscribe a test handler
      eventBus.subscribe(CompleteEvent, handlerSpy);
      await eventBus.publish(event);
      
      // Assert
      expect(middleware).toHaveBeenCalled();
      expect(handlerSpy).toHaveBeenCalled();
      expect(event).toHaveProperty('metadata');
      expect(event['metadata']).toHaveProperty('correlationId');
      expect(LibUtils.isValidUUID(event['metadata'].correlationId)).toBe(true);
    });
  });
});
