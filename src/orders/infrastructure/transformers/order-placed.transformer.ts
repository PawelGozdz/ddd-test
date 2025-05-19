import { ContextRouter } from '@/src/core/events/integration/context-router';
import { OrderPlacedPayload } from '../../domain/events/order-placed.event';
import {
  CompositeSpecification,
  DomainToIntegrationTransformer,
  IExtendedDomainEvent,
  ISpecification,
} from '@/src';

class ValueSpecification<T>
  extends CompositeSpecification<T>
  implements ISpecification<T>
{
  constructor(
    private readonly path: string,
    private readonly predicate: (value: any) => boolean,
  ) {
    super();
  }

  isSatisfiedBy(candidate: T): boolean {
    const value = this.getValueByPath(candidate, this.path);
    return this.predicate(value);
  }

  private getValueByPath(obj: any, path: string): any {
    return path.split('.').reduce((prev, curr) => {
      return prev && prev[curr] !== undefined ? prev[curr] : undefined;
    }, obj);
  }
}

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
    const highValueOrderSpec = new ValueSpecification<IExtendedDomainEvent>(
      'payload.totalAmount',
      (value) => value > 10,
    );
    const orderAggregateSpec = new ValueSpecification<IExtendedDomainEvent>(
      'metadata.aggregateType',
      (value) => value === 'Order',
    );

    super(
      'OrderManagement',
      new ContextRouter().sendEventsMatchingSpecificationTo(
        highValueOrderSpec.and(orderAggregateSpec),
        'invoice-service',
        'analytics-service',
        'users-service',
      ),
    );
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
