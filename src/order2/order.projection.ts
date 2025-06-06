import { BaseProjection, IExtendedDomainEvent } from '@/src';
import {
  OrderCancelledPayload,
  OrderPlacedPayload,
  OrderProjectionState,
  OrderShippedPayload,
  OrderStatus,
  OrderSummary,
} from './order.interfaces';

export class OrderProjection extends BaseProjection<OrderProjectionState> {
  readonly name = 'orders-summary';
  readonly eventTypes = ['OrderPlaced', 'OrderShipped', 'OrderCancelled'];

  createInitialState(): OrderProjectionState {
    return {
      orders: [],
      statistics: {
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        ordersByStatus: {
          [OrderStatus.PLACED]: 0,
          [OrderStatus.SHIPPED]: 0,
          [OrderStatus.CANCELLED]: 0,
        },
        topCustomers: [],
      },
      lastUpdated: new Date(),
    };
  }

  apply(
    state: OrderProjectionState,
    event: IExtendedDomainEvent,
  ): OrderProjectionState {
    const newState = this.whenAny(
      state,
      event,
      ['OrderPlaced', 'OrderShipped', 'OrderCancelled'],
      (currentState, evt) => {
        switch (evt.eventType) {
          case 'OrderPlaced':
            return this.handleOrderPlaced(
              currentState,
              evt.payload as OrderPlacedPayload,
            );
          case 'OrderShipped':
            return this.handleOrderShipped(
              currentState,
              evt.payload as OrderShippedPayload,
            );
          case 'OrderCancelled':
            return this.handleOrderCancelled(
              currentState,
              evt.payload as OrderCancelledPayload,
            );
          default:
            return currentState;
        }
      },
    );

    return this.updateState(newState, {
      lastUpdated: new Date(),
    });
  }

  private handleOrderPlaced(
    state: OrderProjectionState,
    payload: OrderPlacedPayload,
  ): OrderProjectionState {
    const orderSummary: OrderSummary = {
      orderId: payload.orderId,
      customerId: payload.customerId,
      customerEmail: payload.customerEmail,
      status: OrderStatus.PLACED,
      totalAmount: payload.totalAmount,
      currency: payload.currency,
      itemCount: payload.items.reduce((sum, item) => sum + item.quantity, 0),
      placedAt: payload.placedAt,
    };

    const newOrders = [...state.orders, orderSummary];
    const newStatistics = this.recalculateStatistics(newOrders);

    return this.updateState(state, {
      orders: newOrders,
      statistics: newStatistics,
    });
  }

  private handleOrderShipped(
    state: OrderProjectionState,
    payload: OrderShippedPayload,
  ): OrderProjectionState {
    return this.updateArrayState(state, 'orders', (orders) =>
      orders.map((order) =>
        order.orderId === payload.orderId
          ? {
              ...order,
              status: OrderStatus.SHIPPED,
              shippedAt: payload.shippedAt,
              trackingNumber: payload.trackingNumber,
              carrier: payload.carrier,
            }
          : order,
      ),
    );
  }

  private handleOrderCancelled(
    state: OrderProjectionState,
    payload: OrderCancelledPayload,
  ): OrderProjectionState {
    const updatedState = this.updateArrayState(state, 'orders', (orders) =>
      orders.map((order) =>
        order.orderId === payload.orderId
          ? { ...order, status: OrderStatus.CANCELLED }
          : order,
      ),
    );

    return this.updateState(updatedState, {
      statistics: this.recalculateStatistics(updatedState.orders),
    });
  }

  private recalculateStatistics(orders: OrderSummary[]) {
    const totalOrders = orders.length;
    const totalRevenue = orders
      .filter((o) => o.status !== OrderStatus.CANCELLED)
      .reduce((sum, order) => sum + order.totalAmount, 0);

    const ordersByStatus = orders.reduce(
      (acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      },
      {
        [OrderStatus.PLACED]: 0,
        [OrderStatus.SHIPPED]: 0,
        [OrderStatus.CANCELLED]: 0,
      },
    );

    const customerStats = new Map<
      string,
      { orderCount: number; totalSpent: number }
    >();
    orders
      .filter((o) => o.status !== OrderStatus.CANCELLED)
      .forEach((order) => {
        const existing = customerStats.get(order.customerId) || {
          orderCount: 0,
          totalSpent: 0,
        };
        customerStats.set(order.customerId, {
          orderCount: existing.orderCount + 1,
          totalSpent: existing.totalSpent + order.totalAmount,
        });
      });

    const topCustomers = Array.from(customerStats.entries())
      .map(([customerId, stats]) => ({ customerId, ...stats }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    return {
      totalOrders,
      totalRevenue,
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      ordersByStatus,
      topCustomers,
    };
  }
}
