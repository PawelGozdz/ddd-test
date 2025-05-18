import { DomainEvent } from '@/src';

export interface OrderCancelledPayload {
  orderId: string;
  reason: string;
  cancelledAt: Date;
  refundAmount?: number;
}

export class OrderCancelledEvent extends DomainEvent<any> {
  public readonly eventType: string = 'OrderCancelled';

  constructor(
    public readonly payload: OrderCancelledPayload,
    public readonly metadata?: any,
  ) {
    super(payload, metadata);
  }
}
