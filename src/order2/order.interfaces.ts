// src/projections/orders/domain/order-events.ts
export interface OrderPlacedPayload {
  orderId: string;
  customerId: string;
  customerEmail: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
  }>;
  totalAmount: number;
  currency: string;
  placedAt: Date;
}

export interface OrderShippedPayload {
  orderId: string;
  trackingNumber: string;
  carrier: string;
  shippedAt: Date;
}

export interface OrderCancelledPayload {
  orderId: string;
  reason: string;
  cancelledAt: Date;
}

// src/projections/orders/domain/order-state.ts
export interface OrderProjectionState {
  orders: OrderSummary[];
  statistics: {
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    ordersByStatus: Record<OrderStatus, number>;
    topCustomers: Array<{
      customerId: string;
      orderCount: number;
      totalSpent: number;
    }>;
  };
  lastUpdated: Date;
}

export interface OrderSummary {
  orderId: string;
  customerId: string;
  customerEmail: string;
  status: OrderStatus;
  totalAmount: number;
  currency: string;
  itemCount: number;
  placedAt: Date;
  shippedAt?: Date;
  trackingNumber?: string;
  carrier?: string;
}

export enum OrderStatus {
  PLACED = 'PLACED',
  SHIPPED = 'SHIPPED',
  CANCELLED = 'CANCELLED',
}
