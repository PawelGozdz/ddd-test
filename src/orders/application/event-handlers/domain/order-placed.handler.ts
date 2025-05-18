import { Injectable } from '@nestjs/common';
import { OrderPlacedEvent } from '../../../domain/events/order-placed.event';
import { Logger } from '@nestjs/common';
import { IEventHandler } from '@/src';

@Injectable()
export class OrderPlacedHandler implements IEventHandler<OrderPlacedEvent> {
  private readonly logger = new Logger(OrderPlacedHandler.name);

  constructor() {}

  async handle(event: OrderPlacedEvent): Promise<void> {
    this.logger.log(
      `*****Handling OrderPlaced event for order ${event.payload.orderId}`,
    );
  }
}
