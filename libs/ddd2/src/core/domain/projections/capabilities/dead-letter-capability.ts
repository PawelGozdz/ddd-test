import { IExtendedDomainEvent } from '@/src/core/events';
import { ProjectionError } from '../projection-errors';
import {
  ICapabilityContext,
  IDeadLetterStore,
  IProjectionLifecycleCapability,
} from '../projection-interfaces';
import { LibUtils } from '@/src/utils';

export class DeadLetterCapability<TReadModel>
  implements IProjectionLifecycleCapability<TReadModel>
{
  private context?: ICapabilityContext<TReadModel>;

  constructor(
    private readonly deadLetterStore: IDeadLetterStore,
    private readonly shouldDeadLetter: (
      error: Error,
      attempts: number,
    ) => boolean = (error, attempts) => attempts >= 3,
  ) {}

  readonly name = 'dead-letter';

  attach(context: ICapabilityContext<TReadModel>): void {
    this.context = context;
  }

  async onError(
    error: ProjectionError,
    event?: IExtendedDomainEvent,
  ): Promise<void> {
    if (!event || !this.context) return;

    const attemptCount = this.getAttemptCount(error);

    if (this.shouldDeadLetter(error, attemptCount)) {
      await this.deadLetterStore.store({
        id: LibUtils.getUUID(),
        projectionName: this.context.getProjectionName(),
        event,
        error,
        attemptCount,
        firstFailedAt: new Date(), // Would track this properly
        lastFailedAt: new Date(),
        metadata: {
          errorType: error.constructor.name,
          errorMessage: error.message,
        },
      });
    }
  }

  private getAttemptCount(error: ProjectionError): number {
    return error.data['attemptCount'] || 1;
  }
}
