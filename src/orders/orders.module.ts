import { Module } from '@nestjs/common';

// Import handlerów
import { OrderPlacedHandler } from './application/event-handlers/domain/order-placed.handler';
import { OrderShippedHandler } from './application/event-handlers/domain/order-shipped.handler';
import { OrderCancelledHandler } from './application/event-handlers/domain/order-cancelled.handler';
import { OrderPaymentProcessedHandler } from './application/event-handlers/integration/order-payment-processed.handler';

// Import transformerów
import { OrderPlacedTransformer } from './infrastructure/transformers/order-placed.transformer';
import { OrderShippedTransformer } from './infrastructure/transformers/order-shipped.transformer';
import { OrderCancelledTransformer } from './infrastructure/transformers/order-cancelled.transformer';

// Import własnej implementacji integration event bus

import { OrderRepository } from './infrastructure/repositories/order.repository';

// Import command handlers
import { PlaceOrderHandler } from './application/commands/handlers/place-order.handler';
import { ShipOrderHandler } from './application/commands/handlers/ship-order.handler';
import { CancelOrderHandler } from './application/commands/handlers/cancel-order.handler';
import {
  IEnhancedEventDispatcher,
  IEventPersistenceHandler,
  IIntegrationEvent,
  InMemoryDomainEventBus,
  InMemoryIntegrationEventBus,
  IntegrationEventProcessor,
  IntegrationEventTransformerRegistry,
  UniversalEventDispatcher,
} from '@/src';

import { OrdersController } from './orders.controller';
import { OrderEventHandler } from './infrastructure/repositories/order-persistence-handler';

@Module({
  controllers: [OrdersController],
  providers: [
    // Domain event handlers
    OrderPlacedHandler,
    OrderShippedHandler,
    OrderCancelledHandler,

    // Integration event handlers
    OrderPaymentProcessedHandler,

    // Transformers
    OrderPlacedTransformer,
    OrderShippedTransformer,
    OrderCancelledTransformer,

    // Command handlers
    PlaceOrderHandler,
    ShipOrderHandler,
    CancelOrderHandler,

    // Repository
    OrderRepository,
    OrderEventHandler,
    {
      provide: IEventPersistenceHandler,
      useClass: OrderEventHandler,
    },
    {
      provide: IntegrationEventTransformerRegistry,
      useFactory: (
        orderPlacedTransformer: OrderPlacedTransformer,
        orderShippedTransformer: OrderShippedTransformer,
        orderCancelledTransformer: OrderCancelledTransformer,
      ) => {
        const registry = new IntegrationEventTransformerRegistry();

        // Rejestracja transformerów
        registry.register('OrderPlaced', orderPlacedTransformer);
        registry.register('OrderShipped', orderShippedTransformer);
        registry.register('OrderCancelled', orderCancelledTransformer);

        return registry;
      },
      inject: [
        OrderPlacedTransformer,
        OrderShippedTransformer,
        OrderCancelledTransformer,
      ],
    },

    {
      provide: IEnhancedEventDispatcher,
      useFactory: (
        transformerRegistry: IntegrationEventTransformerRegistry,
      ) => {
        const dispatcher = new UniversalEventDispatcher()
          // .registerEventBus(
          //   'domain',
          //   new InMemoryDomainEventBus({
          //     enableLogging: true,
          //   }),
          // )
          .registerEventBus(
            'integration',
            new InMemoryIntegrationEventBus({
              enableLogging: true,
            }),
          )
          .registerProcessor(
            new IntegrationEventProcessor(transformerRegistry),
          );
        // .use(loggingMiddleware)
        // .use(correlationMiddleware);

        return dispatcher;
      },
      inject: [IntegrationEventTransformerRegistry],
    },
  ],
  exports: [IEnhancedEventDispatcher],
})
export class OrdersModule {
  constructor(
    private readonly dispatcher: IEnhancedEventDispatcher,
    private readonly orderPlacedHandler: OrderPlacedHandler,
    private readonly orderShippedHandler: OrderShippedHandler,
    private readonly orderCancelledHandler: OrderCancelledHandler,
    private readonly orderPaymentProcessedHandler: OrderPaymentProcessedHandler,
  ) {
    const domainEventBus = this.dispatcher.getRegistry().get('domain');
    const integrationEventBus = this.dispatcher
      .getRegistry()
      .get('integration');

    // Rejestracja handlerów zdarzeń domenowych
    domainEventBus?.registerHandler('OrderPlaced', this.orderPlacedHandler);
    domainEventBus?.registerHandler('OrderShipped', this.orderShippedHandler);
    domainEventBus?.registerHandler(
      'OrderCancelled',
      this.orderCancelledHandler,
    );

    // Rejestracja handlerów zdarzeń integracyjnych
    (integrationEventBus as InMemoryIntegrationEventBus)?.subscribe(
      'OrderSubmitted',
      (event: IIntegrationEvent) =>
        this.orderPaymentProcessedHandler.handle(event),
      'users-service',
    );
  }
}
