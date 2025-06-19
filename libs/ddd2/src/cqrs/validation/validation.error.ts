import { BaseError } from '../../core/errors';

export class CqrsValidationError extends BaseError {
  constructor(
    message: string,
    public readonly field?: string,
  ) {
    super(message);
  }
}
