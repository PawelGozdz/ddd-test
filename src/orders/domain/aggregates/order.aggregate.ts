import { OrderPlacedEvent } from '../events/order-placed.event';
import { OrderShippedEvent } from '../events/order-shipped.event';
import { OrderCancelledEvent } from '../events/order-cancelled.event';
import { AggregateRoot, EntityId } from '@/src';
import { ProductItem } from '../value-objects/product-item.vo';
import { OrderId } from '../value-objects/order-id.vo';

export enum OrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export class Order extends AggregateRoot<string> {
  private customerId: string;
  private items: ProductItem[] = [];
  private status: OrderStatus = OrderStatus.PENDING;
  private totalAmount: number = 0;
  private trackingNumber?: string;
  private carrier?: string;
  private shippedAt?: Date;
  private estimatedDelivery?: Date;
  private cancelReason?: string;
  private placedAt: Date;

  private constructor(id: OrderId) {
    super({ id });
  }

  public static create(
    id: OrderId,
    customerId: string,
    items: ProductItem[],
  ): Order {
    const order = new Order(id);

    // Walidacja
    if (!customerId) {
      throw new Error('Customer ID is required');
    }

    if (!items || items.length === 0) {
      throw new Error('Order must contain at least one item');
    }

    // Obliczenie sumy zamówienia
    const totalAmount = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    // Zdarzenie OrderPlaced
    order.apply(
      new OrderPlacedEvent({
        orderId: id.value,
        customerId,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
        })),
        totalAmount,
        placedAt: new Date(),
      }),
    );

    return order;
  }

  public ship(
    trackingNumber: string,
    carrier: string,
    estimatedDelivery: Date,
  ): void {
    // Walidacja stanu
    if (this.status !== OrderStatus.PAID) {
      throw new Error('Cannot ship an order that is not paid');
    }

    if (!trackingNumber || !carrier) {
      throw new Error('Tracking number and carrier are required');
    }

    // Zdarzenie OrderShipped
    this.apply(
      new OrderShippedEvent({
        orderId: this.getId().getValue(),
        trackingNumber,
        carrier,
        shippedAt: new Date(),
        estimatedDelivery,
      }),
    );
  }

  public cancel(reason: string): void {
    // Walidacja stanu
    if (this.status === OrderStatus.DELIVERED) {
      throw new Error('Cannot cancel an order that has been delivered');
    }

    if (this.status === OrderStatus.CANCELLED) {
      throw new Error('Order is already cancelled');
    }

    // Zdarzenie OrderCancelled
    this.apply(
      new OrderCancelledEvent({
        orderId: this.getId().getValue(),
        reason,
        cancelledAt: new Date(),
        refundAmount:
          this.status === OrderStatus.PAID ? this.totalAmount : undefined,
      }),
    );
  }

  private onOrderShipped(event: OrderShippedEvent): void {
    this.status = OrderStatus.SHIPPED;
    this.trackingNumber = event.payload.trackingNumber;
    this.carrier = event.payload.carrier;
    this.shippedAt = event.payload.shippedAt;
    this.estimatedDelivery = event.payload.estimatedDelivery;
  }

  private onOrderCancelled(event: OrderCancelledEvent): void {
    this.status = OrderStatus.CANCELLED;
    this.cancelReason = event.payload.reason;
  }

  // Gettery

  public getStatus(): OrderStatus {
    return this.status;
  }

  public getCustomerId(): string {
    return this.customerId;
  }

  public getItems(): ProductItem[] {
    return [...this.items];
  }

  public getTotalAmount(): number {
    return this.totalAmount;
  }
}
