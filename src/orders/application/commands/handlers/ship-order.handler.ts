import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { ShipOrderCommand } from '../ship-order.command';
import { OrderRepository } from '../../../infrastructure/repositories/order.repository';
import { OrderId } from '../../../domain/value-objects/order-id.vo';
import { NotFoundException } from '@nestjs/common';
import { IEnhancedEventDispatcher } from '@/src';

@CommandHandler(ShipOrderCommand)
export class ShipOrderHandler implements ICommandHandler<ShipOrderCommand> {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly eventDispatcher: IEnhancedEventDispatcher,
  ) {}

  async execute(command: ShipOrderCommand): Promise<void> {
    // Konwersja ID zamówienia
    const orderId = new OrderId(command.orderId);

    // Pobranie agregatu z repozytorium
    const order = await this.orderRepository.findById(orderId);

    if (!order) {
      throw new NotFoundException(`Order with id ${command.orderId} not found`);
    }

    // Wywołanie metody domenowej
    order.ship(
      command.trackingNumber,
      command.carrier,
      command.estimatedDelivery,
    );

    // Zapisanie zmian w agregacie
    await this.orderRepository.save(order);

    // Publikacja zdarzeń
    await this.eventDispatcher.dispatchEventsForAggregate(order);
  }
}
