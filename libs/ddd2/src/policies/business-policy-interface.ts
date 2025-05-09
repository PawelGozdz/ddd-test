import { Result } from '../utils';
import { PolicyViolation } from './policy-violation';

/**
 * Interface for business policies
 */
export interface IBusinessPolicy<T> {
  /**
   * Check if entity satisfies the policy
   */
  isSatisfiedBy(entity: T): boolean;

  /**
   * Validate entity against the policy and return detailed result
   */
  check(entity: T): Result<T, PolicyViolation>;

  /**
   * Combine this policy with another using AND logic
   */
  and(other: IBusinessPolicy<T>): IBusinessPolicy<T>;

  /**
   * Combine this policy with another using OR logic
   */
  or(other: IBusinessPolicy<T>): IBusinessPolicy<T>;
}
