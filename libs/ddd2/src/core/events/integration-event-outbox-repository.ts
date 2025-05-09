import {
  IIntegrationEvent,
  IOutboxIntegrationEvent,
  IntegrationEventStatus,
} from './integration-event-interfaces';

/**
 * Abstract class for integration event outbox repository
 * Defines operations on the outbox independent of concrete implementation
 */
export abstract class IIntegrationEventOutboxRepository {
  /**
   * Saves an event to the outbox
   * @param event Integration event to save
   * @returns ID of the saved event
   */
  abstract save<T = any>(event: IIntegrationEvent<T>): Promise<string>;

  /**
   * Saves multiple events to the outbox
   * @param events Integration events to save
   * @returns IDs of the saved events
   */
  abstract saveBatch<T = any>(
    events: IIntegrationEvent<T>[],
  ): Promise<string[]>;

  /**
   * Retrieves unprocessed events for publication
   * @param limit Maximum number of events to retrieve
   * @param lockTimeout Duration in milliseconds to lock events (prevent concurrent processing)
   * @returns Unprocessed events
   */
  abstract getUnprocessedEvents(
    limit?: number,
    lockTimeout?: number,
  ): Promise<IOutboxIntegrationEvent[]>;

  /**
   * Marks an event as processed
   * @param eventId ID of the processed event
   */
  abstract markAsProcessed(eventId: string): Promise<void>;

  /**
   * Marks multiple events as processed
   * @param eventIds IDs of the processed events
   */
  abstract markBatchAsProcessed(eventIds: string[]): Promise<void>;

  /**
   * Marks an event as failed
   * @param eventId ID of the event
   * @param error Information about the error
   * @param retry Whether to retry processing later
   */
  abstract markAsFailed(
    eventId: string,
    error: Error,
    retry?: boolean,
  ): Promise<void>;

  /**
   * Gets an event by ID
   * @param eventId ID of the event
   * @returns Event or null if not found
   */
  abstract getById<T = any>(
    eventId: string,
  ): Promise<IOutboxIntegrationEvent<T> | null>;

  /**
   * Deletes processed events older than specified date
   * @param olderThan Delete events older than this date
   * @param status Status of events to delete (default: PROCESSED)
   * @returns Number of deleted events
   */
  abstract deleteOldEvents(
    olderThan: Date,
    status?: IntegrationEventStatus,
  ): Promise<number>;
}
