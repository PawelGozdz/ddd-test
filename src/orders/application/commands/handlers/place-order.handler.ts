import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IEnhancedEventDispatcher } from '@/src';
import { OrderRepository } from 'src/orders/infrastructure/repositories/order.repository';
import { OrderId } from 'src/orders/domain/value-objects/order-id.vo';
import { ProductItem } from 'src/orders/domain/value-objects/product-item.vo';
import { Order } from 'src/orders/domain/aggregates/order.aggregate';
import { PlaceOrderCommand } from '../place-order.command';

@CommandHandler(PlaceOrderCommand)
export class PlaceOrderHandler implements ICommandHandler<PlaceOrderCommand> {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly eventDispatcher: IEnhancedEventDispatcher,
  ) {}

  async execute(command: PlaceOrderCommand): Promise<void> {
    // Tworzenie nowego zamówienia
    const orderId = new OrderId();

    // Konwersja elementów zamówienia na obiekty wartości
    const items = command.items.map(
      (item) => new ProductItem(item.productId, item.quantity, item.price),
    );

    // Tworzenie agregatu
    const order = Order.create(orderId, command.customerId, items);

    // Zapis agregatu
    await this.orderRepository.save(order);

    // Publikacja zdarzeń domenowych + transformacja do zdarzeń integracyjnych
    await this.eventDispatcher.dispatchEventsForAggregate(order);
  }
}
