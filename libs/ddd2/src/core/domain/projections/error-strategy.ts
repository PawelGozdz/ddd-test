import {
  IProjectionErrorStrategy,
  IProjectionRetryConfig,
} from './projection-interfaces';

export class ExponentialBackoffStrategy implements IProjectionErrorStrategy {
  shouldRetry(
    error: Error,
    attempt: number,
    config: IProjectionRetryConfig,
  ): boolean {
    return attempt < config.maxAttempts && this.isRetryableError(error, config);
  }

  getRetryDelay(attempt: number, config: IProjectionRetryConfig): number {
    const delay =
      config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
    return Math.min(delay, config.maxDelayMs);
  }

  isRetryableError(error: Error, config: IProjectionRetryConfig): boolean {
    const errorType = error.constructor.name;

    // Explicit non-retryable takes precedence
    if (config.nonRetryableErrors.includes(errorType)) {
      return false;
    }

    // If retryable list is specified, only those are retryable
    if (config.retryableErrors.length > 0) {
      return config.retryableErrors.includes(errorType);
    }

    // Default: retry network/db errors, don't retry validation errors
    const retryableByDefault = [
      'NetworkError',
      'TimeoutError',
      'DatabaseError',
    ];
    const nonRetryableByDefault = ['ValidationError', 'ProjectionError'];

    if (nonRetryableByDefault.includes(errorType)) return false;
    return retryableByDefault.includes(errorType);
  }
}
