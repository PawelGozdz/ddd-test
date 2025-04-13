import { ValidationErrors } from '@/validations';
import { Result } from '@/utils';

/**
 * Interface for validators
 */
export interface IValidator<T> {
  /**
   * Validates a value
   */
  validate(value: T): Result<T, ValidationErrors>;
}