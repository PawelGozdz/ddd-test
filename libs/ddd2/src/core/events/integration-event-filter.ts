import {
  IIntegrationEvent,
  IIntegrationEventMetadata,
  IIntegrationEventFilter,
} from './integration-event-interfaces';

/**
 * Filter for integration events based on metadata
 * Allows filtering events based on their metadata properties
 */
export class MetadataBasedEventFilter implements IIntegrationEventFilter {
  /**
   * Creates a new metadata-based filter
   * @param filterPredicate Function checking metadata
   */
  constructor(
    private readonly filterPredicate: (
      metadata: IIntegrationEventMetadata,
    ) => boolean,
  ) {}

  /**
   * Checks if an event should be processed
   * @param event Integration event to check
   * @returns True if event should be processed, false otherwise
   */
  public shouldProcess<T = any>(event: IIntegrationEvent<T>): boolean {
    if (!event.metadata) {
      return true; // Default behavior for events without metadata
    }

    return this.filterPredicate(event.metadata);
  }
}

/**
 * Composite filter for integration events
 * Combines multiple filters into one
 */
export class CompositeEventFilter implements IIntegrationEventFilter {
  /**
   * Creates a new composite filter
   * @param filters List of filters to combine
   * @param mode Operation mode: 'and' (all must pass) or 'or' (at least one must pass)
   */
  constructor(
    private readonly filters: IIntegrationEventFilter[],
    private readonly mode: 'and' | 'or' = 'and',
  ) {}

  /**
   * Checks if an event should be processed
   * @param event Integration event to check
   * @returns True if event should be processed, false otherwise
   */
  public shouldProcess<T = any>(event: IIntegrationEvent<T>): boolean {
    if (this.filters.length === 0) {
      return true;
    }

    if (this.mode === 'and') {
      return this.filters.every((filter) => filter.shouldProcess(event));
    } else {
      return this.filters.some((filter) => filter.shouldProcess(event));
    }
  }
}

/**
 * Target context filter for integration events
 * Filters events based on their target context
 */
export class TargetContextFilter implements IIntegrationEventFilter {
  /**
   * Creates a new target context filter
   * @param targetContexts Contexts to include
   */
  constructor(private readonly targetContexts: string[]) {}

  /**
   * Checks if an event should be processed
   * @param event Integration event to check
   * @returns True if event should be processed, false otherwise
   */
  public shouldProcess<T = any>(event: IIntegrationEvent<T>): boolean {
    // If no metadata or target context, process by default
    if (!event.metadata || !event.metadata.targetContext) {
      return true;
    }

    // Process if event's target context is in our list
    return this.targetContexts.includes(event.metadata.targetContext);
  }
}

/**
 * Event type filter for integration events
 * Filters events based on their event type
 */
export class EventTypeFilter implements IIntegrationEventFilter {
  /**
   * Creates a new event type filter
   * @param eventTypes Event types to include
   */
  constructor(private readonly eventTypes: string[]) {}

  /**
   * Checks if an event should be processed
   * @param event Integration event to check
   * @returns True if event should be processed, false otherwise
   */
  public shouldProcess<T = any>(event: IIntegrationEvent<T>): boolean {
    return this.eventTypes.includes(event.eventType);
  }
}
