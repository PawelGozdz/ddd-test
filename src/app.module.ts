import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
// import { TestRepo } from './repo';
import { OrdersModule } from './orders/orders.module';
import { CqrsModule } from '@nestjs/cqrs';

@Module({
  imports: [OrdersModule, CqrsModule.forRoot()],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
