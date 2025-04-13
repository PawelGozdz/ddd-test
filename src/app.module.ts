import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DddModule } from './ddd/ddd.module';
import { TestRepo } from './repo';

@Module({
  imports: [DddModule.forRoot({})],
  controllers: [AppController],
  providers: [AppService, TestRepo],
})
export class AppModule {}
