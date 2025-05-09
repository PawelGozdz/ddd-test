import { createMock } from '@golevelup/ts-vitest';
import { describe, it, expect, vi } from 'vitest';

import { CompositePolicy, BusinessPolicy, PolicyViolation } from '../policies';
import { Result } from '../utils';
import { ISpecification } from '../validations';

/**
 * Unit tests for CompositePolicy class
 */
describe('CompositePolicy', () => {
  // Create helper function to create test policies
  const createTestPolicy = (
    isSatisfied: boolean,
    code: string,
    message: string,
  ): BusinessPolicy<any> => {
    const spec = createMock({
      isSatisfiedBy: () => isSatisfied,
    }) as ISpecification<any>;
    return new BusinessPolicy(spec, code, message);
  };

  describe('isSatisfiedBy', () => {
    it('should return true for AND when all policies are satisfied', () => {
      // Arrange
      const policy1 = createTestPolicy(true, 'CODE1', 'Message 1');
      const policy2 = createTestPolicy(true, 'CODE2', 'Message 2');
      const composite = new CompositePolicy('AND', [policy1, policy2]);
      const entity = { value: 'test' };

      // Act
      const result = composite.isSatisfiedBy(entity);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for AND when any policy is not satisfied', () => {
      // Arrange
      const policy1 = createTestPolicy(true, 'CODE1', 'Message 1');
      const policy2 = createTestPolicy(false, 'CODE2', 'Message 2');
      const composite = new CompositePolicy('AND', [policy1, policy2]);
      const entity = { value: 'test' };

      // Act
      const result = composite.isSatisfiedBy(entity);

      // Assert
      expect(result).toBe(false);
    });

    it('should return true for OR when any policy is satisfied', () => {
      // Arrange
      const policy1 = createTestPolicy(false, 'CODE1', 'Message 1');
      const policy2 = createTestPolicy(true, 'CODE2', 'Message 2');
      const composite = new CompositePolicy('OR', [policy1, policy2]);
      const entity = { value: 'test' };

      // Act
      const result = composite.isSatisfiedBy(entity);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for OR when all policies are not satisfied', () => {
      // Arrange
      const policy1 = createTestPolicy(false, 'CODE1', 'Message 1');
      const policy2 = createTestPolicy(false, 'CODE2', 'Message 2');
      const composite = new CompositePolicy('OR', [policy1, policy2]);
      const entity = { value: 'test' };

      // Act
      const result = composite.isSatisfiedBy(entity);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('check', () => {
    it('should return success for AND when all policies are satisfied', () => {
      // Arrange
      const policy1 = createTestPolicy(true, 'CODE1', 'Message 1');
      const policy2 = createTestPolicy(true, 'CODE2', 'Message 2');
      const composite = new CompositePolicy('AND', [policy1, policy2]);
      const entity = { value: 'test' };

      // Act
      const result = composite.check(entity);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe(entity);
    });

    it('should return failure for AND when any policy is not satisfied', () => {
      // Arrange
      const policy1 = createTestPolicy(true, 'CODE1', 'Message 1');
      const policy2 = createTestPolicy(false, 'CODE2', 'Message 2');
      const composite = new CompositePolicy('AND', [policy1, policy2]);
      const entity = { value: 'test' };

      // Act
      const result = composite.check(entity);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe('CODE2');
      expect(result.error.message).toBe('Message 2');
      expect(result.error.details).toEqual({
        operator: 'AND',
        violations: [expect.any(PolicyViolation)],
      });
    });

    it('should return success for OR when any policy is satisfied', () => {
      // Arrange
      const policy1 = createTestPolicy(false, 'CODE1', 'Message 1');
      const policy2 = createTestPolicy(true, 'CODE2', 'Message 2');
      const composite = new CompositePolicy('OR', [policy1, policy2]);
      const entity = { value: 'test' };

      // Act
      const result = composite.check(entity);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe(entity);
    });

    it('should return failure for OR when all policies are not satisfied', () => {
      // Arrange
      const policy1 = createTestPolicy(false, 'CODE1', 'Message 1');
      const policy2 = createTestPolicy(false, 'CODE2', 'Message 2');
      const composite = new CompositePolicy('OR', [policy1, policy2]);
      const entity = { value: 'test' };

      // Act
      const result = composite.check(entity);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe('CODE1/CODE2');
      expect(result.error.message).toBe('Message 1 OR Message 2');
      expect(result.error.details).toEqual({
        operator: 'OR',
        violations: [expect.any(PolicyViolation), expect.any(PolicyViolation)],
      });
    });

    it('should stop checking at first failure for AND operator', () => {
      // Arrange
      const checkSpy1 = vi.fn().mockReturnValue(Result.ok({}));
      const checkSpy2 = vi
        .fn()
        .mockReturnValue(
          Result.fail(new PolicyViolation('CODE2', 'Message 2')),
        );
      const checkSpy3 = vi.fn().mockReturnValue(Result.ok({}));

      const mockPolicy1 = {
        check: checkSpy1,
        isSatisfiedBy: vi.fn(),
        and: vi.fn(),
        or: vi.fn(),
      };
      const mockPolicy2 = {
        check: checkSpy2,
        isSatisfiedBy: vi.fn(),
        and: vi.fn(),
        or: vi.fn(),
      };
      const mockPolicy3 = {
        check: checkSpy3,
        isSatisfiedBy: vi.fn(),
        and: vi.fn(),
        or: vi.fn(),
      };

      const composite = new CompositePolicy('AND', [
        mockPolicy1,
        mockPolicy2,
        mockPolicy3,
      ]);
      const entity = { value: 'test' };

      // Act
      composite.check(entity);

      // Assert
      expect(checkSpy1).toHaveBeenCalledTimes(1);
      expect(checkSpy2).toHaveBeenCalledTimes(1);
      expect(checkSpy3).not.toHaveBeenCalled(); // Should not check the third policy
    });

    it('should check all policies for OR operator', () => {
      // Arrange
      const checkSpy1 = vi
        .fn()
        .mockReturnValue(
          Result.fail(new PolicyViolation('CODE1', 'Message 1')),
        );
      const checkSpy2 = vi
        .fn()
        .mockReturnValue(
          Result.fail(new PolicyViolation('CODE2', 'Message 2')),
        );
      const checkSpy3 = vi
        .fn()
        .mockReturnValue(
          Result.fail(new PolicyViolation('CODE3', 'Message 3')),
        );

      const mockPolicy1 = {
        check: checkSpy1,
        isSatisfiedBy: vi.fn(),
        and: vi.fn(),
        or: vi.fn(),
      };
      const mockPolicy2 = {
        check: checkSpy2,
        isSatisfiedBy: vi.fn(),
        and: vi.fn(),
        or: vi.fn(),
      };
      const mockPolicy3 = {
        check: checkSpy3,
        isSatisfiedBy: vi.fn(),
        and: vi.fn(),
        or: vi.fn(),
      };

      const composite = new CompositePolicy('OR', [
        mockPolicy1,
        mockPolicy2,
        mockPolicy3,
      ]);
      const entity = { value: 'test' };

      // Act
      composite.check(entity);

      // Assert
      expect(checkSpy1).toHaveBeenCalledTimes(1);
      expect(checkSpy2).toHaveBeenCalledTimes(1);
      expect(checkSpy3).toHaveBeenCalledTimes(1);
    });

    it('should stop checking at first success for OR operator', () => {
      // Arrange
      const checkSpy1 = vi
        .fn()
        .mockReturnValue(
          Result.fail(new PolicyViolation('CODE1', 'Message 1')),
        );
      const checkSpy2 = vi.fn().mockReturnValue(Result.ok({}));
      const checkSpy3 = vi
        .fn()
        .mockReturnValue(
          Result.fail(new PolicyViolation('CODE3', 'Message 3')),
        );

      const mockPolicy1 = {
        check: checkSpy1,
        isSatisfiedBy: vi.fn(),
        and: vi.fn(),
        or: vi.fn(),
      };
      const mockPolicy2 = {
        check: checkSpy2,
        isSatisfiedBy: vi.fn(),
        and: vi.fn(),
        or: vi.fn(),
      };
      const mockPolicy3 = {
        check: checkSpy3,
        isSatisfiedBy: vi.fn(),
        and: vi.fn(),
        or: vi.fn(),
      };

      const composite = new CompositePolicy('OR', [
        mockPolicy1,
        mockPolicy2,
        mockPolicy3,
      ]);
      const entity = { value: 'test' };

      // Act
      composite.check(entity);

      // Assert
      expect(checkSpy1).toHaveBeenCalledTimes(1);
      expect(checkSpy2).toHaveBeenCalledTimes(1);
      expect(checkSpy3).not.toHaveBeenCalled(); // Should not check the third policy
    });
  });

  describe('and method', () => {
    it('should add to existing policies for AND operator', () => {
      // Arrange
      const policy1 = createTestPolicy(true, 'CODE1', 'Message 1');
      const policy2 = createTestPolicy(true, 'CODE2', 'Message 2');
      const policy3 = createTestPolicy(true, 'CODE3', 'Message 3');

      const composite = new CompositePolicy('AND', [policy1, policy2]);

      // Act
      const newComposite = composite.and(policy3) as CompositePolicy<any>;

      // Assert - Testing internal implementation details
      expect(newComposite['operator']).toBe('AND');
      expect(newComposite['policies'].length).toBe(3);
    });

    it('should create new composite for OR operator', () => {
      // Arrange
      const policy1 = createTestPolicy(true, 'CODE1', 'Message 1');
      const policy2 = createTestPolicy(true, 'CODE2', 'Message 2');
      const policy3 = createTestPolicy(true, 'CODE3', 'Message 3');

      const composite = new CompositePolicy('OR', [policy1, policy2]);

      // Act
      const newComposite = composite.and(policy3) as CompositePolicy<any>;

      // Assert - Testing internal implementation details
      expect(newComposite['operator']).toBe('AND');
      expect(newComposite['policies'].length).toBe(2); // The original composite and the new policy
    });
  });

  describe('or method', () => {
    it('should add to existing policies for OR operator', () => {
      // Arrange
      const policy1 = createTestPolicy(true, 'CODE1', 'Message 1');
      const policy2 = createTestPolicy(true, 'CODE2', 'Message 2');
      const policy3 = createTestPolicy(true, 'CODE3', 'Message 3');

      const composite = new CompositePolicy('OR', [policy1, policy2]);

      // Act
      const newComposite = composite.or(policy3) as CompositePolicy<any>;

      // Assert - Testing internal implementation details
      expect(newComposite['operator']).toBe('OR');
      expect(newComposite['policies'].length).toBe(3);
    });

    it('should create new composite for AND operator', () => {
      // Arrange
      const policy1 = createTestPolicy(true, 'CODE1', 'Message 1');
      const policy2 = createTestPolicy(true, 'CODE2', 'Message 2');
      const policy3 = createTestPolicy(true, 'CODE3', 'Message 3');

      const composite = new CompositePolicy('AND', [policy1, policy2]);

      // Act
      const newComposite = composite.or(policy3) as CompositePolicy<any>;

      // Assert - Testing internal implementation details
      expect(newComposite['operator']).toBe('OR');
      expect(newComposite['policies'].length).toBe(2); // The original composite and the new policy
    });
  });
});
