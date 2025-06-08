import { EntityId, IDomainError, IdType } from '../core';
import { Result } from '../utils';

/**
 * Core interface for Anti-Corruption Layer
 * Provides pure translation between domain and external models
 */
export interface IAntiCorruptionLayer<TDomainModel, TExternalModel> {
  /**
   * Translate domain model to external system format
   */
  translateToExternal(
    domainModel: TDomainModel,
  ): Result<TExternalModel, TranslationError>;

  /**
   * Translate external system model to domain format
   */
  translateFromExternal(
    externalModel: TExternalModel,
  ): Result<TDomainModel, TranslationError>;

  /**
   * Get ACL context identifier
   */
  getContextId(): ACLContextId;

  /**
   * Get supported external system info
   */
  getExternalSystemInfo(): ExternalSystemInfo;
}

/**
 * ACL Context identifier using DomainTS EntityId
 */
export class ACLContextId extends EntityId<string> {
  private constructor(value: string, type: IdType = 'uuid') {
    super(value, type);
  }

  /**
   * Create ACL context for bounded context
   */
  static forBoundedContext(contextName: string): ACLContextId {
    return new ACLContextId(contextName);
  }

  /**
   * Create ACL context for external system integration
   */
  static forExternalSystem(
    boundedContext: string,
    externalSystem: string,
  ): ACLContextId {
    return new ACLContextId(`${boundedContext}-${externalSystem}`);
  }

  /**
   * Parse context parts
   */
  getContextParts(): { boundedContext: string; externalSystem?: string } {
    const parts = this.value.split('-');
    return {
      boundedContext: parts[0],
      externalSystem: parts.length > 1 ? parts.slice(1).join('-') : undefined,
    };
  }
}

/**
 * External system metadata
 */
export interface ExternalSystemInfo {
  readonly systemName: string;
  readonly version: string;
  readonly description?: string;
  readonly supportedOperations: string[];
}

/**
 * Translation error for ACL operations
 */
export class TranslationError extends IDomainError {
  constructor(
    message: string,
    public readonly sourceModel: unknown,
    public readonly contextId: ACLContextId,
    public readonly translationDirection: 'TO_EXTERNAL' | 'FROM_EXTERNAL',
    error?: Error,
  ) {
    super(message, { error, contextId: contextId.value });
  }

  static forToExternal(
    message: string,
    domainModel: unknown,
    contextId: ACLContextId,
    error?: Error,
  ): TranslationError {
    return new TranslationError(
      message,
      domainModel,
      contextId,
      'TO_EXTERNAL',
      error,
    );
  }

  static forFromExternal(
    message: string,
    externalModel: unknown,
    contextId: ACLContextId,
    error?: Error,
  ): TranslationError {
    return new TranslationError(
      message,
      externalModel,
      contextId,
      'FROM_EXTERNAL',
      error,
    );
  }
}

/**
 * Translation options for advanced scenarios
 */
export interface TranslationOptions {
  /**
   * Skip validation during translation
   */
  skipValidation?: boolean;

  /**
   * Additional context data for translation
   */
  contextData?: Record<string, unknown>;

  /**
   * Transformation strategy hint
   */
  strategy?: 'STRICT' | 'PERMISSIVE' | 'BEST_EFFORT';
}

/**
 * Bulk translation interface for performance optimization
 */
export interface IBulkAntiCorruptionLayer<TDomainModel, TExternalModel>
  extends IAntiCorruptionLayer<TDomainModel, TExternalModel> {
  /**
   * Translate multiple domain models to external format
   */
  translateManyToExternal(
    domainModels: TDomainModel[],
    options?: TranslationOptions,
  ): Promise<Result<TExternalModel[], TranslationError>>;

  /**
   * Translate multiple external models to domain format
   */
  translateManyFromExternal(
    externalModels: TExternalModel[],
    options?: TranslationOptions,
  ): Promise<Result<TDomainModel[], TranslationError>>;
}

/**
 * Translation rule specification interface
 */
export interface ITranslationRule<TSource, TTarget> {
  /**
   * Rule identifier
   */
  readonly ruleId: string;

  /**
   * Apply rule to source model
   */
  apply(source: TSource): Result<Partial<TTarget>, TranslationError>;

  /**
   * Check if rule applies to source model
   */
  appliesTo(source: TSource): boolean;

  /**
   * Rule priority (higher = applied first)
   */
  readonly priority: number;
}

/**
 * Translation context for rule application
 */
export interface ITranslationContext {
  readonly contextId: ACLContextId;
  readonly timestamp: Date;
  readonly direction: 'TO_EXTERNAL' | 'FROM_EXTERNAL';
  readonly options?: TranslationOptions;
}
