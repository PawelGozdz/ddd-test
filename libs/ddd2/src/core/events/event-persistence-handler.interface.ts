// event-persistence-handler.interface.ts

import { IDomainEvent } from './domain';

/**
 * Interface for event persistence handlers
 */
export abstract class IEventPersistenceHandler {
  /**
   * Handle event persistence
   * @returns new version number after handling the event
   */
  abstract handleEvent(event: IDomainEvent): Promise<number>;

  /**
   * Get current version of an aggregate
   */
  abstract getCurrentVersion(aggregateId: any): Promise<number | undefined>;
}
