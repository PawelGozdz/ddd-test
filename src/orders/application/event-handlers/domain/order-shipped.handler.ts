import { Injectable } from '@nestjs/common';
import { OrderShippedEvent } from '../../../domain/events/order-shipped.event';
import { Logger } from '@nestjs/common';
import { IEventHandler } from '@/src';

@Injectable()
export class OrderShippedHandler implements IEventHandler<OrderShippedEvent> {
  private readonly logger = new Logger(OrderShippedHandler.name);

  constructor() {}

  async handle(event: OrderShippedEvent): Promise<void> {
    this.logger.log(
      `Handling OrderShipped event for order ${event.payload.orderId}`,
    );

    // Przykładowa logika biznesowa
    this.logger.log(
      `Notifying customer about shipment of order ${event.payload.orderId}`,
    );

    // Aktualizacja statystyk wysyłki
    this.logger.log(
      `Updating shipping statistics for carrier ${event.payload.carrier}`,
    );

    // Przykładowe operacje asynchroniczne...
    await this.simulateAsyncOperation(
      'Updating delivery prediction models',
      150,
    );
    await this.simulateAsyncOperation('Sending shipping notifications', 100);
  }

  private async simulateAsyncOperation(
    operation: string,
    delayMs: number,
  ): Promise<void> {
    this.logger.log(`Starting operation: ${operation}`);
    return new Promise((resolve) =>
      setTimeout(() => {
        this.logger.log(`Completed operation: ${operation}`);
        resolve();
      }, delayMs),
    );
  }
}
