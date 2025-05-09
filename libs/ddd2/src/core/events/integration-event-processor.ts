import {
  IIntegrationEvent,
  IIntegrationEventFilter,
} from './integration-event-interfaces';

/**
 * Abstract class for integration event processor
 * Responsible for publishing events from the outbox
 */
export abstract class IIntegrationEventProcessor {
  /**
   * Initializes the processor
   */
  abstract initialize(): Promise<void>;

  /**
   * Runs a single processing of events
   * @param batchSize Maximum number of events to process in one batch
   * @returns Number of processed events
   */
  abstract processEvents(batchSize?: number): Promise<number>;

  /**
   * Starts continuous processing of events
   * @param interval Interval between processing (ms)
   */
  abstract startProcessing(interval?: number): Promise<void>;

  /**
   * Stops continuous processing of events
   */
  abstract stopProcessing(): Promise<void>;

  /**
   * Adds an event filter to the processor
   * @param filter Filter to add
   */
  abstract addFilter(filter: IIntegrationEventFilter): void;

  /**
   * Removes all filters from the processor
   */
  abstract clearFilters(): void;

  /**
   * Publishes a single event
   * @param event Event to publish
   */
  abstract publishEvent<T = any>(event: IIntegrationEvent<T>): Promise<void>;

  /**
   * Handles failed events
   * @param eventId ID of the failed event
   * @param error Error that occurred during processing
   */
  abstract handleFailedEvent(eventId: string, error: Error): Promise<void>;
}
