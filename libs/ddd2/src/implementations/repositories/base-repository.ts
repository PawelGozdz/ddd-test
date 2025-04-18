import { IEventDispatcher, AggregateRoot } from '../../core';

export abstract class BaseRepository{
  constructor(protected readonly eventDispatcher: IEventDispatcher) {}

  async save(aggregate: AggregateRoot): Promise<void> {
    
    const events = aggregate.getDomainEvents();
    
    for (const event of events) {

    const currentVersion = await this.getCurrentVersion(aggregate.getId()) ?? 0;
    if (aggregate.getVersion() - currentVersion !== 1 ) {
      throw new Error(`Version mismatch: expected ${currentVersion}, got ${aggregate.getVersion() - aggregate.getDomainEvents().length}`);
    }

    const handlerName = `handle${event.eventType}`;
    const handler = (this as any)[handlerName];

    if (typeof handler !== 'function') {
      throw new Error(`Missing handler ${handlerName} in repository ${this.constructor.name}`);
    }

    await handler.call(this, event.payload);
  }
  
  await this.eventDispatcher.dispatchEventsForAggregate(aggregate);
  }
  
  abstract getCurrentVersion(id: any): Promise<number>;
}