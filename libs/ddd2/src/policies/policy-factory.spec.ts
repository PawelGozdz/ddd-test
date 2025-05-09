import { createMock } from '@golevelup/ts-vitest';
import { describe, it, expect, vi } from 'vitest';

import {
  createPolicyFactory,
  PolicyRegistry,
  PolicyViolation,
} from '../policies';
import { ISpecification } from '../validations';
import { safeRun } from '../utils';

/**
 * Unit tests for policy factory functionality
 */
describe('PolicyFactory', () => {
  // Clear the registry before each test to avoid test interference
  beforeEach(() => {
    // Reset the private static property by using any type
    (PolicyRegistry as any).policies = new Map();
  });

  // Helper function to create a specification
  const createSpecification = (isSatisfied: boolean): ISpecification<any> =>
    createMock<ISpecification<any>>({
      isSatisfiedBy: vi.fn().mockReturnValue(isSatisfied),
    });

  describe('register', () => {
    it('should create and register a policy', () => {
      // Arrange
      const domain = 'user';
      const policyName = 'adultPolicy';
      const spec = createSpecification(true);
      const factory = createPolicyFactory<any>(domain);

      // Act
      const policy = factory.register(
        policyName,
        spec,
        'UNDERAGE',
        'User must be an adult',
      );

      // Assert
      expect(policy).toBeDefined();
      expect(policy.isSatisfiedBy({})).toBe(true);

      // Verify it was registered in the registry
      const retrievedPolicy = PolicyRegistry.getPolicy(domain, policyName);
      expect(retrievedPolicy).toBe(policy);
    });

    it('should create policy with detailed violation information', () => {
      // Arrange
      const domain = 'user';
      const policyName = 'adultPolicy';
      const spec = createSpecification(false);
      const factory = createPolicyFactory<any>(domain);
      const detailsFn = (entity: any) => ({ age: entity.age, requiredAge: 18 });

      // Act
      const policy = factory.register(
        policyName,
        spec,
        'UNDERAGE',
        'User must be an adult',
        detailsFn,
      );

      // Assert
      const result = policy.check({ age: 16 });
      expect(result.isFailure).toBe(true);
      expect(result.error.details).toEqual({ age: 16, requiredAge: 18 });
    });
  });

  describe('get', () => {
    it('should retrieve a registered policy', () => {
      // Arrange
      const domain = 'user';
      const policyName = 'adultPolicy';
      const spec = createSpecification(true);
      const factory = createPolicyFactory<any>(domain);

      const registeredPolicy = factory.register(
        policyName,
        spec,
        'UNDERAGE',
        'User must be an adult',
      );

      // Act
      const retrievedPolicy = factory.get(policyName);

      // Assert
      expect(retrievedPolicy).toBe(registeredPolicy);
    });

    it('should throw error for non-existent policy', () => {
      // Arrange
      const domain = 'user';
      const nonExistentPolicy = 'nonExistentPolicy';
      const factory = createPolicyFactory<any>(domain);

      factory.register(
        'dummyPolicy',
        createSpecification(true),
        'DUMMY_CODE',
        'Dummy message',
      );

      // Act
      const [error] = safeRun(() => factory.get(nonExistentPolicy));

      // Assert
      expect(error.message).toBe(
        `Policy "${nonExistentPolicy}" not found in domain "${domain}"`,
      );
    });
  });

  describe('getAll', () => {
    it('should retrieve all policies for domain', () => {
      // Arrange
      const domain = 'user';
      const factory = createPolicyFactory<any>(domain);

      const policy1 = factory.register(
        'adultPolicy',
        createSpecification(true),
        'UNDERAGE',
        'User must be an adult',
      );

      const policy2 = factory.register(
        'validEmailPolicy',
        createSpecification(true),
        'INVALID_EMAIL',
        'Email must be valid',
      );

      // Act
      const allPolicies = factory.getAll();

      // Assert
      expect(Object.keys(allPolicies).length).toBe(2);
      expect(allPolicies['adultPolicy']).toBe(policy1);
      expect(allPolicies['validEmailPolicy']).toBe(policy2);
    });

    it('should throw error for non-existent domain', () => {
      // Arrange
      // Create a domain but don't register any policies
      const nonExistentDomain = 'nonExistent';
      const factory = createPolicyFactory<any>(nonExistentDomain);

      // Act
      const [error] = safeRun(() => factory.getAll());

      // Assert
      expect(error.message).toEqual(`Domain "${nonExistentDomain}" not found`);
    });
  });

  describe('checkAll', () => {
    it('should return success when all policies pass', () => {
      // Arrange
      const domain = 'user';
      const factory = createPolicyFactory<any>(domain);
      const entity = { age: 21, email: 'valid@example.com' };

      factory.register(
        'adultPolicy',
        createSpecification(true),
        'UNDERAGE',
        'User must be an adult',
      );

      factory.register(
        'validEmailPolicy',
        createSpecification(true),
        'INVALID_EMAIL',
        'Email must be valid',
      );

      // Act
      const result = factory.checkAll(entity);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe(entity);
    });

    it('should return failures when any policy fails', () => {
      // Arrange
      const domain = 'user';
      const factory = createPolicyFactory<any>(domain);
      const entity = { age: 16, email: 'invalid' };

      factory.register(
        'adultPolicy',
        createSpecification(false),
        'UNDERAGE',
        'User must be an adult',
      );

      factory.register(
        'validEmailPolicy',
        createSpecification(false),
        'INVALID_EMAIL',
        'Email must be valid',
      );

      // Act
      const result = factory.checkAll(entity);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error.length).toBe(2);
      expect(result.error[0]).toBeInstanceOf(PolicyViolation);
      expect(result.error[1]).toBeInstanceOf(PolicyViolation);
    });

    it('should collect all violations from failed policies', () => {
      // Arrange
      const domain = 'user';
      const factory = createPolicyFactory<any>(domain);
      const entity = { age: 16, email: 'invalid' };

      factory.register(
        'adultPolicy',
        createSpecification(false),
        'UNDERAGE',
        'User must be an adult',
      );

      factory.register(
        'validEmailPolicy',
        createSpecification(false),
        'INVALID_EMAIL',
        'Email must be valid',
      );

      factory.register(
        'activePolicy',
        createSpecification(true),
        'INACTIVE',
        'User must be active',
      );

      // Act
      const result = factory.checkAll(entity);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error.length).toBe(2);

      const codes = result.error.map((v) => v.code);
      expect(codes).toContain('UNDERAGE');
      expect(codes).toContain('INVALID_EMAIL');
      expect(codes).not.toContain('INACTIVE');
    });
  });
});
