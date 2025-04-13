import { Result } from '@/utils';
import { PolicyViolation, IBusinessPolicy } from '@/policies';

/**
 * Composite policy that combines multiple policies
 */
export class CompositePolicy<T> implements IBusinessPolicy<T> {
  constructor(
    private readonly operator: 'AND' | 'OR',
    private readonly policies: IBusinessPolicy<T>[]
  ) {}

  isSatisfiedBy(entity: T): boolean {
    if (this.operator === 'AND') {
      return this.policies.every(policy => policy.isSatisfiedBy(entity));
    } else {
      return this.policies.some(policy => policy.isSatisfiedBy(entity));
    }
  }

  check(entity: T): Result<T, PolicyViolation> {
    const violations: PolicyViolation[] = [];
    
    for (const policy of this.policies) {
      const result = policy.check(entity);
      
      if (result.isFailure) {
        violations.push(result.error);
        
        // For OR, we can continue checking other policies
        if (this.operator === 'OR' && violations.length < this.policies.length) {
          continue;
        }
        
        // For AND, we can stop at first failure
        if (this.operator === 'AND') {
          break;
        }
      } else if (this.operator === 'OR') {
        // For OR, one success is enough
        return Result.ok(entity);
      }
    }
    
    if ((this.operator === 'AND' && violations.length > 0) || 
        (this.operator === 'OR' && violations.length === this.policies.length)) {
      const code = violations.map(v => v.code).join(this.operator === 'AND' ? '.' : '/');
      const message = violations.map(v => v.message).join(this.operator === 'AND' ? ' AND ' : ' OR ');
      
      return Result.fail(new PolicyViolation(
        code,
        message,
        { 
          operator: this.operator,
          violations 
        }
      ));
    }
    
    return Result.ok(entity);
  }

  and(other: IBusinessPolicy<T>): IBusinessPolicy<T> {
    if (this.operator === 'AND') {
      return new CompositePolicy<T>('AND', [...this.policies, other]);
    }
    return new CompositePolicy<T>('AND', [this, other]);
  }

  or(other: IBusinessPolicy<T>): IBusinessPolicy<T> {
    if (this.operator === 'OR') {
      return new CompositePolicy<T>('OR', [...this.policies, other]);
    }
    return new CompositePolicy<T>('OR', [this, other]);
  }
}