import { IEventHandler, IIntegrationEvent } from '@/src';
import { Injectable } from '@nestjs/common';
import { Logger } from '@nestjs/common';

interface OrderPaymentProcessedPayload {
  orderId: string;
  paymentId: string;
  amount: number;
  status: 'success' | 'failed';
  processingDate: Date;
}

@Injectable()
export class OrderPaymentProcessedHandler
  implements IEventHandler<IIntegrationEvent<OrderPaymentProcessedPayload>>
{
  private readonly logger = new Logger(OrderPaymentProcessedHandler.name);

  constructor() {}

  async handle(
    event: IIntegrationEvent<OrderPaymentProcessedPayload>,
  ): Promise<void> {
    this.logger.log('Integration event', event);
  }
}
