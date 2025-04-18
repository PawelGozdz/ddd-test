import { Result } from '../../utils';
import { IValidator, ValidationError, ValidationErrors } from '../../validations';
import { ISpecification } from './specification-interface';

/**
 * Validator based entirely on specifications.
 * Can be used standalone or as part of a larger validation system.
 */
export class SpecificationValidator<T> implements IValidator<T> {
  private validationRules: Array<{
    specification: ISpecification<T>;
    message: string;
    property?: string;
    context?: Record<string, any>;
  }> = [];

  /**
   * Adds a validation rule based on a specification
   */
  addRule(
    specification: ISpecification<T>,
    message: string,
    property?: string,
    context?: Record<string, any>
  ): SpecificationValidator<T> {
    this.validationRules.push({
      specification,
      message,
      property,
      context
    });
    return this;
  }

  /**
   * Adds a rule for a specific object property
   */
  addPropertyRule<P>(
    property: keyof T & string,
    specification: ISpecification<P>,
    message: string,
    getValue: (obj: T) => P,
    context?: Record<string, any>
  ): SpecificationValidator<T> {
    // Create a specification adapter for the property
    const propertySpec: ISpecification<T> = {
      isSatisfiedBy: (candidate: T) => specification.isSatisfiedBy(getValue(candidate)),
      // The following methods are not used in this context but must be implemented
      and: (other) => { throw new Error('Operation not supported'); },
      or: (other) => { throw new Error('Operation not supported'); },
      not: () => { throw new Error('Operation not supported'); }
    };

    return this.addRule(propertySpec, message, property, context);
  }

  /**
   * Performs validation based on all specifications
   */
  validate(value: T): Result<T, ValidationErrors> {
    const errors: ValidationError[] = [];

    for (const rule of this.validationRules) {
      if (!rule.specification.isSatisfiedBy(value)) {
        errors.push(new ValidationError(
          rule.property || '',
          rule.message,
          rule.context
        ));
      }
    }

    if (errors.length > 0) {
      return Result.fail(new ValidationErrors(errors));
    }

    return Result.ok(value);
  }

  /**
   * Creates a validator with a single rule
   */
  static fromSpecification<T>(
    specification: ISpecification<T>,
    message: string,
    property?: string,
    context?: Record<string, any>
  ): SpecificationValidator<T> {
    return new SpecificationValidator<T>().addRule(specification, message, property, context);
  }

  /**
   * Creates an empty validator
   */
  static create<T>(): SpecificationValidator<T> {
    return new SpecificationValidator<T>();
  }
}