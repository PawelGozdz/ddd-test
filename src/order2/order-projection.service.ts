import { IProjectionEngine } from '@/src';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OrderProjectionState } from './order.interfaces';

@Injectable()
export class OrderProjectionService implements OnModuleInit {
  private readonly logger = new Logger(OrderProjectionService.name);

  constructor(
    private readonly projectionEngine: IProjectionEngine<OrderProjectionState>,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing Order Projection Service');
    await this.projectionEngine.getState(); // Initialize state if needed
  }

  async getOrderSummaries(): Promise<OrderProjectionState> {
    const state = await this.projectionEngine.getState();
    if (!state) {
      throw new Error('Order projection state not found');
    }
    return state;
  }

  async getOrderById(orderId: string) {
    const state = await this.getOrderSummaries();
    return state.orders.find((order) => order.orderId === orderId);
  }

  async getOrdersByCustomer(customerId: string) {
    const state = await this.getOrderSummaries();
    return state.orders.filter((order) => order.customerId === customerId);
  }

  async getStatistics() {
    const state = await this.getOrderSummaries();
    return state.statistics;
  }

  async resetProjection(): Promise<void> {
    this.logger.warn('Resetting order projection');
    await this.projectionEngine.reset();
  }

  async rebuildProjection(events: any[]): Promise<void> {
    this.logger.log(`Rebuilding projection from ${events.length} events`);

    async function* eventGenerator() {
      for (const event of events) {
        yield event;
      }
    }

    await this.projectionEngine.rebuild(eventGenerator());
    this.logger.log('Projection rebuild completed');
  }
}
