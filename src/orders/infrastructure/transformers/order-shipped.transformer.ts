import { OrderShippedPayload } from '../../domain/events/order-shipped.event';
import { DomainToIntegrationTransformer } from '@/src';

// Rozszerzony payload dla zdarzenia integracyjnego
export interface OrderShippedIntegrationPayload {
  orderId: string;
  trackingNumber: string;
  carrier: string;
  shippedAt: Date;
  estimatedDelivery: Date;
  // Dodatkowe pola specyficzne dla integracji
  trackingUrl: string;
  warehouseId: string;
}

export class OrderShippedTransformer extends DomainToIntegrationTransformer<
  OrderShippedPayload,
  OrderShippedIntegrationPayload
> {
  constructor() {
    // Definicja kontekstów źródłowego i docelowego
    super('OrderManagement', 'CustomerNotificationService');
  }

  protected transformPayload(
    domainPayload: OrderShippedPayload,
  ): OrderShippedIntegrationPayload {
    return {
      orderId: domainPayload.orderId,
      trackingNumber: domainPayload.trackingNumber,
      carrier: domainPayload.carrier,
      shippedAt: domainPayload.shippedAt,
      estimatedDelivery: domainPayload.estimatedDelivery,
      trackingUrl: this.generateTrackingUrl(
        domainPayload.carrier,
        domainPayload.trackingNumber,
      ),
      warehouseId: 'WH-001', // Przykładowa wartość
    };
  }

  private generateTrackingUrl(carrier: string, trackingNumber: string): string {
    // Logika generowania URL śledzenia w zależności od przewoźnika
    switch (carrier.toLowerCase()) {
      case 'ups':
        return `https://www.ups.com/track?tracknum=${trackingNumber}`;
      case 'fedex':
        return `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`;
      default:
        return `https://trackorder.example.com?carrier=${carrier}&number=${trackingNumber}`;
    }
  }

  protected getIntegrationEventType(domainEventType: string): string {
    return 'OrderShipmentNotification';
  }

  protected getRoutingKey(domainMetadata: any): string {
    return 'orders.shipped';
  }
}
