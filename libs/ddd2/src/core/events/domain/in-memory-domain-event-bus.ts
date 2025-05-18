import { BaseEventBus, BaseEventBusOptions } from '../base-event-bus';
import { IDomainEventBus } from '../event-bus';
import { IDomainEvent } from './domain-event-interfaces';

/**
 * Options specific to InMemoryEventBus
 */
export interface InMemoryDomainEventBusOptions extends BaseEventBusOptions {
  /**
   * Whether to process events synchronously
   */
  synchronous?: boolean;
}

/**
 * In-memory implementation of EventBus
 * Processes events locally within the same process
 */
export class InMemoryDomainEventBus
  extends BaseEventBus<IDomainEvent>
  implements IDomainEventBus
{
  /**
   * Creates a new in-memory event bus
   */
  constructor(options: InMemoryDomainEventBusOptions = {}) {
    super(options);
  }

  protected override log(message: string): void {
    if (this.options.enableLogging && this.options.logger) {
      this.options.logger(`[DomainEventBus] ${message}`);
    }
  }
}
