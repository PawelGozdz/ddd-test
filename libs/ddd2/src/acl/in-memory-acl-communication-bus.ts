import { Result } from '../utils';
import { IACLCommunicationBus } from './acl-communication.interfaces';
import {
  ACLContextId,
  IAntiCorruptionLayer,
  TranslationError,
} from './anti-corruption-layer.interfaces';

/**
 * In-Memory ACL Communication Bus - similar to InMemoryEventBus
 * Implementation details hidden - just like EventBus hides how events are delivered
 */
export class InMemoryACLCommunicationBus extends IACLCommunicationBus {
  private readonly aclRegistry = new Map<
    string,
    IAntiCorruptionLayer<any, any>
  >();

  /**
   * Register ACL - same pattern as eventBus.subscribe()
   */
  registerACL<TSource, TTarget>(
    contextId: string,
    acl: IAntiCorruptionLayer<TSource, TTarget>,
  ): void {
    this.aclRegistry.set(contextId, acl);
  }

  /**
   * Sync with context - same pattern as eventBus.publish()
   */
  async syncWith<TSource, TTarget>(
    contextId: string,
    sourceModel: TSource,
  ): Promise<Result<TTarget, TranslationError>> {
    const acl = this.aclRegistry.get(contextId);

    if (!acl) {
      return Result.fail(
        new TranslationError(
          `No ACL registered for context: ${contextId}`,
          sourceModel,
          ACLContextId.forBoundedContext(contextId),
          'TO_EXTERNAL',
        ),
      );
    }

    return this.executeWithMiddleware(
      contextId,
      sourceModel,
      async () => await acl.translateToExternal(sourceModel),
    );
  }

  hasACL(contextId: string): boolean {
    return this.aclRegistry.has(contextId);
  }

  getAvailableContexts(): string[] {
    return Array.from(this.aclRegistry.keys());
  }

  private async executeWithMiddleware<TSource, TTarget>(
    contextId: string,
    sourceModel: TSource,
    operation: () => Promise<Result<TTarget, TranslationError>>,
  ): Promise<Result<TTarget, TranslationError>> {
    let index = 0;

    const next = async (): Promise<Result<TTarget, TranslationError>> => {
      if (index < this.middleware.length) {
        const middleware = this.middleware[index++];
        return middleware.process(contextId, sourceModel, next);
      }
      return operation();
    };

    return next();
  }
}
