import { IDomainEvent } from '../domain';
import { EventBusRegistry } from '../event-bus-registry';
import { IEventProcessor } from '../event-processor';
import { IIntegrationEvent } from './integration-event-interfaces';
import { IntegrationEventTransformerRegistry } from './integration-event-transformer-registry';

/**
 * Processor for transforming domain events to integration events
 */
export class IntegrationEventProcessor implements IEventProcessor {
  constructor(
    private readonly transformerRegistry: IntegrationEventTransformerRegistry,
  ) {}

  /**
   * Process a domain event by transforming it to an integration event
   * if a suitable transformer is registered
   */
  async process(
    event: IDomainEvent,
    registry: EventBusRegistry,
  ): Promise<void> {
    // Get integration event bus if registered
    const integrationBus = registry.get<IIntegrationEvent>('integration');
    if (!integrationBus) return;

    // Find transformer for this event type
    const transformer = this.transformerRegistry.find(event.eventType);
    if (!transformer) return;

    // Transform and publish integration event
    const integrationEvent = transformer.transform(event);
    await integrationBus.publish(integrationEvent);
  }
}
