import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { safeRun } from '../../utils';
import { AggregateRoot, EntityId, IDomainEvent, IEventBus } from '..';
import { EventDispatcher, createEventDispatcher } from './event-dispatcher';

// Mock implementation of AggregateRoot
class MockAggregate extends AggregateRoot<string> {
  private _events: IDomainEvent[] = [];

  constructor({ id, version }: { id: EntityId<string>; version?: number }) {
    super({ id, version });
  }

  // Override getDomainEvents to return our controlled events
  getDomainEvents(): IDomainEvent[] {
    return [...this._events];
  }

  // Override commit to clear our events
  commit(): void {
    this._events = [];
  }

  // Helper method to add test events
  addTestEvent(eventType: string, payload: any = {}): void {
    this._events.push({
      eventType,
      payload
    });
  }
}

// Mock implementation of EventBus
class MockEventBus {
  // Track published events for verification
  publishedEvents: IDomainEvent[] = [];
  
  // Add ability to make publish fail for error tests
  shouldFail: boolean = false;
  failOnEventType?: string;

  async publish(event: IDomainEvent): Promise<void> {
    if (this.shouldFail || (this.failOnEventType && event.eventType === this.failOnEventType)) {
      throw new Error('Event publishing failed');
    }
    
    this.publishedEvents.push(event);
  }

  clear(): void {
    this.publishedEvents = [];
    this.shouldFail = false;
    this.failOnEventType = undefined;
  }
}

describe('EventDispatcher', () => {
  let eventBus: MockEventBus;
  let eventDispatcher: EventDispatcher;
  let aggregate: MockAggregate;
  let aggregateId: EntityId<string>;
  
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    
    // Prepare test objects
    eventBus = new MockEventBus();
    eventDispatcher = new EventDispatcher(eventBus as unknown as IEventBus);
    aggregateId = EntityId.fromUUID('123e4567-e89b-12d3-a456-426614174000');
    aggregate = new MockAggregate({ id: aggregateId });
  });
  
  afterEach(() => {
    // Clean up after tests
    vi.resetAllMocks();
    eventBus.clear();
  });
  
  describe('dispatchEventsForAggregate', () => {
    it('should dispatch all events from an aggregate', async () => {
      // Arrange
      aggregate.addTestEvent('TestEvent1', { value: 'test1' });
      aggregate.addTestEvent('TestEvent2', { value: 'test2' });
      
      // Act
      await eventDispatcher.dispatchEventsForAggregate(aggregate);
      
      // Assert
      expect(eventBus.publishedEvents).toHaveLength(2);
      expect(eventBus.publishedEvents[0]).toEqual({
        eventType: 'TestEvent1',
        payload: { value: 'test1' }
      });
      expect(eventBus.publishedEvents[1]).toEqual({
        eventType: 'TestEvent2',
        payload: { value: 'test2' }
      });
    });
    
    it('should commit the aggregate after dispatching events', async () => {
      // Arrange
      aggregate.addTestEvent('TestEvent1');
      aggregate.addTestEvent('TestEvent2');
      
      const commitSpy = vi.spyOn(aggregate, 'commit');
      
      // Act
      await eventDispatcher.dispatchEventsForAggregate(aggregate);
      
      // Assert
      expect(commitSpy).toHaveBeenCalledTimes(1);
      expect(aggregate.getDomainEvents()).toHaveLength(0);
    });
    
    it('should do nothing if the aggregate has no events', async () => {
      // Arrange - Aggregate with no events
      const publishSpy = vi.spyOn(eventBus, 'publish');
      const commitSpy = vi.spyOn(aggregate, 'commit');
      
      // Act
      await eventDispatcher.dispatchEventsForAggregate(aggregate);
      
      // Assert
      expect(publishSpy).not.toHaveBeenCalled();
      expect(commitSpy).not.toHaveBeenCalled();
    });
    
    it('should throw an error if event publishing fails', async () => {
      // Arrange
      aggregate.addTestEvent('TestEvent1');
      aggregate.addTestEvent('FailingEvent');
      aggregate.addTestEvent('TestEvent2');
      
      eventBus.failOnEventType = 'FailingEvent';
      
      // Act & Assert
      const [error] = await safeRun(() => eventDispatcher.dispatchEventsForAggregate(aggregate));
      
      expect(error).not.toBeNull();
      expect(error?.message).toBe('Event publishing failed');
      
      // Should have published only the first event
      expect(eventBus.publishedEvents).toHaveLength(1);
      
      // Aggregate should not be committed on error
      expect(aggregate.getDomainEvents()).toHaveLength(3);
    });
  });
  
  describe('dispatchEvents', () => {
    it('should dispatch individual events', async () => {
      // Arrange
      const event1: IDomainEvent = { eventType: 'TestEvent1', payload: { value: 1 } };
      const event2: IDomainEvent = { eventType: 'TestEvent2', payload: { value: 2 } };
      
      // Act
      await eventDispatcher.dispatchEvents(event1, event2);
      
      // Assert
      expect(eventBus.publishedEvents).toHaveLength(2);
      expect(eventBus.publishedEvents).toContainEqual(event1);
      expect(eventBus.publishedEvents).toContainEqual(event2);
    });
    
    it('should handle empty events array', async () => {
      // Arrange
      const publishSpy = vi.spyOn(eventBus, 'publish');
      
      // Act
      await eventDispatcher.dispatchEvents();
      
      // Assert
      expect(publishSpy).not.toHaveBeenCalled();
    });
    
    it('should throw an error if event publishing fails', async () => {
      // Arrange
      const event1: IDomainEvent = { eventType: 'TestEvent1', payload: { value: 1 } };
      const event2: IDomainEvent = { eventType: 'FailingEvent', payload: { value: 2 } };
      const event3: IDomainEvent = { eventType: 'TestEvent3', payload: { value: 3 } };
      
      eventBus.failOnEventType = 'FailingEvent';
      
      // Act & Assert
      const [error] = await safeRun(() => eventDispatcher.dispatchEvents(event1, event2, event3));
      
      expect(error).not.toBeNull();
      expect(error?.message).toBe('Event publishing failed');
      
      // Should have published only the first event
      expect(eventBus.publishedEvents).toHaveLength(1);
      expect(eventBus.publishedEvents[0]).toEqual(event1);
    });
  });
  
  describe('createEventDispatcher factory function', () => {
    it('should create an EventDispatcher instance', () => {
      // Act
      const dispatcher = createEventDispatcher(eventBus as unknown as IEventBus);
      
      // Assert
      expect(dispatcher).toBeInstanceOf(EventDispatcher);
    });
    
    it('should pass the provided event bus to the dispatcher', async () => {
      // Arrange
      const dispatcher = createEventDispatcher(eventBus as unknown as IEventBus);
      const testEvent: IDomainEvent = { eventType: 'TestEvent', payload: {} };
      
      // Act
      await dispatcher.dispatchEvents(testEvent);
      
      // Assert
      expect(eventBus.publishedEvents).toHaveLength(1);
      expect(eventBus.publishedEvents[0]).toEqual(testEvent);
    });
  });
});
