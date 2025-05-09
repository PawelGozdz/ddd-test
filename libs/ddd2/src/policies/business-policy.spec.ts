import { createMock } from '@golevelup/ts-vitest';
import { describe, it, expect, beforeEach, Mocked } from 'vitest';
import { BusinessPolicy, PolicyViolation } from '../policies';
import { Result } from '../utils';
import { ISpecification, IValidator, ValidationError } from '../validations';

/**
 * Unit tests for BusinessPolicy class
 */
describe('BusinessPolicy', () => {
  let mockSpecification: Mocked<ISpecification<any>>;
  let mockValidator: Mocked<IValidator<any>>;

  beforeEach(() => {
    // Reset mocks before each test
    mockSpecification = createMock<ISpecification<any>>();
    mockValidator = createMock<IValidator<any>>();
  });

  describe('isSatisfiedBy', () => {
    it('should delegate to specification', () => {
      // Arrange
      const entity = { name: 'Test' };
      mockSpecification.isSatisfiedBy.mockReturnValue(true);
      const policy = new BusinessPolicy(mockSpecification, 'CODE', 'Message');

      // Act
      const result = policy.isSatisfiedBy(entity);

      // Assert
      expect(mockSpecification.isSatisfiedBy).toHaveBeenCalledWith(entity);
      expect(result).toBe(true);
    });
  });

  describe('check', () => {
    it('should return success when policy is satisfied', () => {
      // Arrange
      const entity = { name: 'Test' };
      mockSpecification.isSatisfiedBy.mockReturnValue(true);
      const policy = new BusinessPolicy(mockSpecification, 'CODE', 'Message');

      // Act
      const result = policy.check(entity);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe(entity);
    });

    it('should return failure with violation when policy is not satisfied', () => {
      // Arrange
      const entity = { name: 'Test' };
      const code = 'INVALID_NAME';
      const message = 'Name is invalid';
      mockSpecification.isSatisfiedBy.mockReturnValue(false);
      const policy = new BusinessPolicy(mockSpecification, code, message);

      // Act
      const result = policy.check(entity);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBeInstanceOf(PolicyViolation);
      expect(result.error.code).toBe(code);
      expect(result.error.message).toBe(message);
    });

    it('should include violation details when provided', () => {
      // Arrange
      const entity = { name: 'Test', age: 17 };
      const detailsFn = (e: any) => ({
        underage: true,
        requiredAge: 18,
        actualAge: e.age,
      });
      mockSpecification.isSatisfiedBy.mockReturnValue(false);
      const policy = new BusinessPolicy(
        mockSpecification,
        'UNDERAGE',
        'Person must be an adult',
        detailsFn,
      );

      // Act
      const result = policy.check(entity);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error.details).toEqual({
        underage: true,
        requiredAge: 18,
        actualAge: 17,
      });
    });
  });

  describe('and/or methods', () => {
    // Tested more thoroughly in composite-policy.spec.ts
    it('should create composite policy with AND operator', () => {
      // Arrange
      const policy1 = new BusinessPolicy(
        mockSpecification,
        'CODE1',
        'Message 1',
      );
      const policy2 = new BusinessPolicy(
        mockSpecification,
        'CODE2',
        'Message 2',
      );

      // Act
      const composite = policy1.and(policy2);

      // Assert
      expect(composite).toBeDefined();
      // We could test more properties but this is already covered in composite-policy.spec.ts
    });

    it('should create composite policy with OR operator', () => {
      // Arrange
      const policy1 = new BusinessPolicy(
        mockSpecification,
        'CODE1',
        'Message 1',
      );
      const policy2 = new BusinessPolicy(
        mockSpecification,
        'CODE2',
        'Message 2',
      );

      // Act
      const composite = policy1.or(policy2);

      // Assert
      expect(composite).toBeDefined();
      // We could test more properties but this is already covered in composite-policy.spec.ts
    });
  });

  describe('fromSpecification', () => {
    it('should create policy from specification', () => {
      // Arrange
      const code = 'INVALID';
      const message = 'Invalid entity';
      const detailsFn = (e: any) => ({ value: e.value });

      // Act
      const policy = BusinessPolicy.fromSpecification(
        mockSpecification,
        code,
        message,
        detailsFn,
      );

      // Assert
      expect(policy).toBeInstanceOf(BusinessPolicy);

      // Test that the created policy works correctly
      const entity = { value: 42 };
      mockSpecification.isSatisfiedBy.mockReturnValue(false);
      const result = policy.check(entity);

      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe(code);
      expect(result.error.message).toBe(message);
      expect(result.error.details).toEqual({ value: 42 });
    });
  });

  describe('fromValidator', () => {
    it('should create policy from validator with success result', () => {
      // Arrange
      const entity = { name: 'Valid' };
      mockValidator.validate.mockReturnValue(Result.ok(entity));

      // Act
      const policy = BusinessPolicy.fromValidator(
        mockValidator,
        'VALIDATION_ERROR',
        'Validation failed',
      );

      // Assert
      expect(policy).toBeInstanceOf(BusinessPolicy);

      const result = policy.check(entity);
      expect(result.isSuccess).toBe(true);
    });

    it('should create policy from validator with failure result', () => {
      // Arrange
      const entity = { name: '' };
      const validationErrors = [
        new ValidationError('name', 'Name is required'),
      ];
      mockValidator.validate.mockReturnValue(
        Result.fail({ errors: validationErrors }) as any,
      );

      // Act
      const policy = BusinessPolicy.fromValidator(
        mockValidator,
        'VALIDATION_ERROR',
        'Validation failed',
      );

      // Assert
      expect(policy).toBeInstanceOf(BusinessPolicy);

      const result = policy.check(entity);
      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe('VALIDATION_ERROR');
      expect(result.error.message).toBe('Validation failed');
      expect(result.error.details).toEqual({
        validationErrors: [{ property: 'name', message: 'Name is required' }],
      });
    });
  });
});
