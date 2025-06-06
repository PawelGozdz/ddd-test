// src/projections/orders/order-projection.controller.ts
import {
  Controller,
  Get,
  Post,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';

import { OrderProjectionService } from './order-projection.service';
import { OrderStatisticsDto } from './dtos';

@Controller('projections/orders')
export class OrderProjectionController {
  constructor(
    private readonly orderProjectionService: OrderProjectionService,
  ) {}

  @Get()
  async getAllOrders() {
    const state = await this.orderProjectionService.getOrderSummaries();
    return {
      data: state.orders,
      metadata: {
        total: state.orders.length,
        lastUpdated: state.lastUpdated,
      },
    };
  }

  @Get('statistics')
  async getStatistics(): Promise<OrderStatisticsDto> {
    return await this.orderProjectionService.getStatistics();
  }

  @Get(':orderId')
  async getOrder(@Param('orderId') orderId: string) {
    const order = await this.orderProjectionService.getOrderById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }
    return order;
  }

  @Get('customer/:customerId')
  async getOrdersByCustomer(@Param('customerId') customerId: string) {
    const orders =
      await this.orderProjectionService.getOrdersByCustomer(customerId);
    return {
      data: orders,
      metadata: {
        customerId,
        total: orders.length,
      },
    };
  }

  @Post('reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetProjection() {
    await this.orderProjectionService.resetProjection();
  }
}
