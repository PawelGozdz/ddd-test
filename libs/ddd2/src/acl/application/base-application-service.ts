import { IDomainError } from '../../core';
import { Result } from '../../utils';
import {
  BusinessRuleValidator,
  ValidationError,
  ValidationErrors,
} from '../../validations';

export interface IApplicationService {
  readonly serviceName: string;
}

export abstract class BaseApplicationService implements IApplicationService {
  constructor(public readonly serviceName: string) {}

  protected validateRequest<T>(
    request: T,
    validator: BusinessRuleValidator<T>,
  ): Result<void, ValidationErrors> {
    const validationResult = validator.validate(request);

    if (validationResult.isFailure) {
      return Result.fail(validationResult.error);
    }

    return Result.ok();
  }

  protected handleDomainError(error: any): ApplicationError {
    return new ApplicationError(
      `Domain operation failed: ${error.message}`,
      error,
    );
  }
}

export class ApplicationError extends IDomainError {
  constructor(
    message: string,
    public readonly innerError?: Error,
  ) {
    super(message, { innerError });
  }
}
