import { BaseError } from '../../core/errors';

export class QueryExecutionError extends BaseError {
  constructor(
    public readonly queryType: string,
    public readonly originalError: Error,
  ) {
    super(`Query execution failed: ${queryType} - ${originalError.message}`);
    this.originalError = originalError;
  }
}
