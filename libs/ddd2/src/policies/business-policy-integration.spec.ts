import { BusinessPolicy, PolicyRegistry, createPolicyFactory } from '../policies';
import { safeRun } from '../utils';
import { Specification } from '../validations';


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
  
  describe('Policy composition', () => {
    it('should combine policies using AND logic', () => {
      // Arrange
      // Use actual Specification implementation
      const adultSpec = Specification.create<User>(user => user.age >= 18);
      const activeSpec = Specification.create<User>(user => user.isActive === true);
      
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
      // Using PropertyBetweenSpecification for testing a range
      const premiumSpec = Specification.propertyBetween<User>('age', 25, Infinity);
      const activeSpec = Specification.propertyEquals<User>('isActive', true);
      
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
      // Leveraging various specification creation methods
      const adultSpec = Specification.propertyBetween<User>('age', 18, 64);
      const seniorSpec = Specification.propertyBetween<User>('age', 65, Infinity);
      const activeSpec = Specification.propertyEquals<User>('isActive', true);
      const validEmailSpec = Specification.create<User>(user => user.email.includes('@'));
      
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
      // This also tests that the real implementation's and/or methods work correctly
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
      
      // Register policies for different domains using native specifications
      userFactory.register(
        'adult',
        Specification.propertyBetween<User>('age', 18, Infinity),
        'UNDERAGE',
        'User must be at least 18 years old'
      );
      
      userFactory.register(
        'active',
        Specification.propertyEquals<User>('isActive', true),
        'INACTIVE',
        'User must be active'
      );
      
      productFactory.register(
        'validPrice',
        Specification.propertyBetween<{price: number}>('price', 0, Infinity),
        'INVALID_PRICE',
        'Product price must be positive'
      );
      
      // Act & Assert - Cross-domain policies should be isolated
      const user: User = { age: 20, email: 'test@example.com', isActive: true };
      const product = { price: 10 };
      
      // Testing policy registration and retrieval across domains
      expect(userFactory.get('adult').isSatisfiedBy(user)).toBe(true);
      expect(userFactory.get('active').isSatisfiedBy(user)).toBe(true);
      expect(productFactory.get('validPrice').isSatisfiedBy(product)).toBe(true);
      
      const [error1] = safeRun(() => userFactory.get('validPrice'));
      expect(error1).not.toBeNull();
      expect(error1?.message).toContain('not found in domain');
      
      const [error2] = safeRun(() => productFactory.get('adult'));
      expect(error2).not.toBeNull();
      expect(error2?.message).toContain('not found in domain');
    });
    
    it('should check all domain policies efficiently', () => {
      // Arrange
      const userFactory = createPolicyFactory<User>('user');
      
      // Register a dummy policy first to ensure the domain exists
      userFactory.register(
        'dummy',
        Specification.alwaysTrue<User>(),
        'DUMMY',
        'Dummy policy'
      );
      
      // Register core validation policies using the native specification API
      userFactory.register(
        'adult',
        Specification.propertyBetween<User>('age', 18, Infinity),
        'UNDERAGE',
        'User must be at least 18 years old'
      );
      
      userFactory.register(
        'active',
        Specification.propertyEquals<User>('isActive', true),
        'INACTIVE',
        'User must be active'
      );
      
      // Use create for more complex validations
      userFactory.register(
        'validEmail',
        Specification.create<User>(user => user.email.includes('@')),
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
      expect(invalidResult.error.length).toBe(3);
      
      const violations = invalidResult.error.map(v => v.code);
      expect(violations).toContain('UNDERAGE');
      expect(violations).toContain('INACTIVE');
      expect(violations).toContain('INVALID_EMAIL');
    });
  });
});
