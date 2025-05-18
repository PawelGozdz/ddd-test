import { OrderPlacedPayload } from '../../domain/events/order-placed.event';
import { DomainToIntegrationTransformer } from '@/src';

// Rozszerzony payload dla zdarzenia integracyjnego
export interface OrderPlacedIntegrationPayload {
  orderId: string;
  customerId: string;
  totalAmount: number;
  itemCount: number;
  placedAt: Date;
  // Dodatkowe pola specyficzne dla integracji
  currencyCode: string;
  orderSource: string;
}

export class OrderPlacedTransformer extends DomainToIntegrationTransformer<
  OrderPlacedPayload,
  OrderPlacedIntegrationPayload
> {
  constructor() {
    // Definicja kontekstów źródłowego i docelowego
    super('OrderManagement', 'ShippingService');
  }

  protected transformPayload(
    domainPayload: OrderPlacedPayload,
  ): OrderPlacedIntegrationPayload {
    return {
      orderId: domainPayload.orderId,
      customerId: domainPayload.customerId,
      totalAmount: domainPayload.totalAmount,
      itemCount: domainPayload.items.length,
      placedAt: domainPayload.placedAt,
      currencyCode: 'USD', // Przykładowa wartość
      orderSource: 'web', // Przykładowa wartość
    };
  }

  protected getIntegrationEventType(domainEventType: string): string {
    // Możemy zmienić nazwę zdarzenia integracyjnego
    return 'OrderSubmitted';
  }

  // Możemy nadpisać metodę routingu
  protected getRoutingKey(domainMetadata: any): string {
    return 'orders.new';
  }
}
