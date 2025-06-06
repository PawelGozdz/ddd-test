import { LibUtils } from '@/src/utils';
import { IExtendedDomainEvent } from '../../events';
import { ProjectionError } from './projection-errors';
import {
  ICapabilityContext,
  IProjection,
  IProjectionCapability,
  IProjectionEngine,
  IProjectionErrorStrategy,
  IProjectionLifecycleCapability,
  IProjectionRetryConfig,
  IProjectionStore,
} from './projection-interfaces';
import { ExponentialBackoffStrategy } from './error-strategy';

export class ProjectionEngine<TReadModel>
  implements IProjectionEngine<TReadModel>
{
  private capabilities = new Map<string, IProjectionCapability<TReadModel>>();
  protected projection: IProjection<TReadModel>;
  protected store: IProjectionStore<TReadModel>;

  constructor(
    projection: IProjection<TReadModel>,
    store: IProjectionStore<TReadModel>,
  ) {
    this.projection = projection;
    this.store = store;
  }

  getProjectionName(): string {
    return this.projection.name;
  }

  isInterestedIn(event: IExtendedDomainEvent): boolean {
    return this.projection.handles(event.eventType);
  }

  async processEvent(event: IExtendedDomainEvent): Promise<void> {
    if (!this.isInterestedIn(event)) return;

    try {
      const currentState = await this.getState();
      if (!currentState) {
        throw ProjectionError.stateNotFound(this.projection.name);
      }

      // Before hooks
      await this.executeHooks('onBeforeApply', currentState, event);

      // Apply event
      const newState = await Promise.resolve(
        this.projection.apply(currentState, event),
      );

      // Save state
      await this.store.save(this.projection.name, newState);

      // After hooks
      await this.executeHooks('onAfterApply', newState, event);
    } catch (error) {
      const projectionError =
        error instanceof ProjectionError
          ? error
          : ProjectionError.processingFailed(
              this.projection.name,
              event.eventType,
              error as Error,
            );

      await this.executeHooks('onError', projectionError, event);
      throw projectionError;
    }
  }

  async getState(): Promise<TReadModel | null> {
    let state = await this.store.load(this.projection.name);

    if (!state) {
      state = await this.projection.createInitialState();
      await this.store.save(this.projection.name, state);
    }

    return state;
  }

  async reset(): Promise<void> {
    const initialState = await this.projection.createInitialState();
    await this.store.save(this.projection.name, initialState);
  }

  async rebuild(events: AsyncIterable<IExtendedDomainEvent>): Promise<void> {
    await this.reset();

    for await (const event of events) {
      if (this.isInterestedIn(event)) {
        await this.processEvent(event);
      }
    }
  }

  addCapability<T extends IProjectionCapability<TReadModel>>(
    capability: T,
  ): this {
    const context: ICapabilityContext<TReadModel> = {
      getProjectionName: () => this.projection.name,
      getStore: () => this.store,
      executeHooks: (hookName, ...args) => this.executeHooks(hookName, ...args),
    };

    capability.attach(context);
    this.capabilities.set(capability.name, capability);
    return this;
  }

  protected async executeHooks(
    hookName: string,
    ...args: any[]
  ): Promise<void> {
    const capabilities = Array.from(this.capabilities.values());

    // Execute hooks sequentially for critical operations
    if (hookName === 'onBeforeApply' || hookName === 'onError') {
      for (const capability of capabilities) {
        const lifecycleCapability =
          capability as IProjectionLifecycleCapability<TReadModel>;
        const hook = (lifecycleCapability as any)[hookName];

        if (typeof hook === 'function') {
          await Promise.resolve(hook.apply(lifecycleCapability, args));
        }
      }
      return;
    }

    // For non-critical hooks, execute in parallel
    const promises: Promise<void>[] = [];
    for (const capability of capabilities) {
      const lifecycleCapability =
        capability as IProjectionLifecycleCapability<TReadModel>;
      const hook = (lifecycleCapability as any)[hookName];

      if (typeof hook === 'function') {
        const result = hook.apply(lifecycleCapability, args);
        if (result instanceof Promise) {
          promises.push(result);
        }
      }
    }

    if (promises.length > 0) {
      await Promise.all(promises);
    }
  }
}

export class EnhancedProjectionEngine<
  TReadModel,
> extends ProjectionEngine<TReadModel> {
  constructor(
    projection: IProjection<TReadModel>,
    store: IProjectionStore<TReadModel>,
    private readonly retryConfig: IProjectionRetryConfig,
    private readonly errorStrategy: IProjectionErrorStrategy = new ExponentialBackoffStrategy(),
  ) {
    super(projection, store);
  }

  async processEvent(event: IExtendedDomainEvent): Promise<void> {
    if (!this.isInterestedIn(event)) return;

    let attempt = 0;
    let lastError: Error;

    while (attempt < this.retryConfig.maxAttempts) {
      attempt++;

      try {
        await this.executeHooks('onBeforeApply', await this.getState(), event);

        const currentState = await this.getState();
        if (!currentState) {
          throw ProjectionError.stateNotFound(this.projection.name);
        }

        const newState = await Promise.resolve(
          this.projection.apply(currentState, event),
        );

        await this.store.save(this.projection.name, newState);
        await this.executeHooks('onAfterApply', newState, event);

        return; // Success!
      } catch (error) {
        lastError = error as Error;

        const projectionError =
          error instanceof ProjectionError
            ? error
            : ProjectionError.processingFailed(
                this.projection.name,
                event.eventType,
                error as Error,
              );

        // Add attempt count to error data
        projectionError.data = {
          ...(projectionError.data as Record<string, any>),
          attemptCount: attempt,
        };

        // Check if should retry
        if (
          !this.errorStrategy.shouldRetry(
            projectionError,
            attempt,
            this.retryConfig,
          )
        ) {
          await this.executeHooks('onError', projectionError, event);
          throw projectionError;
        }

        // Wait before retry
        if (attempt < this.retryConfig.maxAttempts) {
          const delay = this.errorStrategy.getRetryDelay(
            attempt,
            this.retryConfig,
          );
          await LibUtils.sleep(delay);
        }
      }
    }

    // Max attempts exceeded
    const finalError =
      lastError instanceof ProjectionError
        ? lastError
        : ProjectionError.processingFailed(
            this.projection.name,
            event.eventType,
            lastError,
          );

    await this.executeHooks('onError', finalError, event);
    throw finalError;
  }
}
