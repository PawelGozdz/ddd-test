// generic-event-persistence-handler.ts
import { IDomainEvent } from './domain';
import { IEventPersistenceHandler } from './event-persistence-handler.interface';

/**
 * Generic implementation of event persistence handler
 * Delegates to specific handlers based on event type
 */
// TODO: dorobić testy
// TODO: zaktualizować HOW-TO

export abstract class GenericEventPersistenceHandler
  implements IEventPersistenceHandler
{
  private handlers = new Map<string, (payload: any) => Promise<number>>();

  /**
   * Register handler for specific event type
   */
  protected registerHandler<T = any>(
    eventType: string,
    handler: (payload: T) => Promise<number>,
  ): void {
    this.handlers.set(eventType, handler as any);
  }

  /**
   * Handle event persistence
   */
  async handleEvent(event: IDomainEvent): Promise<number> {
    const handler = this.handlers.get(event.eventType);

    if (!handler) {
      throw new Error(
        `No handler registered for event type ${event.eventType} in ${this.constructor.name}`,
      );
    }

    return await handler(event.payload);
  }

  /**
   * Get current version of an aggregate
   */
  abstract getCurrentVersion(aggregateId: any): Promise<number | undefined>;
}
