import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
// import { TestRepo } from './repo';
import { CqrsModule } from '@nestjs/cqrs';
import { OrderProjectionModule } from './order2/order-projection.module';

@Module({
  imports: [CqrsModule.forRoot(), OrderProjectionModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
