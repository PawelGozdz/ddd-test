import { DomainEvent } from '@/src';

export interface OrderPlacedPayload {
  orderId: string;
  customerId: string;
  items: {
    productId: string;
    quantity: number;
    price: number;
  }[];
  totalAmount: number;
  placedAt: Date;
}

export class OrderPlacedEvent extends DomainEvent<any> {
  public readonly eventType: string = 'OrderPlaced';

  constructor(
    public readonly payload: OrderPlacedPayload,
    public readonly metadata?: any,
  ) {
    super(payload, metadata);
  }
}
