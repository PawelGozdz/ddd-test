import { Result } from '../utils';
import { CompositeSpecification } from '../validations';

/**
 * Specification for models that can be translated to external systems
 */
export abstract class TranslatableToExternalSpecification<
  T,
> extends CompositeSpecification<T> {
  abstract isSatisfiedBy(model: T): boolean;

  /**
   * Get reason why model cannot be translated
   */
  abstract getFailureReason(model: T): string;
}

/**
 * Specification for valid external models that can be imported
 */
export abstract class ValidExternalModelSpecification<
  T,
> extends CompositeSpecification<T> {
  abstract isSatisfiedBy(externalModel: T): boolean;

  /**
   * Get validation errors for external model
   */
  abstract getValidationErrors(externalModel: T): string[];
}

/**
 * Composite specification for translation readiness
 */
export class TranslationReadinessSpecification<TDomain, TExternal> {
  constructor(
    private domainSpec: TranslatableToExternalSpecification<TDomain>,
    private externalSpec: ValidExternalModelSpecification<TExternal>,
  ) {}

  /**
   * Check if domain model can be translated
   */
  canTranslateToExternal(domainModel: TDomain): Result<void, Error> {
    if (!this.domainSpec.isSatisfiedBy(domainModel)) {
      return Result.fail(
        new Error(this.domainSpec.getFailureReason(domainModel)),
      );
    }
    return Result.ok();
  }

  /**
   * Check if external model can be imported
   */
  canTranslateFromExternal(externalModel: TExternal): Result<void, Error> {
    if (!this.externalSpec.isSatisfiedBy(externalModel)) {
      const errors = this.externalSpec.getValidationErrors(externalModel);
      return Result.fail(
        new Error(`External model validation failed: ${errors.join(', ')}`),
      );
    }
    return Result.ok();
  }
}
