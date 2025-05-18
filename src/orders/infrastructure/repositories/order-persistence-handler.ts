import { IDomainEvent, IEventPersistenceHandler } from '@/src';
import { Injectable } from '@nestjs/common';
import { OrderPlacedPayload } from 'src/orders/domain/events/order-placed.event';

@Injectable()
export class OrderEventHandler implements IEventPersistenceHandler {
  orderStore = new Map<string, any>();

  constructor() {}

  async getCurrentVersion(id: any): Promise<number | null> {
    const order = await this.orderStore.get(id.getValue());
    return order?.['version'] ?? null;
  }

  async handleEvent(event: IDomainEvent): Promise<number> {
    // Delegowanie do odpowiedniego handlera
    const handlerName = `handle${event.eventType}`;
    if (typeof this[handlerName] !== 'function') {
      throw new Error(`Missing handler ${handlerName} in OrderEventHandler`);
    }
    return await this[handlerName](event.payload);
  }

  private async handleOrderPlaced(
    payload: OrderPlacedPayload,
  ): Promise<number> {
    console.log('HANDLER IN PERSISTANCE', this.handleOrderPlaced.name);
    return 1;
  }
}
