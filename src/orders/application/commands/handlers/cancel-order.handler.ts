import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import { CancelOrderCommand } from '../cancel-order.command';
import { OrderRepository } from '../../../infrastructure/repositories/order.repository';
import { OrderId } from '../../../domain/value-objects/order-id.vo';
import { IEnhancedEventDispatcher } from '@/src';

@CommandHandler(CancelOrderCommand)
export class CancelOrderHandler implements ICommandHandler<CancelOrderCommand> {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly eventDispatcher: IEnhancedEventDispatcher,
  ) {}

  async execute(command: CancelOrderCommand): Promise<void> {
    // Konwersja ID zamówienia
    const orderId = new OrderId(command.orderId);

    // Pobranie agregatu z repozytorium
    const order = await this.orderRepository.findById(orderId);

    if (!order) {
      throw new NotFoundException(`Order with id ${command.orderId} not found`);
    }

    // Wywołanie metody domenowej
    order.cancel(command.reason);

    // Zapisanie zmian w agregacie
    await this.orderRepository.save(order);

    // Publikacja zdarzeń
    await this.eventDispatcher.dispatchEventsForAggregate(order);
  }
}
