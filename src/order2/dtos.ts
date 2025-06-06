import { OrderStatus } from './order.interfaces';

export class OrderSummaryDto {
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

export class OrderStatisticsDto {
  totalOrders: number;

  totalRevenue: number;

  averageOrderValue: number;

  ordersByStatus: Record<OrderStatus, number>;

  topCustomers: Array<{
    customerId: string;
    orderCount: number;
    totalSpent: number;
  }>;
}
