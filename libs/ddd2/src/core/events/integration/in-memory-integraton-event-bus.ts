import { BaseEventBus, BaseEventBusOptions } from '../base-event-bus';
import { IIntegrationEventBus } from '../event-bus';
import { IIntegrationEvent } from './integration-event-interfaces';

export interface InMemoryIntegrationEventBusOptions
  extends BaseEventBusOptions {
  /**
   * Whether to process events synchronously
   */
  synchronous?: boolean;
}

export class InMemoryIntegrationEventBus
  extends BaseEventBus<IIntegrationEvent>
  implements IIntegrationEventBus
{
  /**
   * Creates a new in-memory integration event bus
   */
  constructor(options: InMemoryIntegrationEventBusOptions = {}) {
    super(options);
  }

  /**
   * Dostosowanie komunikatów logowania dla eventów integracyjnych (opcjonalnie)
   */
  protected override log(message: string): void {
    if (this.options.enableLogging && this.options.logger) {
      this.options.logger(`[IntegrationEventBus] ${message}`);
    }
  }
}
