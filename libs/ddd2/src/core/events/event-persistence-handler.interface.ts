// event-persistence-handler.interface.ts

import { IDomainEvent } from './domain';

/**
 * Interface for event persistence handlers
 */
export interface IEventPersistenceHandler {
  /**
   * Handle event persistence
   * @returns new version number after handling the event
   */
  handleEvent(event: IDomainEvent): Promise<number>;

  /**
   * Get current version of an aggregate
   */
  getCurrentVersion(aggregateId: any): Promise<number | undefined>;
}
