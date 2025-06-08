import { Result } from '../utils';
import { BusinessRuleValidator, CompositeSpecification } from '../validations';
import {
  ACLContextId,
  ExternalSystemInfo,
  IBulkAntiCorruptionLayer,
  ITranslationContext,
  ITranslationRule,
  TranslationError,
  TranslationOptions,
} from './anti-corruption-layer.interfaces';

/**
 * Base Anti-Corruption Layer with DomainTS integration
 * Provides translation between domain and external models using business rules and specifications
 */
export abstract class BaseAntiCorruptionLayer<TDomainModel, TExternalModel>
  implements IBulkAntiCorruptionLayer<TDomainModel, TExternalModel>
{
  private readonly toExternalRules: ITranslationRule<
    TDomainModel,
    TExternalModel
  >[] = [];
  private readonly fromExternalRules: ITranslationRule<
    TExternalModel,
    TDomainModel
  >[] = [];

  constructor(
    protected readonly contextId: ACLContextId,
    protected readonly externalSystemInfo: ExternalSystemInfo,
  ) {}

  /**
   * Translate domain model to external format
   */
  translateToExternal(
    domainModel: TDomainModel,
    options?: TranslationOptions,
  ): Result<TExternalModel, TranslationError> {
    const context = this.createTranslationContext('TO_EXTERNAL', options);

    try {
      // 1. Validate domain model
      if (!options?.skipValidation) {
        const validationResult = this.validateDomainModel(domainModel);
        if (validationResult.isFailure) {
          return Result.fail(
            TranslationError.forToExternal(
              `Domain validation failed: ${validationResult.error.message}`,
              domainModel,
              this.contextId,
              validationResult.error,
            ),
          );
        }
      }

      // 2. Apply domain model specifications
      const specificationResult = this.checkDomainSpecifications(domainModel);
      if (specificationResult.isFailure) {
        return Result.fail(
          TranslationError.forToExternal(
            `Domain specifications not satisfied: ${specificationResult.error.message}`,
            domainModel,
            this.contextId,
            specificationResult.error,
          ),
        );
      }

      // 3. Apply core translation
      const translationResult = this.mapToExternal(domainModel, context);
      if (translationResult.isFailure) {
        return translationResult;
      }

      // 4. Apply translation rules
      const rulesResult = this.applyToExternalRules(
        domainModel,
        translationResult.value,
      );
      if (rulesResult.isFailure) {
        return rulesResult;
      }

      // 5. Validate external model
      if (!options?.skipValidation) {
        const externalValidationResult = this.validateExternalModel(
          rulesResult.value,
        );
        if (externalValidationResult.isFailure) {
          return Result.fail(
            TranslationError.forToExternal(
              `External validation failed: ${externalValidationResult.error.message}`,
              domainModel,
              this.contextId,
              externalValidationResult.error,
            ),
          );
        }
      }

      return Result.ok(rulesResult.value);
    } catch (error) {
      return Result.fail(
        TranslationError.forToExternal(
          'Unexpected error during translation to external',
          domainModel,
          this.contextId,
          error as Error,
        ),
      );
    }
  }

  /**
   * Translate external model to domain format
   */
  translateFromExternal(
    externalModel: TExternalModel,
    options?: TranslationOptions,
  ): Result<TDomainModel, TranslationError> {
    const context = this.createTranslationContext('FROM_EXTERNAL', options);

    try {
      // 1. Validate external model
      if (!options?.skipValidation) {
        const validationResult = this.validateExternalModel(externalModel);
        if (validationResult.isFailure) {
          return Result.fail(
            TranslationError.forFromExternal(
              `External validation failed: ${validationResult.error.message}`,
              externalModel,
              this.contextId,
              validationResult.error,
            ),
          );
        }
      }

      // 2. Apply external model specifications
      const specificationResult =
        this.checkExternalSpecifications(externalModel);
      if (specificationResult.isFailure) {
        return Result.fail(
          TranslationError.forFromExternal(
            `External specifications not satisfied: ${specificationResult.error.message}`,
            externalModel,
            this.contextId,
            specificationResult.error,
          ),
        );
      }

      // 3. Apply core translation
      const translationResult = this.mapFromExternal(externalModel, context);
      if (translationResult.isFailure) {
        return translationResult;
      }

      // 4. Apply translation rules
      const rulesResult = this.applyFromExternalRules(
        externalModel,
        translationResult.value,
      );
      if (rulesResult.isFailure) {
        return rulesResult;
      }

      // 5. Validate domain model
      if (!options?.skipValidation) {
        const domainValidationResult = this.validateDomainModel(
          rulesResult.value,
        );
        if (domainValidationResult.isFailure) {
          return Result.fail(
            TranslationError.forFromExternal(
              `Domain validation failed: ${domainValidationResult.error.message}`,
              externalModel,
              this.contextId,
              domainValidationResult.error,
            ),
          );
        }
      }

      return Result.ok(rulesResult.value);
    } catch (error) {
      return Result.fail(
        TranslationError.forFromExternal(
          'Unexpected error during translation from external',
          externalModel,
          this.contextId,
          error as Error,
        ),
      );
    }
  }

  /**
   * Bulk translate domain models to external format
   */
  async translateManyToExternal(
    domainModels: TDomainModel[],
    options?: TranslationOptions,
  ): Promise<Result<TExternalModel[], TranslationError>> {
    const results: TExternalModel[] = [];

    for (const domainModel of domainModels) {
      const result = this.translateToExternal(domainModel, options);
      if (result.isFailure) {
        return Result.fail(result.error);
      }
      results.push(result.value);
    }

    return Result.ok(results);
  }

  /**
   * Bulk translate external models to domain format
   */
  async translateManyFromExternal(
    externalModels: TExternalModel[],
    options?: TranslationOptions,
  ): Promise<Result<TDomainModel[], TranslationError>> {
    const results: TDomainModel[] = [];

    for (const externalModel of externalModels) {
      const result = this.translateFromExternal(externalModel, options);
      if (result.isFailure) {
        return Result.fail(result.error);
      }
      results.push(result.value);
    }

    return Result.ok(results);
  }

  /**
   * Get ACL context identifier
   */
  getContextId(): ACLContextId {
    return this.contextId;
  }

  /**
   * Get external system information
   */
  getExternalSystemInfo(): ExternalSystemInfo {
    return { ...this.externalSystemInfo };
  }

  /**
   * Register translation rule for domain to external
   */
  protected addToExternalRule(
    rule: ITranslationRule<TDomainModel, TExternalModel>,
  ): void {
    this.toExternalRules.push(rule);
    this.sortRulesByPriority(this.toExternalRules);
  }

  /**
   * Register translation rule for external to domain
   */
  protected addFromExternalRule(
    rule: ITranslationRule<TExternalModel, TDomainModel>,
  ): void {
    this.fromExternalRules.push(rule);
    this.sortRulesByPriority(this.fromExternalRules);
  }

  // Abstract methods for concrete implementations
  protected abstract mapToExternal(
    domainModel: TDomainModel,
    context: ITranslationContext,
  ): Result<TExternalModel, TranslationError>;

  protected abstract mapFromExternal(
    externalModel: TExternalModel,
    context: ITranslationContext,
  ): Result<TDomainModel, TranslationError>;

  // Validation methods using DomainTS BusinessRuleValidator
  protected validateDomainModel(
    model: TDomainModel,
  ): Result<TDomainModel, Error> {
    const validator = this.createDomainModelValidator();
    return validator.validate(model);
  }

  protected validateExternalModel(
    model: TExternalModel,
  ): Result<TExternalModel, Error> {
    const validator = this.createExternalModelValidator();
    return validator.validate(model);
  }

  // Specification methods using DomainTS CompositeSpecification
  protected checkDomainSpecifications(
    model: TDomainModel,
  ): Result<TDomainModel, Error> {
    const specification = this.createDomainModelSpecification();
    if (specification && !specification.isSatisfiedBy(model)) {
      return Result.fail(
        new Error('Domain model does not satisfy specifications'),
      );
    }
    return Result.ok(model);
  }

  protected checkExternalSpecifications(
    model: TExternalModel,
  ): Result<TExternalModel, Error> {
    const specification = this.createExternalModelSpecification();
    if (specification && !specification.isSatisfiedBy(model)) {
      return Result.fail(
        new Error('External model does not satisfy specifications'),
      );
    }
    return Result.ok(model);
  }

  // Extendable validation and specification methods
  protected createDomainModelValidator(): BusinessRuleValidator<TDomainModel> {
    return BusinessRuleValidator.create<TDomainModel>();
  }

  protected createExternalModelValidator(): BusinessRuleValidator<TExternalModel> {
    return BusinessRuleValidator.create<TExternalModel>();
  }

  protected createDomainModelSpecification(): CompositeSpecification<TDomainModel> | null {
    return null; // Override in derived classes
  }

  protected createExternalModelSpecification(): CompositeSpecification<TExternalModel> | null {
    return null; // Override in derived classes
  }

  // Private helper methods
  private createTranslationContext(
    direction: 'TO_EXTERNAL' | 'FROM_EXTERNAL',
    options?: TranslationOptions,
  ): ITranslationContext {
    return {
      contextId: this.contextId,
      timestamp: new Date(),
      direction,
      options,
    };
  }

  private applyToExternalRules(
    domainModel: TDomainModel,
    baseExternal: TExternalModel,
  ): Result<TExternalModel, TranslationError> {
    let result = baseExternal;

    for (const rule of this.toExternalRules.filter((r) =>
      r.appliesTo(domainModel),
    )) {
      const ruleResult = rule.apply(domainModel);
      if (ruleResult.isFailure) {
        return Result.fail(
          TranslationError.forToExternal(
            `Translation rule ${rule.ruleId} failed: ${ruleResult.error.message}`,
            domainModel,
            this.contextId,
            ruleResult.error,
          ),
        );
      }

      result = { ...result, ...ruleResult.value };
    }

    return Result.ok(result);
  }

  private applyFromExternalRules(
    externalModel: TExternalModel,
    baseDomain: TDomainModel,
  ): Result<TDomainModel, TranslationError> {
    let result = baseDomain;

    for (const rule of this.fromExternalRules.filter((r) =>
      r.appliesTo(externalModel),
    )) {
      const ruleResult = rule.apply(externalModel);
      if (ruleResult.isFailure) {
        return Result.fail(
          TranslationError.forFromExternal(
            `Translation rule ${rule.ruleId} failed: ${ruleResult.error.message}`,
            externalModel,
            this.contextId,
            ruleResult.error,
          ),
        );
      }

      result = { ...result, ...ruleResult.value };
    }

    return Result.ok(result);
  }

  private sortRulesByPriority<T>(rules: ITranslationRule<any, T>[]): void {
    rules.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get statistics about registered translation rules
   */
  protected getRuleStatistics(): {
    toExternalRules: number;
    fromExternalRules: number;
    totalRules: number;
  } {
    return {
      toExternalRules: this.toExternalRules.length,
      fromExternalRules: this.fromExternalRules.length,
      totalRules: this.toExternalRules.length + this.fromExternalRules.length,
    };
  }
}
