import { Result } from '../utils';
import {
  IAntiCorruptionLayer,
  TranslationError,
} from './anti-corruption-layer.interfaces';

/**
 * Simple ACL Communication Bus interface - similar to IEventBus
 */
export abstract class IACLCommunicationBus {
  protected readonly middleware: IACLCommunicationMiddleware[] = [];

  /**
   * Add middleware - same pattern as eventBus.use()
   */
  public use(middleware: IACLCommunicationMiddleware): IACLCommunicationBus {
    this.middleware.push(middleware);
    return this;
  }

  /**
   * Register ACL for context - similar to eventBus.subscribe()
   */
  abstract registerACL<TSource, TTarget>(
    contextId: string,
    acl: IAntiCorruptionLayer<TSource, TTarget>,
  ): void;

  /**
   * Sync with context - similar to eventBus.publish()
   */
  abstract syncWith<TSource, TTarget>(
    contextId: string,
    sourceModel: TSource,
  ): Promise<Result<TTarget, TranslationError>>;

  /**
   * Check if ACL is registered
   */
  abstract hasACL(contextId: string): boolean;

  /**
   * Get available contexts
   */
  abstract getAvailableContexts(): string[];
}

/**
 * ACL Communication middleware - similar to EventBusMiddleware
 */
export interface IACLCommunicationMiddleware {
  process<TSource, TTarget>(
    contextId: string,
    sourceModel: TSource,
    next: () => Promise<Result<TTarget, TranslationError>>,
  ): Promise<Result<TTarget, TranslationError>>;
}
