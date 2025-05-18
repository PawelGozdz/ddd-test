// import { EventHandler } from './ddd/handler.decorator';
import { DomainEvent, EventHandler } from '@app/libs';
export class TestEvent extends DomainEvent {}

@EventHandler(TestEvent)
export class AppService {
  async handle(event: any): Promise<string> {
    return 'Hello World!';
  }
}
