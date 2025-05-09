import { ISpecification } from '../validations';
import { Result } from '../utils';
import {
  PolicyRegistry,
  BusinessPolicy,
  PolicyViolation,
  IBusinessPolicy,
} from '../policies';

/**
 * Helper for creating domain-specific policy factories
 */
export function createPolicyFactory<T>(domain: string) {
  return {
    /**
     * Register a new policy for this domain
     */
    register(
      name: string,
      specification: ISpecification<T>,
      violationCode: string,
      violationMessage: string,
      violationDetails?: (entity: T) => Record<string, any>,
    ): IBusinessPolicy<T> {
      const policy = BusinessPolicy.fromSpecification(
        specification,
        violationCode,
        violationMessage,
        violationDetails,
      );

      PolicyRegistry.register(domain, name, policy);
      return policy;
    },

    /**
     * Get a policy from this domain
     */
    get(name: string): IBusinessPolicy<T> {
      return PolicyRegistry.getPolicy<T>(domain, name);
    },

    /**
     * Get all policies from this domain
     */
    getAll(): Record<string, IBusinessPolicy<T>> {
      return PolicyRegistry.getDomainPolicies<T>(domain);
    },

    /**
     * Check if entity satisfies all registered policies
     */
    checkAll(entity: T): Result<T, PolicyViolation[]> {
      const policies = this.getAll();
      const violations: PolicyViolation[] = [];

      for (const name in policies) {
        const result = policies[name].check(entity);
        if (result.isFailure) {
          violations.push(result.error);
        }
      }

      if (violations.length > 0) {
        return Result.fail(violations);
      }

      return Result.ok(entity);
    },
  };
}
