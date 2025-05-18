import {
  Controller,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { PlaceOrderCommand } from './application/commands/place-order.command';
import { ShipOrderCommand } from './application/commands/ship-order.command';
import { CancelOrderCommand } from './application/commands/cancel-order.command';

// Commands

// DTOs
class PlaceOrderDto {
  customerId: string;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
}

class ShipOrderDto {
  trackingNumber: string;
  carrier: string;
  estimatedDelivery: Date;
}

class CancelOrderDto {
  reason: string;
}

@Controller('orders')
export class OrdersController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createOrder(@Body() dto: PlaceOrderDto): Promise<{ orderId: string }> {
    // Walidacja danych
    if (!dto.customerId || !dto.items || dto.items.length === 0) {
      throw new Error('Invalid order data');
    }

    // Generowanie unikalnego ID dla zamówienia (w prawdziwej implementacji
    // to zostałoby zrobione przez domain service lub aggregate factory)
    const orderId = crypto.randomUUID();

    // Przekazanie komendy do Command Bus
    await this.commandBus.execute(
      new PlaceOrderCommand(dto.customerId, dto.items),
    );

    return { orderId };
  }

  @Post(':id/ship')
  @HttpCode(HttpStatus.OK)
  async shipOrder(
    @Param('id') orderId: string,
    @Body() dto: ShipOrderDto,
  ): Promise<void> {
    // Walidacja danych
    if (!dto.trackingNumber || !dto.carrier) {
      throw new Error('Tracking number and carrier are required');
    }

    // Przekazanie komendy do Command Bus
    await this.commandBus.execute(
      new ShipOrderCommand(
        orderId,
        dto.trackingNumber,
        dto.carrier,
        dto.estimatedDelivery || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // domyślnie 7 dni
      ),
    );
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelOrder(
    @Param('id') orderId: string,
    @Body() dto: CancelOrderDto,
  ): Promise<void> {
    // Walidacja danych
    if (!dto.reason) {
      throw new Error('Cancellation reason is required');
    }

    // Przekazanie komendy do Command Bus
    await this.commandBus.execute(new CancelOrderCommand(orderId, dto.reason));
  }
}
