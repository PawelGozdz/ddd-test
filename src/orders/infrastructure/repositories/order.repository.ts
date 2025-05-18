import { Injectable } from '@nestjs/common';
import { Order } from '../../domain/aggregates/order.aggregate';
import { OrderId } from '../../domain/value-objects/order-id.vo';
import {
  IBaseRepository,
  IEnhancedEventDispatcher,
  IEventPersistenceHandler,
} from '@/src';
import { OrderPlacedEvent } from 'src/orders/domain/events/order-placed.event';
import { OrderShippedEvent } from 'src/orders/domain/events/order-shipped.event';
import { OrderCancelledEvent } from 'src/orders/domain/events/order-cancelled.event';

@Injectable()
export class OrderRepository extends IBaseRepository {
  // Symulacja bazy danych
  private orders: Map<string, Order> = new Map();

  constructor(
    private readonly dispatcher: IEnhancedEventDispatcher,
    private readonly persistor: IEventPersistenceHandler,
  ) {
    super(dispatcher, persistor);
  }

  async findById(id: OrderId): Promise<Order | null> {
    const order = this.orders.get(id.getValue());
    return order || null;
  }

  async delete(order: Order): Promise<void> {
    this.orders.delete(order.getId().getValue());
  }

  onOrderPlaced(event: OrderPlacedEvent): void {
    console.log('--------ENVNV ON CREATED REPO', event);
  }

  onOrderShipped(event: OrderShippedEvent): void {
    console.log('----------ENVNV ON SHIPPED REPO', event);
  }

  onOrderCancelled(event: OrderCancelledEvent): void {
    console.log('-------ENVNV ON CANCELLED REPO', event);
  }
}
