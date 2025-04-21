import { describe, it, expect, beforeEach, vi } from 'vitest';

import { BusinessPolicy, PolicyRegistry, createPolicyFactory } from '../policies';
import { ISpecification } from '../validations';
import { safeRun } from '../utils';

/**
 * Integration tests for Business Policy functionality
 * These tests verify that the different components work together correctly
 */
describe('Business Policy Integration', () => {
  // Clear the registry before each test to avoid test interference
  beforeEach(() => {
    // Reset the private static property by using any type
    (PolicyRegistry as any).policies = new Map();
  });
  
  // Define some test types
  interface User {
    age: number;
    email: string;
    isActive: boolean;
  }
  
  // Helper function to create specifications
  const createSpec = <T>(
    name: string, 
    predicate: (entity: T) => boolean
  ): ISpecification<T> => {
    return {
      isSatisfiedBy: predicate,
      and: function(other) {
        return {
          isSatisfiedBy: (entity: T) => this.isSatisfiedBy(entity) && other.isSatisfiedBy(entity),
          and: vi.fn(),
          or: vi.fn(),
          not: vi.fn()
        };
      },
      or: function(other) {
        return {
          isSatisfiedBy: (entity: T) => this.isSatisfiedBy(entity) || other.isSatisfiedBy(entity),
          and: vi.fn(),
          or: vi.fn(),
          not: vi.fn()
        };
      },
      not: function() {
        return {
          isSatisfiedBy: (entity: T) => !this.isSatisfiedBy(entity),
          and: vi.fn(),
          or: vi.fn(),
          not: vi.fn()
        };
      }
    };
  };
  
  describe('Policy composition', () => {
    it('should combine policies using AND logic', () => {
      // Arrange
      const adultSpec = createSpec<User>('adult', user => user.age >= 18);
      const activeSpec = createSpec<User>('active', user => user.isActive === true);
      
      const adultPolicy = new BusinessPolicy(
        adultSpec,
        'UNDERAGE',
        'User must be at least 18 years old'
      );
      
      const activePolicy = new BusinessPolicy(
        activeSpec,
        'INACTIVE',
        'User must be active'
      );
      
      // Act
      const combinedPolicy = adultPolicy.and(activePolicy);
      
      // Assert
      const validUser: User = { age: 20, email: 'test@example.com', isActive: true };
      const underage: User = { age: 16, email: 'test@example.com', isActive: true };
      const inactive: User = { age: 20, email: 'test@example.com', isActive: false };
      const invalid: User = { age: 16, email: 'test@example.com', isActive: false };
      
      expect(combinedPolicy.isSatisfiedBy(validUser)).toBe(true);
      expect(combinedPolicy.isSatisfiedBy(underage)).toBe(false);
      expect(combinedPolicy.isSatisfiedBy(inactive)).toBe(false);
      expect(combinedPolicy.isSatisfiedBy(invalid)).toBe(false);
      
      // Verify the error message for the first failure
      const result = combinedPolicy.check(underage);
      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe('UNDERAGE');
    });
    
    it('should combine policies using OR logic', () => {
      // Arrange
      const premiumSpec = createSpec<User>('premium', user => user.age >= 25);
      const activeSpec = createSpec<User>('active', user => user.isActive === true);
      
      const premiumPolicy = new BusinessPolicy(
        premiumSpec,
        'NOT_PREMIUM',
        'User must be at least 25 years old for premium'
      );
      
      const activePolicy = new BusinessPolicy(
        activeSpec,
        'INACTIVE',
        'User must be active'
      );
      
      // Act
      const combinedPolicy = premiumPolicy.or(activePolicy);
      
      // Assert
      const premiumUser: User = { age: 30, email: 'test@example.com', isActive: false };
      const activeUser: User = { age: 20, email: 'test@example.com', isActive: true };
      const validBoth: User = { age: 30, email: 'test@example.com', isActive: true };
      const invalid: User = { age: 20, email: 'test@example.com', isActive: false };
      
      expect(combinedPolicy.isSatisfiedBy(premiumUser)).toBe(true);
      expect(combinedPolicy.isSatisfiedBy(activeUser)).toBe(true);
      expect(combinedPolicy.isSatisfiedBy(validBoth)).toBe(true);
      expect(combinedPolicy.isSatisfiedBy(invalid)).toBe(false);
      
      // Verify the error message when both fail
      const result = combinedPolicy.check(invalid);
      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe('NOT_PREMIUM/INACTIVE');
      expect(result.error.message).toBe('User must be at least 25 years old for premium OR User must be active');
    });
    
    it('should handle complex policy chains', () => {
      // Arrange
      const adultSpec = createSpec<User>('adult', user => user.age >= 18);
      const seniorSpec = createSpec<User>('senior', user => user.age >= 65);
      const activeSpec = createSpec<User>('active', user => user.isActive === true);
      const validEmailSpec = createSpec<User>('validEmail', user => user.email.includes('@'));
      
      const adultPolicy = new BusinessPolicy(
        adultSpec,
        'UNDERAGE',
        'User must be at least 18 years old'
      );
      
      const seniorPolicy = new BusinessPolicy(
        seniorSpec,
        'NOT_SENIOR',
        'User must be at least 65 years old'
      );
      
      const activePolicy = new BusinessPolicy(
        activeSpec,
        'INACTIVE',
        'User must be active'
      );
      
      const emailPolicy = new BusinessPolicy(
        validEmailSpec,
        'INVALID_EMAIL',
        'Email must be valid'
      );
      
      // Complex policy: (Adult OR Senior) AND (Active AND ValidEmail)
      const agePolicy = adultPolicy.or(seniorPolicy);
      const contactPolicy = activePolicy.and(emailPolicy);
      const complexPolicy = agePolicy.and(contactPolicy);
      
      // Assert
      const validYoung: User = { age: 20, email: 'test@example.com', isActive: true };
      const validSenior: User = { age: 70, email: 'senior@example.com', isActive: true };
      const underage: User = { age: 16, email: 'test@example.com', isActive: true };
      const inactiveAdult: User = { age: 20, email: 'test@example.com', isActive: false };
      const invalidEmailSenior: User = { age: 70, email: 'invalid', isActive: true };
      
      expect(complexPolicy.isSatisfiedBy(validYoung)).toBe(true);
      expect(complexPolicy.isSatisfiedBy(validSenior)).toBe(true);
      expect(complexPolicy.isSatisfiedBy(underage)).toBe(false);
      expect(complexPolicy.isSatisfiedBy(inactiveAdult)).toBe(false);
      expect(complexPolicy.isSatisfiedBy(invalidEmailSenior)).toBe(false);
    });
  });
  
  describe('Policy Factory and Registry integration', () => {
    it('should facilitate domain-specific policy management', () => {
      // Arrange
      const userFactory = createPolicyFactory<User>('user');
      const productFactory = createPolicyFactory<{price: number}>('product');
      
      // Register policies for different domains
      userFactory.register(
        'adult',
        createSpec<User>('adult', user => user.age >= 18),
        'UNDERAGE',
        'User must be at least 18 years old'
      );
      
      userFactory.register(
        'active',
        createSpec<User>('active', user => user.isActive === true),
        'INACTIVE',
        'User must be active'
      );
      
      productFactory.register(
        'validPrice',
        createSpec<{price: number}>('validPrice', product => product.price > 0),
        'INVALID_PRICE',
        'Product price must be positive'
      );
      
      // Act
      const [err1] = safeRun(() => userFactory.get('validPrice'));
      const [err2] = safeRun(() => productFactory.get('adult'));
      
      // Assert - Cross-domain policies should be isolated
      const user: User = { age: 20, email: 'test@example.com', isActive: true };
      const product = { price: 10 };
      
      expect(userFactory.get('adult').isSatisfiedBy(user)).toBe(true);
      expect(userFactory.get('active').isSatisfiedBy(user)).toBe(true);
      expect(productFactory.get('validPrice').isSatisfiedBy(product)).toBe(true);
      
      // Should throw for cross-domain access attempts
      expect(err1.message).toEqual(`Policy "validPrice" not found in domain "user"`);
      expect(err2.message).toEqual(`Policy "adult" not found in domain "product"`);
    });
    
    it('should check all domain policies efficiently', () => {
      // Arrange
      const userFactory = createPolicyFactory<User>('user');
      
      userFactory.register(
        'adult',
        createSpec<User>('adult', user => user.age >= 18),
        'UNDERAGE',
        'User must be at least 18 years old'
      );
      
      userFactory.register(
        'active',
        createSpec<User>('active', user => user.isActive === true),
        'INACTIVE',
        'User must be active'
      );
      
      userFactory.register(
        'validEmail',
        createSpec<User>('validEmail', user => user.email.includes('@')),
        'INVALID_EMAIL',
        'Email must be valid'
      );
      
      // Act & Assert
      const validUser: User = { age: 20, email: 'test@example.com', isActive: true };
      const invalidUser: User = { age: 16, email: 'invalid', isActive: false };
      
      const validResult = userFactory.checkAll(validUser);
      expect(validResult.isSuccess).toBe(true);
      
      const invalidResult = userFactory.checkAll(invalidUser);
      expect(invalidResult.isFailure).toBe(true);
      expect(invalidResult.error.length).toBe(3); // All three policies should fail
      
      const violations = invalidResult.error.map(v => v.code);
      expect(violations).toContain('UNDERAGE');
      expect(violations).toContain('INACTIVE');
      expect(violations).toContain('INVALID_EMAIL');
    });
  });
});
