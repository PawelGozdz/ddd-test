import { IExtendedDomainEvent } from '../domain';
import {
  IDomainToIntegrationEventTransformer,
  IIntegrationEvent,
} from './integration-event-interfaces';

/**
 * Registry for event transformers
 * Stores mappings between domain event types and their transformers
 */
export class IntegrationEventTransformerRegistry {
  private readonly transformers: Map<
    string,
    IDomainToIntegrationEventTransformer<any, any>
  > = new Map();

  /**
   * Registers a transformer for a specific domain event type
   * @param domainEventType Domain event type
   * @param transformer Transformer for this type
   */
  public register<D = any, I = any>(
    domainEventType: string,
    transformer: IDomainToIntegrationEventTransformer<D, I>,
  ): void {
    this.transformers.set(domainEventType, transformer);
  }

  /**
   * Finds a transformer for a specific domain event type
   * @param domainEventType Domain event type
   * @returns Transformer for this type or undefined if not found
   */
  public find<D = any, I = any>(
    domainEventType: string,
  ): IDomainToIntegrationEventTransformer<D, I> | undefined {
    return this.transformers.get(domainEventType) as
      | IDomainToIntegrationEventTransformer<D, I>
      | undefined;
  }

  /**
   * Transforms a domain event to an integration event using registered transformer
   * @param domainEvent Domain event to transform
   * @returns Integration event or undefined if no transformer found
   */
  public transform<D = any, I = any>(
    domainEvent: IExtendedDomainEvent<D>,
  ): IIntegrationEvent<I> | undefined {
    const transformer = this.find<
      IExtendedDomainEvent<D>,
      IIntegrationEvent<I>
    >(domainEvent.eventType);

    if (!transformer) {
      return undefined;
    }

    return transformer.transform(domainEvent);
  }

  /**
   * Clears all registered transformers
   */
  public clear(): void {
    this.transformers.clear();
  }

  /**
   * Checks if a transformer is registered for a specific domain event type
   * @param domainEventType Domain event type
   * @returns True if transformer is registered, false otherwise
   */
  public hasTransformer(domainEventType: string): boolean {
    return this.transformers.has(domainEventType);
  }

  /**
   * Gets all registered domain event types
   * @returns Array of registered domain event types
   */
  public getRegisteredEventTypes(): string[] {
    return Array.from(this.transformers.keys());
  }
}
