import { Result } from '@/utils';
import { ISpecification, IValidator } from '@/validations';
import { CompositePolicy, PolicyViolation, IBusinessPolicy } from '@/policies';

/**
 * Implementation of a business policy based on a specification
 */
export class BusinessPolicy<T> implements IBusinessPolicy<T> {
  constructor(
    private readonly specification: ISpecification<T>,
    private readonly violationCode: string,
    private readonly violationMessage: string,
    private readonly violationDetails?: (entity: T) => Record<string, any>
  ) {}

  isSatisfiedBy(entity: T): boolean {
    return this.specification.isSatisfiedBy(entity);
  }

  check(entity: T): Result<T, PolicyViolation> {
    if (this.isSatisfiedBy(entity)) {
      return Result.ok(entity);
    }
    
    const details = this.violationDetails ? this.violationDetails(entity) : undefined;
    return Result.fail(new PolicyViolation(
      this.violationCode,
      this.violationMessage,
      details
    ));
  }

  and(other: IBusinessPolicy<T>): IBusinessPolicy<T> {
    return new CompositePolicy<T>('AND', [this, other]);
  }

  or(other: IBusinessPolicy<T>): IBusinessPolicy<T> {
    return new CompositePolicy<T>('OR', [this, other]);
  }

  /**
   * Create a business policy from a specification
   */
  static fromSpecification<T>(
    specification: ISpecification<T>,
    violationCode: string,
    violationMessage: string,
    violationDetails?: (entity: T) => Record<string, any>
  ): BusinessPolicy<T> {
    return new BusinessPolicy<T>(
      specification,
      violationCode,
      violationMessage,
      violationDetails
    );
  }

  /**
   * Create a business policy from a validator
   */
  static fromValidator<T>(
    validator: IValidator<T>,
    violationCode: string,
    violationMessage: string
  ): BusinessPolicy<T> {
    const spec: ISpecification<T> = {
      isSatisfiedBy(candidate: T): boolean {
        return validator.validate(candidate).isSuccess;
      },
      and(other) { throw new Error('Not implemented'); },
      or(other) { throw new Error('Not implemented'); },
      not() { throw new Error('Not implemented'); }
    };

    return new BusinessPolicy<T>(
      spec,
      violationCode,
      violationMessage,
      (entity: T) => {
        const result = validator.validate(entity);
        if (result.isFailure) {
          return {
            validationErrors: result.error.errors.map(e => ({
              property: e.property,
              message: e.message
            }))
          };
        }
        return {};
      }
    );
  }
}