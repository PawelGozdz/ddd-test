import { IExtendedDomainEvent, IEventMetadata } from '../domain';
import {
  IIntegrationEvent,
  IIntegrationEventMetadata,
  IDomainToIntegrationEventTransformer,
} from './integration-event-interfaces';
import { createIntegrationEvent } from './integration-event.utils';

export interface IContextRouter {
  /**
   * Determines target contexts for a domain event
   * @param event Domain event
   * @returns Array of target context names
   */
  determineTargetContexts(event: IExtendedDomainEvent): string[];
}

/**
 * Base implementation of a domain to integration event transformer
 * Provides core functionality for transforming domain events to integration events
 */
export abstract class DomainToIntegrationTransformer<D = any, I = any>
  implements
    IDomainToIntegrationEventTransformer<
      IExtendedDomainEvent<D>,
      Partial<IIntegrationEventMetadata>
    >
{
  /**
   * Source bounded context
   */
  protected readonly sourceContext: string;

  /**
   * Target bounded context (optional)
   */
  protected readonly targetContext?: string;

  /**
   * Creates a new transformer
   * @param sourceContext Name of the source bounded context
   * @param targetContext Optional name of the target bounded context
   */
  constructor(sourceContext: string, targetContext?: string) {
    this.sourceContext = sourceContext;
    this.targetContext = targetContext;
  }

  /**
   * Transforms a domain event to an integration event
   * @param domainEvent Domain event to transform
   * @param additionalMetadata Optional additional metadata
   * @returns Transformed integration event
   */
  public transform(
    domainEvent: IExtendedDomainEvent<D>,
    additionalMetadata?: Partial<IIntegrationEventMetadata>,
  ): IIntegrationEvent<I> {
    // Transform payload to integration format
    const transformedPayload = this.transformPayload(domainEvent.payload);

    // Create integration metadata from domain metadata
    const integrationMetadata = this.transformMetadata(
      domainEvent.metadata as IEventMetadata,
      additionalMetadata,
    );

    // Create integration event with appropriate type (possibly mapped)
    const integrationEventType = this.getIntegrationEventType(
      domainEvent.eventType,
    );

    return createIntegrationEvent<I>(
      integrationEventType,
      transformedPayload,
      integrationMetadata,
    );
  }

  /**
   * Transforms domain event payload to integration event payload
   * This method should be overridden in derived classes
   * @param domainPayload Domain event payload
   * @returns Transformed integration event payload
   */
  protected abstract transformPayload(domainPayload?: D): I;

  /**
   * Transforms domain event metadata to integration metadata
   * @param domainMetadata Domain event metadata
   * @param additionalMetadata Additional metadata to add
   * @returns Metadata for integration event
   */
  protected transformMetadata(
    domainMetadata: IEventMetadata,
    additionalMetadata?: Partial<IIntegrationEventMetadata>,
  ): Partial<IIntegrationEventMetadata> {
    return {
      // Carry over common metadata
      correlationId: domainMetadata.correlationId,
      causationId: domainMetadata.eventId, // Domain event ID becomes causationId

      // Add source and target context
      sourceContext: this.sourceContext,
      targetContext: this.targetContext,

      // Add schema version (default 1)
      schemaVersion: 1,

      // Add routing key (default is event type)
      routingKey: this.getRoutingKey(domainMetadata),

      // Preserve actor and owner information
      actor: domainMetadata.actor,
      owner: domainMetadata.owner,

      // Add additional metadata
      ...additionalMetadata,
    };
  }

  /**
   * Returns integration event type based on domain event type
   * Default returns the same type, but can be overridden in derived classes
   * @param domainEventType Domain event type
   * @returns Integration event type
   */
  protected getIntegrationEventType(domainEventType: string): string {
    return domainEventType;
  }

  /**
   * Generates routing key for integration event
   * Default uses event type or provides specific implementation
   * @param domainMetadata Domain event metadata
   * @returns Routing key for integration event
   */
  protected getRoutingKey(domainMetadata: IEventMetadata): string {
    return domainMetadata.aggregateType
      ? `${domainMetadata.aggregateType}.${domainMetadata.eventType}`
      : domainMetadata.eventType || '';
  }
}
