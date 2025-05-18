import { Injectable } from '@nestjs/common';
import { OrderCancelledEvent } from '../../../domain/events/order-cancelled.event';
import { Logger } from '@nestjs/common';
import { IEventHandler } from '@/src';

@Injectable()
export class OrderCancelledHandler
  implements IEventHandler<OrderCancelledEvent>
{
  private readonly logger = new Logger(OrderCancelledHandler.name);

  constructor() {}

  async handle(event: OrderCancelledEvent): Promise<void> {
    this.logger.log(
      `Handling OrderCancelled event for order ${event.payload.orderId}`,
    );

    // Przykładowa logika biznesowa
    this.logger.log(
      `Processing cancellation for order ${event.payload.orderId}`,
    );

    // Jeśli zamówienie było opłacone, należy zainicjować zwrot pieniędzy
    if (event.payload.refundAmount) {
      this.logger.log(
        `Initiating refund of ${event.payload.refundAmount} for order ${event.payload.orderId}`,
      );
      await this.simulateAsyncOperation('Processing refund', 200);
    }

    // Aktualizacja statystyk anulowanych zamówień
    this.logger.log(
      `Updating cancellation statistics, reason: ${event.payload.reason}`,
    );

    // Dodatkowe operacje asynchroniczne
    await this.simulateAsyncOperation('Restoring inventory', 150);
    await this.simulateAsyncOperation(
      'Sending cancellation notifications',
      100,
    );
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
