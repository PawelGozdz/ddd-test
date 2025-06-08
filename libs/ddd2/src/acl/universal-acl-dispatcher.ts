import { Result } from '../utils';
import {
  IACLCommunicationBus,
  IACLCommunicationMiddleware,
} from './acl-communication.interfaces';
import {
  ACLContextId,
  TranslationError,
} from './anti-corruption-layer.interfaces';
import { InMemoryACLCommunicationBus } from './in-memory-acl-communication-bus';

/**
 * Universal ACL Dispatcher - same pattern as UniversalEventDispatcher
 * Simple interface hiding multiple buses
 */
export class UniversalACLDispatcher {
  private readonly aclBuses = new Map<string, IACLCommunicationBus>();
  private readonly middleware: IACLCommunicationMiddleware[] = [];

  /**
   * Register ACL bus - same pattern as registerEventBus()
   */
  registerACLBus(
    busId: string,
    bus: IACLCommunicationBus,
  ): UniversalACLDispatcher {
    this.aclBuses.set(busId, bus);

    // Apply global middleware to new bus
    if (bus instanceof IACLCommunicationBus) {
      this.middleware.forEach((middleware) => bus.use(middleware));
    }

    return this;
  }

  /**
   * Sync with context - automatically finds the right bus (implementation detail)
   * Same simple API as eventBus.publish()
   */
  async syncWith<TSource, TTarget>(
    contextId: string,
    sourceModel: TSource,
  ): Promise<Result<TTarget, TranslationError>> {
    // Try each bus until one can handle the context
    for (const [busId, bus] of this.aclBuses) {
      if (bus.hasACL(contextId)) {
        return bus.syncWith<TSource, TTarget>(contextId, sourceModel);
      }
    }

    return Result.fail(
      new TranslationError(
        `No ACL found for context: ${contextId}`,
        sourceModel,
        ACLContextId.forBoundedContext(contextId),
        'TO_EXTERNAL',
      ),
    );
  }

  /**
   * Add global middleware - same pattern as eventBus middleware
   */
  use(middleware: IACLCommunicationMiddleware): UniversalACLDispatcher {
    this.middleware.push(middleware);

    // Apply to existing buses
    this.aclBuses.forEach((bus) => {
      if (bus instanceof InMemoryACLCommunicationBus) {
        bus.use(middleware);
      }
    });

    return this;
  }

  /**
   * Get all available contexts across buses
   */
  getAllAvailableContexts(): string[] {
    const allContexts = new Set<string>();

    this.aclBuses.forEach((bus) => {
      bus.getAvailableContexts().forEach((context) => allContexts.add(context));
    });

    return Array.from(allContexts);
  }
}
