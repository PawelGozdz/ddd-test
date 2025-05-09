import { IEventDispatcher, AggregateRoot } from '..';
import { VersionError } from '../domain/domain.errors';

export abstract class IBaseRepository {
  constructor(protected readonly eventDispatcher: IEventDispatcher) {}

  async save(aggregate: AggregateRoot): Promise<void> {
    const events = aggregate.getDomainEvents();

    if (events.length === 0) return;

    const currentVersion =
      (await this.getCurrentVersion(aggregate.getId())) ?? 0;
    const initialVersion = aggregate.getInitialVersion();

    if (initialVersion !== currentVersion) {
      throw VersionError.withEntityIdAndVersions(
        aggregate.getId(),
        currentVersion,
        initialVersion,
      );
    }

    for (let i = 0; i < events.length; i++) {
      const handlerName = `handle${events[i].eventType}`;
      const handler = (this as any)[handlerName];

      if (typeof handler !== 'function') {
        throw new Error(
          `Missing handler ${handlerName} in repository ${this.constructor.name}`,
        );
      }

      await handler.call(this, events[i].payload);
    }

    await this.eventDispatcher.dispatchEventsForAggregate(aggregate);
  }

  abstract getCurrentVersion(id: any): Promise<number>;
}
