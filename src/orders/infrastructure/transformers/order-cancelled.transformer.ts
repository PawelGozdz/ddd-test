import { OrderCancelledPayload } from '../../domain/events/order-cancelled.event';
import { DomainToIntegrationTransformer } from '@/src';

// Rozszerzony payload dla zdarzenia integracyjnego
export interface OrderCancelledIntegrationPayload {
  orderId: string;
  reason: string;
  cancelledAt: Date;
  refundAmount?: number;
  // Dodatkowe pola specyficzne dla integracji
  cancellationCategory: string;
  affectsInventory: boolean;
}

export class OrderCancelledTransformer extends DomainToIntegrationTransformer<
  OrderCancelledPayload,
  OrderCancelledIntegrationPayload
> {
  constructor() {
    // Definicja kontekstów źródłowego i docelowego
    super('OrderManagement', 'InventoryService');
  }

  protected transformPayload(
    domainPayload: OrderCancelledPayload,
  ): OrderCancelledIntegrationPayload {
    return {
      orderId: domainPayload.orderId,
      reason: domainPayload.reason,
      cancelledAt: domainPayload.cancelledAt,
      refundAmount: domainPayload.refundAmount,
      // Dodatkowe informacje dla kontekstu docelowego
      cancellationCategory: this.categorizeCancellationReason(
        domainPayload.reason,
      ),
      affectsInventory: this.shouldAffectInventory(domainPayload.reason),
    };
  }

  private categorizeCancellationReason(reason: string): string {
    const lowerReason = reason.toLowerCase();

    if (lowerReason.includes('customer') || lowerReason.includes('buyer')) {
      return 'CUSTOMER_INITIATED';
    } else if (
      lowerReason.includes('stock') ||
      lowerReason.includes('inventory')
    ) {
      return 'INVENTORY_ISSUE';
    } else if (
      lowerReason.includes('payment') ||
      lowerReason.includes('fund')
    ) {
      return 'PAYMENT_ISSUE';
    } else {
      return 'OTHER';
    }
  }

  private shouldAffectInventory(reason: string): boolean {
    // Określenie czy anulowanie powinno wpłynąć na zarządzanie zapasami
    const nonInventoryReasons = [
      'duplicate order',
      'test order',
      'pricing error',
    ];

    return !nonInventoryReasons.some((r) => reason.toLowerCase().includes(r));
  }

  protected getIntegrationEventType(domainEventType: string): string {
    return 'OrderCancellation';
  }

  protected getRoutingKey(domainMetadata: any): string {
    return 'orders.cancelled';
  }
}
