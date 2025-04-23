// validation-facade.test.ts
import { Validation, BusinessRuleValidator, ISpecification, ValidationErrors } from '../validations';
import { Result } from '../utils';

// Create a test specification
class TestSpecification<T> implements ISpecification<T> {
  constructor(private readonly predicate: (candidate: T) => boolean) {}
  
  isSatisfiedBy(candidate: T): boolean {
    return this.predicate(candidate);
  }
  
  and(other: ISpecification<T>): ISpecification<T> {
    return new TestSpecification<T>(
      candidate => this.isSatisfiedBy(candidate) && other.isSatisfiedBy(candidate)
    );
  }
  
  or(other: ISpecification<T>): ISpecification<T> {
    return new TestSpecification<T>(
      candidate => this.isSatisfiedBy(candidate) || other.isSatisfiedBy(candidate)
    );
  }
  
  not(): ISpecification<T> {
    return new TestSpecification<T>(
      candidate => !this.isSatisfiedBy(candidate)
    );
  }
}

describe('ValidationFacade', () => {
  interface TestUser {
    name: string;
    age: number;
    email: string;
    address?: {
      street: string;
      city: string;
      zip: string;
    };
  }
  
  const validUser: TestUser = {
    name: 'John Doe',
    age: 25,
    email: 'john@example.com'
  };
  
  const invalidUser: TestUser = {
    name: '',
    age: 16,
    email: 'invalid'
  };
  
  describe('Factory methods', () => {
    it('should create a BusinessRuleValidator', () => {
      // Arrange & Act
      const validator = Validation.create<TestUser>();
      
      // Assert
      expect(validator).toBeInstanceOf(BusinessRuleValidator);
    });
    
    it('should create a validator from specification', () => {
      // Arrange
      const isAdult = new TestSpecification<TestUser>(user => user.age >= 18);
      
      // Act
      const validator = Validation.fromSpecification(isAdult, 'Must be 18 or older');
      
      // Assert
      const result = validator.validate(invalidUser);
      expect(result.isFailure).toBe(true);
      expect(result.error.errors[0].message).toBe('Must be 18 or older');
    });
  });
  
  describe('combine', () => {
    it('should combine multiple validators', () => {
      // Arrange
      const nameValidator = Validation.create<TestUser>()
        .addRule('name', user => user.name.length > 0, 'Name is required');
      
      const ageValidator = Validation.create<TestUser>()
        .addRule('age', user => user.age >= 18, 'Must be 18 or older');
      
      // Act
      const combinedValidator = Validation.combine(nameValidator, ageValidator);
      const result = combinedValidator.validate(invalidUser);
      
      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error.errors.length).toBe(2);
    });
    
    it('should pass validation when all combined validators pass', () => {
      // Arrange
      const nameValidator = Validation.create<TestUser>()
        .addRule('name', user => user.name.length > 0, 'Name is required');
      
      const ageValidator = Validation.create<TestUser>()
        .addRule('age', user => user.age >= 18, 'Must be 18 or older');
      
      // Act
      const combinedValidator = Validation.combine(nameValidator, ageValidator);
      const result = combinedValidator.validate(validUser);
      
      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe(validUser);
    });
  });
  
  describe('validateWithSpecification', () => {
    it('should validate using a specification', () => {
      // Arrange
      const isAdult = new TestSpecification<TestUser>(user => user.age >= 18);
      
      // Act
      const result = Validation.validateWithSpecification(invalidUser, isAdult, 'Must be 18 or older');
      
      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error.errors[0].message).toBe('Must be 18 or older');
    });
  });
  
  describe('validateWithRules', () => {
    it('should validate using multiple specification rules', () => {
      // Arrange
      const isAdult = new TestSpecification<TestUser>(user => user.age >= 18);
      const hasName = new TestSpecification<TestUser>(user => user.name.length > 0);
      const hasValidEmail = new TestSpecification<TestUser>(user => /^\S+@\S+\.\S+$/.test(user.email));
      
      const rules = [
        { specification: isAdult, message: 'Must be 18 or older', property: 'age' },
        { specification: hasName, message: 'Name is required', property: 'name' },
        { specification: hasValidEmail, message: 'Invalid email format', property: 'email' }
      ];
      
      // Act
      const result = Validation.validateWithRules(invalidUser, rules);
      
      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error.errors.length).toBe(3);
    });
  });
  
  describe('Converter methods', () => {
    it('should convert specification to validator', () => {
      // Arrange
      const isAdult = new TestSpecification<TestUser>(user => user.age >= 18);
      
      // Act
      const validator = Validation.specificationToValidator(isAdult, 'Must be 18 or older');
      
      // Assert
      const result = validator.validate(invalidUser);
      expect(result.isFailure).toBe(true);
      expect(result.error.errors[0].message).toBe('Must be 18 or older');
    });
    
    it('should convert validator to specification', () => {
      // Arrange
      const validator = Validation.create<TestUser>()
        .addRule('age', user => user.age >= 18, 'Must be 18 or older');
      
      // Act
      const specification = Validation.validatorToSpecification(validator);
      
      // Assert
      expect(specification.isSatisfiedBy(validUser)).toBe(true);
      expect(specification.isSatisfiedBy(invalidUser)).toBe(false);
    });
  });
  
  describe('Nested validation', () => {
    it('should validate deeply nested paths', () => {
      // Arrange
      const streetValidator = Validation.create<string>()
        .addRule('', street => street && street.length > 0, 'Street is required');
      
      const userWithAddress: TestUser = {
        ...validUser,
        address: {
          street: '',
          city: 'New York',
          zip: '12345'
        }
      };
      
      // Act
      const result = Validation.validatePath(
        userWithAddress,
        ['address', 'street'],
        streetValidator
      );
      
      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error.errors[0].property).toBe('address.street');
      expect(result.error.errors[0].message).toBe('Street is required');
    });
    
    it('should return error when path does not exist', () => {
      // Arrange
      const validator = Validation.create<any>()
        .addRule('', value => value !== undefined, 'Value is required');
      
      // Act
      const result = Validation.validatePath(
        validUser,
        ['address', 'postalCode'], // postalCode doesn't exist
        validator
      );
      
      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error.errors[0].message).toBe('Path does not exist');
    });
    
    it('should validate using forNestedPath', () => {
      // Arrange
      const zipValidator = Validation.create<string>()
        .addRule('', zip => /^\d{5}$/.test(zip), 'Invalid ZIP code');
      
      const addressValidator = Validation.forNestedPath<TestUser>(
        ['address', 'zip'], 
        zipValidator
      );
      
      const userWithInvalidZip: TestUser = {
        ...validUser,
        address: {
          street: '123 Main St',
          city: 'New York',
          zip: 'invalid'
        }
      };
      
      // Act
      const result = addressValidator.validate(userWithInvalidZip);
      
      // Assert
      expect(result.isFailure).toBe(true);
      // The error path would depend on the implementation details
    });
  });
});
