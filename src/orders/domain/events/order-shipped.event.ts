import { DomainEvent } from '@/src';

export interface OrderShippedPayload {
  orderId: string;
  trackingNumber: string;
  carrier: string;
  shippedAt: Date;
  estimatedDelivery: Date;
}

export class OrderShippedEvent extends DomainEvent<any> {
  public readonly eventType: string = 'OrderShipped';

  constructor(
    public readonly payload: OrderShippedPayload,
    public readonly metadata?: any,
  ) {
    super(payload, metadata);
  }
}
