# Specifications Pattern in DomainTS - LLM-Optimized Guide

## Document Metadata

- **Pattern Name**: Specification Pattern
- **Category**: Domain-Driven Design (DDD) Pattern
- **Purpose**: Encapsulate business rules as reusable objects
- **Library**: DomainTS
- **Language**: TypeScript
- **Version**: 1.0.0

## Pattern Overview

### What is the Specification Pattern?

The Specification Pattern is a design pattern used to encapsulate business rules in a reusable way. A specification is an object that can answer a yes/no question about another object.

**Core Concept**:

```typescript
// A specification answers: "Does this object satisfy my criteria?"
specification.isSatisfiedBy(candidate) // returns true or false
```

### Primary Use Cases

1. **Business Rule Encapsulation**: Wrap complex business logic in testable objects
2. **Query Building**: Create reusable filters for collections
3. **Validation**: Check if domain objects meet certain criteria
4. **Rule Composition**: Combine simple rules to create complex ones

### Key Benefits

- **Reusability**: Write once, use everywhere
- **Composability**: Build complex rules from simple ones
- **Testability**: Unit test business rules in isolation
- **Maintainability**: Centralize business logic
- **Expressiveness**: Create a domain-specific language

## Core Components

### 1. ISpecification Interface

**Purpose**: Define the contract for all specifications

```typescript
interface ISpecification<T> {
  // Core method - evaluates if candidate meets specification
  isSatisfiedBy(candidate: T): boolean;
  
  // Logical operators for composition
  and(other: ISpecification<T>): ISpecification<T>;
  or(other: ISpecification<T>): ISpecification<T>;
  not(): ISpecification<T>;
  
  // Optional metadata
  readonly name?: string;
  readonly description?: string;
  
  // Optional features for advanced use cases
  toExpression?(): any;
  toQueryPredicate?(): any;
  explainFailure?(candidate: T): string | null;
}
```

**Key Methods**:

- `isSatisfiedBy()`: Main evaluation method
- `and()`: Combines with another specification using AND logic
- `or()`: Combines with another specification using OR logic
- `not()`: Creates negation of the specification

### 2. CompositeSpecification Base Class

**Purpose**: Provides base implementation for specification composition

```typescript
export abstract class CompositeSpecification<T> implements ISpecification<T> {
  // Child classes must implement this method
  abstract isSatisfiedBy(candidate: T): boolean;
  
  // Pre-implemented composition methods
  and(other: ISpecification<T>): ISpecification<T> {
    return new AndSpecification<T>(this, other);
  }
  
  or(other: ISpecification<T>): ISpecification<T> {
    return new OrSpecification<T>(this, other);
  }
  
  not(): ISpecification<T> {
    return new NotSpecification<T>(this);
  }
}
```

**Usage Pattern**:

```typescript
class MySpecification extends CompositeSpecification<MyType> {
  isSatisfiedBy(candidate: MyType): boolean {
    // Implementation here
  }
}
```

### 3. Logical Operators

**Purpose**: Implement AND, OR, NOT logic for specifications

```typescript
// AND: Both specifications must be satisfied
class AndSpecification<T> extends CompositeSpecification<T> {
  constructor(
    private readonly left: ISpecification<T>,
    private readonly right: ISpecification<T>
  ) {
    super();
  }
  
  isSatisfiedBy(candidate: T): boolean {
    return this.left.isSatisfiedBy(candidate) && 
           this.right.isSatisfiedBy(candidate);
  }
}

// OR: At least one specification must be satisfied
class OrSpecification<T> extends CompositeSpecification<T> {
  constructor(
    private readonly left: ISpecification<T>,
    private readonly right: ISpecification<T>
  ) {
    super();
  }
  
  isSatisfiedBy(candidate: T): boolean {
    return this.left.isSatisfiedBy(candidate) || 
           this.right.isSatisfiedBy(candidate);
  }
}

// NOT: Specification must not be satisfied
class NotSpecification<T> extends CompositeSpecification<T> {
  constructor(private readonly spec: ISpecification<T>) {
    super();
  }
  
  isSatisfiedBy(candidate: T): boolean {
    return !this.spec.isSatisfiedBy(candidate);
  }
}
```

## Built-in Specifications

### 1. Always True/False Specifications

**Purpose**: Provide constant true/false results, useful for defaults and testing

```typescript
// Always returns true
class AlwaysTrueSpecification<T> extends CompositeSpecification<T> {
  isSatisfiedBy(_candidate: T): boolean {
    return true;
  }
}

// Always returns false
class AlwaysFalseSpecification<T> extends CompositeSpecification<T> {
  isSatisfiedBy(_candidate: T): boolean {
    return false;
  }
}

// Usage
const defaultSpec = new AlwaysTrueSpecification<User>();
```

### 2. Predicate Specification

**Purpose**: Create specifications from simple functions

```typescript
class PredicateSpecification<T> extends CompositeSpecification<T> {
  constructor(private readonly predicate: (candidate: T) => boolean) {
    super();
  }
  
  isSatisfiedBy(candidate: T): boolean {
    return this.predicate(candidate);
  }
}

// Usage example
const isAdult = new PredicateSpecification<Person>(
  person => person.age >= 18
);
```

### 3. Property-Based Specifications

**Purpose**: Common specifications for checking object properties

```typescript
// Check property equality
class PropertyEqualsSpecification<T> extends CompositeSpecification<T> {
  constructor(
    private readonly propertyName: keyof T,
    private readonly expectedValue: any
  ) {
    super();
  }
  
  isSatisfiedBy(candidate: T): boolean {
    return candidate[this.propertyName] === this.expectedValue;
  }
}

// Check if property value is in a set
class PropertyInSpecification<T> extends CompositeSpecification<T> {
  constructor(
    private readonly propertyName: keyof T,
    private readonly possibleValues: any[]
  ) {
    super();
  }
  
  isSatisfiedBy(candidate: T): boolean {
    return this.possibleValues.includes(candidate[this.propertyName]);
  }
}

// Check if property is within range
class PropertyBetweenSpecification<T> extends CompositeSpecification<T> {
  constructor(
    private readonly propertyName: keyof T,
    private readonly min: number,
    private readonly max: number
  ) {
    super();
  }
  
  isSatisfiedBy(candidate: T): boolean {
    const value = candidate[this.propertyName] as unknown as number;
    return value >= this.min && value <= this.max;
  }
}
```

## Helper Functions

**Purpose**: Provide convenient factory methods for creating specifications

```typescript
export const Specification = {
  // Create from predicate function
  create<T>(predicate: (candidate: T) => boolean): ISpecification<T> {
    return new PredicateSpecification<T>(predicate);
  },
  
  // Create property equals specification
  propertyEquals<T>(propertyName: keyof T, expectedValue: any): ISpecification<T> {
    return new PropertyEqualsSpecification<T>(propertyName, expectedValue);
  },
  
  // Create property in set specification
  propertyIn<T>(propertyName: keyof T, possibleValues: any[]): ISpecification<T> {
    return new PropertyInSpecification<T>(propertyName, possibleValues);
  },
  
  // Create property range specification
  propertyBetween<T>(propertyName: keyof T, min: number, max: number): ISpecification<T> {
    return new PropertyBetweenSpecification<T>(propertyName, min, max);
  },
  
  // Combine specifications with AND
  and<T>(...specifications: ISpecification<T>[]): ISpecification<T> {
    if (specifications.length === 0) return new AlwaysTrueSpecification<T>();
    
    let result = specifications[0];
    for (let i = 1; i < specifications.length; i++) {
      result = new AndSpecification<T>(result, specifications[i]);
    }
    return result;
  },
  
  // Combine specifications with OR
  or<T>(...specifications: ISpecification<T>[]): ISpecification<T> {
    if (specifications.length === 0) return new AlwaysFalseSpecification<T>();
    
    let result = specifications[0];
    for (let i = 1; i < specifications.length; i++) {
      result = new OrSpecification<T>(result, specifications[i]);
    }
    return result;
  },
  
  // Negate specification
  not<T>(specification: ISpecification<T>): ISpecification<T> {
    return new NotSpecification<T>(specification);
  }
};
```

## Integration with Validation

**Purpose**: Use specifications for domain object validation

```typescript
class SpecificationValidator<T> implements IValidator<T> {
  private validationRules: Array<{
    specification: ISpecification<T>;
    message: string;
    property?: string;
    context?: Record<string, any>;
  }> = [];
  
  // Add validation rule
  addRule(
    specification: ISpecification<T>,
    message: string,
    property?: string,
    context?: Record<string, any>
  ): SpecificationValidator<T> {
    this.validationRules.push({
      specification,
      message,
      property,
      context
    });
    return this;
  }
  
  // Validate object against all rules
  validate(value: T): Result<T, ValidationErrors> {
    const errors: ValidationError[] = [];
    
    for (const rule of this.validationRules) {
      if (!rule.specification.isSatisfiedBy(value)) {
        errors.push(
          new ValidationError(rule.property || '', rule.message, rule.context)
        );
      }
    }
    
    if (errors.length > 0) {
      return Result.fail(new ValidationErrors(errors));
    }
    
    return Result.ok(value);
  }
}
```

## Domain Example: E-Commerce System

### Domain Models

```typescript
// Customer entity
class Customer {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly age: number,
    public readonly totalSpent: number,
    public readonly registrationDate: Date,
    public readonly isPremium: boolean,
    public readonly isVerified: boolean
  ) {}
}

// Order aggregate
class Order {
  constructor(
    public readonly id: string,
    public readonly customerId: string,
    public readonly items: OrderItem[],
    public readonly totalAmount: number,
    public readonly status: OrderStatus,
    public readonly createdAt: Date
  ) {}
}

// Order item value object
class OrderItem {
  constructor(
    public readonly productId: string,
    public readonly quantity: number,
    public readonly unitPrice: number
  ) {}
}

type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
```

### Business Rule Specifications

```typescript
// Customer must be adult (18+)
class AdultCustomerSpecification extends CompositeSpecification<Customer> {
  isSatisfiedBy(customer: Customer): boolean {
    return customer.age >= 18;
  }
}

// Customer must be verified
class VerifiedCustomerSpecification extends CompositeSpecification<Customer> {
  isSatisfiedBy(customer: Customer): boolean {
    return customer.isVerified;
  }
}

// Customer is high-value (spent over $1000)
class HighValueCustomerSpecification extends CompositeSpecification<Customer> {
  constructor(private readonly threshold: number = 1000) {
    super();
  }
  
  isSatisfiedBy(customer: Customer): boolean {
    return customer.totalSpent > this.threshold;
  }
}

// Order is eligible for free shipping
class FreeShippingEligibleSpecification extends CompositeSpecification<Order> {
  constructor(private readonly minimumAmount: number = 50) {
    super();
  }
  
  isSatisfiedBy(order: Order): boolean {
    return order.totalAmount >= this.minimumAmount;
  }
}

// Complex specification: VIP customer eligibility
class VIPCustomerSpecification extends CompositeSpecification<Customer> {
  private readonly specification: ISpecification<Customer>;
  
  constructor() {
    super();
    
    // VIP if: (high-value OR premium) AND verified AND adult
    const highValue = new HighValueCustomerSpecification(5000);
    const isPremium = Specification.propertyEquals<Customer>('isPremium', true);
    const isVerified = new VerifiedCustomerSpecification();
    const isAdult = new AdultCustomerSpecification();
    
    this.specification = Specification.and(
      highValue.or(isPremium),
      isVerified,
      isAdult
    );
  }
  
  isSatisfiedBy(customer: Customer): boolean {
    return this.specification.isSatisfiedBy(customer);
  }
}
```

### Using Specifications in Domain Services

```typescript
class OrderService {
  private readonly freeShippingSpec = new FreeShippingEligibleSpecification();
  private readonly vipCustomerSpec = new VIPCustomerSpecification();
  
  calculateShippingCost(order: Order, customer: Customer): number {
    // VIP customers always get free shipping
    if (this.vipCustomerSpec.isSatisfiedBy(customer)) {
      return 0;
    }
    
    // Regular customers get free shipping on orders over threshold
    if (this.freeShippingSpec.isSatisfiedBy(order)) {
      return 0;
    }
    
    // Standard shipping cost
    return 9.99;
  }
  
  canCustomerAccessVIPDeals(customer: Customer): boolean {
    return this.vipCustomerSpec.isSatisfiedBy(customer);
  }
}
```

### Repository Integration

```typescript
class CustomerRepository {
  private customers: Customer[] = [];
  
  // Find customers matching specification
  findBySpecification(spec: ISpecification<Customer>): Customer[] {
    return this.customers.filter(customer => spec.isSatisfiedBy(customer));
  }
  
  // Find all VIP customers
  findVIPCustomers(): Customer[] {
    const vipSpec = new VIPCustomerSpecification();
    return this.findBySpecification(vipSpec);
  }
  
  // Find customers eligible for promotion
  findPromotionEligible(): Customer[] {
    const spec = Specification.and(
      new HighValueCustomerSpecification(1000),
      new VerifiedCustomerSpecification(),
      Specification.create<Customer>(c => {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        return c.registrationDate < sixMonthsAgo;
      })
    );
    
    return this.findBySpecification(spec);
  }
}
```

## Advanced Usage Patterns

### 1. Specification with Explanation

```typescript
class DetailedVIPSpecification extends CompositeSpecification<Customer> {
  private readonly highValueSpec = new HighValueCustomerSpecification(5000);
  private readonly premiumSpec = Specification.propertyEquals<Customer>('isPremium', true);
  private readonly verifiedSpec = new VerifiedCustomerSpecification();
  private readonly adultSpec = new AdultCustomerSpecification();
  
  isSatisfiedBy(customer: Customer): boolean {
    if (!this.adultSpec.isSatisfiedBy(customer)) return false;
    if (!this.verifiedSpec.isSatisfiedBy(customer)) return false;
    
    return this.highValueSpec.isSatisfiedBy(customer) || 
           this.premiumSpec.isSatisfiedBy(customer);
  }
  
  explainFailure(customer: Customer): string | null {
    if (this.isSatisfiedBy(customer)) return null;
    
    const reasons: string[] = [];
    
    if (!this.adultSpec.isSatisfiedBy(customer)) {
      reasons.push('Customer must be 18 or older');
    }
    
    if (!this.verifiedSpec.isSatisfiedBy(customer)) {
      reasons.push('Customer must be verified');
    }
    
    if (!this.highValueSpec.isSatisfiedBy(customer) && 
        !this.premiumSpec.isSatisfiedBy(customer)) {
      reasons.push('Customer must have spent over $5000 or have premium status');
    }
    
    return reasons.join('; ');
  }
}
```

### 2. Database Query Translation

```typescript
class HighValueCustomerSpecification extends CompositeSpecification<Customer> {
  constructor(private readonly threshold: number = 1000) {
    super();
  }
  
  isSatisfiedBy(customer: Customer): boolean {
    return customer.totalSpent > this.threshold;
  }
  
  // Convert to SQL WHERE clause
  toSqlWhere(): string {
    return `total_spent > ${this.threshold}`;
  }
  
  // Convert to MongoDB query
  toMongoQuery(): object {
    return { totalSpent: { $gt: this.threshold } };
  }
  
  // Convert to ORM query builder
  toQueryBuilder(qb: any): any {
    return qb.where('totalSpent', '>', this.threshold);
  }
}
```

### 3. Specification Factory Pattern

```typescript
class SpecificationFactory {
  static createCustomerEligibilitySpec(criteria: {
    requireAdult?: boolean;
    requireVerified?: boolean;
    minSpent?: number;
    requirePremium?: boolean;
  }): ISpecification<Customer> {
    const specs: ISpecification<Customer>[] = [];
    
    if (criteria.requireAdult) {
      specs.push(new AdultCustomerSpecification());
    }
    
    if (criteria.requireVerified) {
      specs.push(new VerifiedCustomerSpecification());
    }
    
    if (criteria.minSpent !== undefined) {
      specs.push(new HighValueCustomerSpecification(criteria.minSpent));
    }
    
    if (criteria.requirePremium) {
      specs.push(Specification.propertyEquals<Customer>('isPremium', true));
    }
    
    return specs.length > 0 
      ? Specification.and(...specs)
      : new AlwaysTrueSpecification<Customer>();
  }
}

// Usage
const eligibilitySpec = SpecificationFactory.createCustomerEligibilitySpec({
  requireAdult: true,
  requireVerified: true,
  minSpent: 500
});
```

## Testing Specifications

```typescript
describe('VIPCustomerSpecification', () => {
  let spec: VIPCustomerSpecification;
  
  beforeEach(() => {
    spec = new VIPCustomerSpecification();
  });
  
  it('should accept high-value verified adult customer', () => {
    const customer = new Customer(
      '1',
      'test@example.com',
      25,
      6000, // high value
      new Date(),
      false,
      true // verified
    );
    
    expect(spec.isSatisfiedBy(customer)).toBe(true);
  });
  
  it('should accept premium verified adult customer', () => {
    const customer = new Customer(
      '2',
      'test@example.com',
      30,
      100, // low spend
      new Date(),
      true, // premium
      true // verified
    );
    
    expect(spec.isSatisfiedBy(customer)).toBe(true);
  });
  
  it('should reject unverified customer', () => {
    const customer = new Customer(
      '3',
      'test@example.com',
      25,
      6000,
      new Date(),
      true,
      false // not verified
    );
    
    expect(spec.isSatisfiedBy(customer)).toBe(false);
  });
  
  it('should reject minor customer', () => {
    const customer = new Customer(
      '4',
      'test@example.com',
      16, // minor
      6000,
      new Date(),
      true,
      true
    );
    
    expect(spec.isSatisfiedBy(customer)).toBe(false);
  });
});
```

## Performance Considerations

### 1. Caching Results

```typescript
class CachedSpecification<T> extends CompositeSpecification<T> {
  private cache = new Map<T, boolean>();
  
  constructor(private readonly innerSpec: ISpecification<T>) {
    super();
  }
  
  isSatisfiedBy(candidate: T): boolean {
    if (this.cache.has(candidate)) {
      return this.cache.get(candidate)!;
    }
    
    const result = this.innerSpec.isSatisfiedBy(candidate);
    this.cache.set(candidate, result);
    return result;
  }
  
  clearCache(): void {
    this.cache.clear();
  }
}
```

### 2. Lazy Evaluation

```typescript
class LazyAndSpecification<T> extends CompositeSpecification<T> {
  constructor(
    private readonly left: ISpecification<T>,
    private readonly right: ISpecification<T>
  ) {
    super();
  }
  
  isSatisfiedBy(candidate: T): boolean {
    // Short-circuit evaluation
    if (!this.left.isSatisfiedBy(candidate)) {
      return false; // Don't evaluate right side
    }
    return this.right.isSatisfiedBy(candidate);
  }
}
```

## Best Practices Summary

1. **Single Responsibility**: Each specification should check one business rule
2. **Immutability**: Specifications should not have mutable state
3. **Composition Over Complexity**: Build complex rules from simple ones
4. **Clear Naming**: Use descriptive names that express the business rule
5. **Testability**: Write unit tests for each specification
6. **Performance**: Consider caching and lazy evaluation for complex specs
7. **Domain Focus**: Keep specifications focused on domain logic
8. **Reusability**: Design specifications to be reused across the domain

## Conclusion

The Specification Pattern in DomainTS provides a powerful, flexible way to encapsulate business rules. By representing rules as objects, you gain:

- **Clarity**: Business rules are explicit and named
- **Flexibility**: Rules can be combined and reused
- **Testability**: Rules can be tested in isolation
- **Maintainability**: Rules are centralized and easy to modify
- **Expressiveness**: Code reads like business language

This pattern is essential for implementing complex domain logic in a maintainable, scalable way.

---

# Validation in DomainTS - LLM-Optimized Guide

## Document Metadata

- **Pattern Name**: Domain Validation
- **Category**: Domain-Driven Design (DDD) Pattern
- **Purpose**: Enforce business rules and ensure domain object integrity
- **Library**: DomainTS
- **Language**: TypeScript
- **Version**: 1.0.0

## Pattern Overview

### What is Domain Validation?

Domain Validation ensures that domain objects always exist in a valid state according to business rules. Unlike simple data validation (checking if a field is not empty), domain validation enforces complex business rules that may involve multiple properties or even external conditions.

**Core Concept**:

```typescript
// Domain validation answers: "Is this object valid according to business rules?"
validator.validate(domainObject) // returns Result<T, ValidationErrors>
```

### Primary Use Cases

1. **Aggregate Validation**: Ensure aggregates maintain invariants
2. **Value Object Creation**: Validate data before creating value objects
3. **Command Validation**: Check if commands can be executed
4. **Business Rule Enforcement**: Apply complex domain rules
5. **Multi-property Validation**: Rules that span multiple fields

### Key Benefits

- **Centralized Rules**: All validation logic in one place
- **Reusability**: Share validation rules across the domain
- **Composability**: Build complex validations from simple rules
- **Type Safety**: Full TypeScript support with generics
- **Integration**: Works seamlessly with Specifications

## Core Components

### 1. IValidator Interface

**Purpose**: Define the contract for all validators

```typescript
interface IValidator<T> {
  // Validates a value and returns a Result
  validate(value: T): Result<T, ValidationErrors>;
}
```

**Key Concepts**:

- Uses the Result pattern for error handling
- Returns the validated object on success
- Returns ValidationErrors on failure

### 2. ValidationError and ValidationErrors

**Purpose**: Represent validation failures

```typescript
class ValidationError {
  constructor(
    public readonly property: string,    // Which property failed
    public readonly message: string,     // Error message
    public readonly context?: Record<string, any>  // Additional data
  ) {}
}

class ValidationErrors extends Error {
  constructor(public readonly errors: ValidationError[]) {
    super(`Validation failed with ${errors.length} error(s)`);
  }
}
```

**Usage Pattern**:

```typescript
// Single error
const error = new ValidationError('email', 'Invalid email format');

// Multiple errors
const errors = new ValidationErrors([
  new ValidationError('email', 'Invalid email format'),
  new ValidationError('age', 'Must be 18 or older')
]);
```

### 3. BusinessRuleValidator

**Purpose**: Primary validator for enforcing business rules

```typescript
class BusinessRuleValidator<T> implements IValidator<T> {
  // Add a simple validation rule
  addRule(
    property: string,
    predicate: (value: T) => boolean,
    message: string
  ): BusinessRuleValidator<T>;
  
  // Add specification-based validation
  mustSatisfy(
    specification: ISpecification<T>,
    message: string
  ): BusinessRuleValidator<T>;
  
  // Conditional validation
  when(
    condition: (value: T) => boolean,
    thenRules: (validator: BusinessRuleValidator<T>) => void
  ): BusinessRuleValidator<T>;
  
  // Validate nested objects
  addNested<P>(
    property: string,
    validator: IValidator<P>,
    getValue: (obj: T) => P
  ): BusinessRuleValidator<T>;
}
```

### 4. Rules Registry and Core Rules

**Purpose**: Provide reusable validation rules

```typescript
interface ICoreRules {
  // Basic validations
  required<T>(property: keyof T, message?: string): RuleFunction<T>;
  minLength<T>(property: keyof T, length: number, message?: string): RuleFunction<T>;
  maxLength<T>(property: keyof T, length: number, message?: string): RuleFunction<T>;
  pattern<T>(property: keyof T, regex: RegExp, message?: string): RuleFunction<T>;
  range<T>(property: keyof T, min: number, max: number, message?: string): RuleFunction<T>;
  email<T>(property: keyof T, message?: string): RuleFunction<T>;
  
  // Specification integration
  satisfies<T>(specification: ISpecification<T>, message: string): RuleFunction<T>;
  
  // Conditional rules
  when<T>(
    condition: (value: T) => boolean,
    thenRules: (validator: BusinessRuleValidator<T>) => void
  ): RuleFunction<T>;
}
```

## Basic Usage Examples

### 1. Simple Property Validation

```typescript
// Domain model
class Customer {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly age: number,
    public readonly name: string
  ) {}
}

// Create validator
const customerValidator = BusinessRuleValidator.create<Customer>()
  .addRule('email', 
    customer => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email),
    'Invalid email format'
  )
  .addRule('age',
    customer => customer.age >= 18,
    'Customer must be 18 or older'
  )
  .addRule('name',
    customer => customer.name.length >= 2,
    'Name must be at least 2 characters'
  );

// Validate
const customer = new Customer('1', 'invalid-email', 16, 'A');
const result = customerValidator.validate(customer);

if (result.isFailure()) {
  console.log('Validation errors:', result.error.errors);
  // Output: 
  // - email: Invalid email format
  // - age: Customer must be 18 or older
  // - name: Name must be at least 2 characters
}
```

### 2. Using Core Rules

```typescript
const Rules = RulesRegistry.Rules;

const customerValidator = BusinessRuleValidator.create<Customer>()
  .apply(Rules.required('email'))
  .apply(Rules.email('email'))
  .apply(Rules.minLength('name', 2))
  .apply(Rules.range('age', 18, 120, 'Age must be between 18 and 120'));

// More concise with chaining
const orderValidator = BusinessRuleValidator.create<Order>()
  .apply(Rules.required('customerId'))
  .apply(Rules.required('items'))
  .apply(Rules.minLength('items', 1, 'Order must have at least one item'))
  .apply(Rules.range('totalAmount', 0.01, 999999.99));
```

### 3. Specification Integration

```typescript
// Define specifications
class PremiumCustomerSpecification extends CompositeSpecification<Customer> {
  isSatisfiedBy(customer: Customer): boolean {
    return customer.totalPurchases > 1000 || customer.membershipLevel === 'gold';
  }
}

class ValidShippingAddressSpecification extends CompositeSpecification<Address> {
  isSatisfiedBy(address: Address): boolean {
    return address.street.length > 0 && 
           address.city.length > 0 && 
           address.postalCode.match(/^\d{5}$/) !== null;
  }
}

// Use specifications in validation
const orderValidator = BusinessRuleValidator.create<Order>()
  .mustSatisfy(
    new ValidOrderSpecification(),
    'Order must be in a valid state'
  )
  .propertyMustSatisfy(
    'shippingAddress',
    new ValidShippingAddressSpecification(),
    'Shipping address is invalid',
    order => order.shippingAddress
  );
```

### 4. Conditional Validation

```typescript
const customerValidator = BusinessRuleValidator.create<Customer>()
  .when(
    customer => customer.country === 'US',
    validator => validator
      .addRule('state', 
        customer => customer.state !== undefined,
        'State is required for US customers'
      )
      .addRule('zipCode',
        customer => /^\d{5}(-\d{4})?$/.test(customer.zipCode),
        'Invalid US zip code format'
      )
  )
  .when(
    customer => customer.country === 'UK',
    validator => validator
      .addRule('postcode',
        customer => /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i.test(customer.postcode),
        'Invalid UK postcode format'
      )
  )
  .otherwise(
    validator => validator
      .addRule('region',
        customer => customer.region !== undefined,
        'Region is required for non-US/UK customers'
      )
  );
```

### 5. Nested Object Validation

```typescript
// Domain models
class OrderItem {
  constructor(
    public readonly productId: string,
    public readonly quantity: number,
    public readonly price: number
  ) {}
}

class Order {
  constructor(
    public readonly id: string,
    public readonly items: OrderItem[],
    public readonly shippingAddress: Address,
    public readonly billingAddress: Address
  ) {}
}

// Validators for nested objects
const orderItemValidator = BusinessRuleValidator.create<OrderItem>()
  .apply(Rules.required('productId'))
  .apply(Rules.range('quantity', 1, 100))
  .apply(Rules.range('price', 0.01, 999999.99));

const addressValidator = BusinessRuleValidator.create<Address>()
  .apply(Rules.required('street'))
  .apply(Rules.required('city'))
  .apply(Rules.required('postalCode'))
  .apply(Rules.pattern('postalCode', /^\d{5}$/, 'Invalid postal code'));

// Main validator with nested validation
const orderValidator = BusinessRuleValidator.create<Order>()
  .apply(Rules.required('id'))
  .addCollection('items', orderItemValidator)
  .addNested('shippingAddress', addressValidator, order => order.shippingAddress)
  .addNested('billingAddress', addressValidator, order => order.billingAddress);
```

## Advanced Validation Patterns

### 1. Cross-Property Validation

```typescript
const dateRangeValidator = BusinessRuleValidator.create<DateRange>()
  .addRule('',  // Empty property means validate entire object
    range => range.startDate <= range.endDate,
    'Start date must be before end date'
  );

const orderValidator = BusinessRuleValidator.create<Order>()
  .addRule('',
    order => order.items.reduce((sum, item) => sum + item.price * item.quantity, 0) === order.totalAmount,
    'Total amount does not match sum of items'
  );
```

### 2. Async Validation (external dependencies)

```typescript
class AsyncOrderValidator implements IValidator<Order> {
  constructor(
    private readonly customerRepository: CustomerRepository,
    private readonly productRepository: ProductRepository
  ) {}
  
  async validate(order: Order): Promise<Result<Order, ValidationErrors>> {
    const errors: ValidationError[] = [];
    
    // Check if customer exists
    const customer = await this.customerRepository.findById(order.customerId);
    if (!customer) {
      errors.push(new ValidationError('customerId', 'Customer does not exist'));
    }
    
    // Check if all products exist and are available
    for (const item of order.items) {
      const product = await this.productRepository.findById(item.productId);
      if (!product) {
        errors.push(new ValidationError(
          `items.${item.productId}`,
          `Product ${item.productId} does not exist`
        ));
      } else if (product.stock < item.quantity) {
        errors.push(new ValidationError(
          `items.${item.productId}`,
          `Insufficient stock for product ${item.productId}`
        ));
      }
    }
    
    if (errors.length > 0) {
      return Result.fail(new ValidationErrors(errors));
    }
    
    return Result.ok(order);
  }
}
```

### 3. Domain-Specific Rule Providers

```typescript
// Define domain-specific rules
interface IEcommerceRules extends IRulesProvider {
  validSku<T>(property: keyof T, message?: string): RuleFunction<T>;
  validCreditCard<T>(property: keyof T, message?: string): RuleFunction<T>;
  validShippingMethod<T>(property: keyof T, allowedMethods: string[], message?: string): RuleFunction<T>;
}

class EcommerceRules implements IEcommerceRules {
  readonly name = 'ecommerce';
  
  validSku<T>(property: keyof T, message = 'Invalid SKU format'): RuleFunction<T> {
    return (validator) => validator.addRule(
      property as string,
      value => /^[A-Z]{3}-\d{4}-[A-Z]{2}$/.test(String(value[property])),
      message
    );
  }
  
  validCreditCard<T>(property: keyof T, message = 'Invalid credit card number'): RuleFunction<T> {
    return (validator) => validator.addRule(
      property as string,
      value => this.validateCreditCard(String(value[property])),
      message
    );
  }
  
  validShippingMethod<T>(
    property: keyof T, 
    allowedMethods: string[], 
    message = 'Invalid shipping method'
  ): RuleFunction<T> {
    return (validator) => validator.addRule(
      property as string,
      value => allowedMethods.includes(String(value[property])),
      message
    );
  }
  
  private validateCreditCard(cardNumber: string): boolean {
    // Luhn algorithm implementation
    const digits = cardNumber.replace(/\D/g, '');
    if (digits.length !== 16) return false;
    
    let sum = 0;
    let isEven = false;
    
    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits[i], 10);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  }
}

// Register domain rules
RulesRegistry.register(new EcommerceRules());

// Use domain rules
const ecommerceRules = RulesRegistry.forDomain<IEcommerceRules>('ecommerce');

const productValidator = BusinessRuleValidator.create<Product>()
  .apply(ecommerceRules.validSku('sku'))
  .apply(Rules.required('name'))
  .apply(Rules.range('price', 0.01, 999999.99));
```

### 4. Validation Facade Usage

```typescript
// Simple validation
const emailResult = Validation.validateWithSpecification(
  'invalid-email',
  new EmailSpecification(),
  'Invalid email format'
);

// Multiple rules validation
const customerResult = Validation.validateWithRules(customer, [
  {
    specification: new AdultCustomerSpecification(),
    message: 'Customer must be 18 or older',
    property: 'age'
  },
  {
    specification: new ValidEmailSpecification(),
    message: 'Invalid email format',
    property: 'email'
  }
]);

// Combine validators
const combinedValidator = Validation.combine(
  customerValidator,
  addressValidator,
  paymentValidator
);

// Validate nested path
const pathResult = Validation.validatePath(
  order,
  ['shippingAddress', 'postalCode'],
  postalCodeValidator
);
```

## Domain Example: Order Processing System

### Domain Models

```typescript
// Value Objects
class Money {
  constructor(
    public readonly amount: number,
    public readonly currency: string
  ) {}
  
  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error('Cannot add money with different currencies');
    }
    return new Money(this.amount + other.amount, this.currency);
  }
}

class Address {
  constructor(
    public readonly street: string,
    public readonly city: string,
    public readonly state: string,
    public readonly postalCode: string,
    public readonly country: string
  ) {}
}

// Entities
class OrderItem {
  constructor(
    public readonly productId: string,
    public readonly productName: string,
    public readonly quantity: number,
    public readonly unitPrice: Money,
    public readonly discount: number = 0
  ) {}
  
  get totalPrice(): Money {
    const discountedAmount = this.unitPrice.amount * (1 - this.discount / 100);
    return new Money(
      discountedAmount * this.quantity,
      this.unitPrice.currency
    );
  }
}

// Aggregate
class Order {
  constructor(
    public readonly id: string,
    public readonly customerId: string,
    public readonly items: OrderItem[],
    public readonly shippingAddress: Address,
    public readonly billingAddress: Address,
    public readonly shippingMethod: string,
    public readonly paymentMethod: string,
    public readonly status: OrderStatus = 'pending'
  ) {}
  
  get totalAmount(): Money {
    return this.items.reduce(
      (sum, item) => sum.add(item.totalPrice),
      new Money(0, 'USD')
    );
  }
}

type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
```

### Validation Implementation

```typescript
// Money validator
const moneyValidator = BusinessRuleValidator.create<Money>()
  .apply(Rules.range('amount', 0, 999999.99, 'Amount must be between 0 and 999,999.99'))
  .apply(Rules.pattern('currency', /^[A-Z]{3}$/, 'Currency must be a 3-letter code'));

// Address validator
const addressValidator = BusinessRuleValidator.create<Address>()
  .apply(Rules.required('street'))
  .apply(Rules.minLength('street', 5))
  .apply(Rules.required('city'))
  .apply(Rules.minLength('city', 2))
  .apply(Rules.required('postalCode'))
  .when(
    address => address.country === 'US',
    validator => validator
      .apply(Rules.pattern('postalCode', /^\d{5}(-\d{4})?$/, 'Invalid US postal code'))
      .apply(Rules.required('state'))
      .apply(Rules.pattern('state', /^[A-Z]{2}$/, 'State must be 2-letter code'))
  )
  .when(
    address => address.country === 'CA',
    validator => validator
      .apply(Rules.pattern('postalCode', /^[A-Z]\d[A-Z] \d[A-Z]\d$/, 'Invalid Canadian postal code'))
      .apply(Rules.required('state'))
  );

// Order item validator
const orderItemValidator = BusinessRuleValidator.create<OrderItem>()
  .apply(Rules.required('productId'))
  .apply(Rules.required('productName'))
  .apply(Rules.range('quantity', 1, 100, 'Quantity must be between 1 and 100'))
  .apply(Rules.range('discount', 0, 100, 'Discount must be between 0 and 100'))
  .addNested('unitPrice', moneyValidator, item => item.unitPrice);

// Complex order validator
const orderValidator = BusinessRuleValidator.create<Order>()
  .apply(Rules.required('id'))
  .apply(Rules.required('customerId'))
  .apply(Rules.minLength('items', 1, 'Order must have at least one item'))
  .apply(Rules.propertyIn('shippingMethod', ['standard', 'express', 'overnight']))
  .apply(Rules.propertyIn('paymentMethod', ['credit_card', 'paypal', 'bank_transfer']))
  .addCollection('items', orderItemValidator)
  .addNested('shippingAddress', addressValidator, order => order.shippingAddress)
  .addNested('billingAddress', addressValidator, order => order.billingAddress)
  .addRule('',
    order => {
      const itemsTotal = order.items.reduce(
        (sum, item) => sum + item.totalPrice.amount,
        0
      );
      return Math.abs(itemsTotal - order.totalAmount.amount) < 0.01;
    },
    'Order total does not match sum of items'
  );

// Order placement validator with business rules
const orderPlacementValidator = BusinessRuleValidator.create<Order>()
  .apply(orderValidator) // Include basic validation
  .when(
    order => order.shippingMethod === 'overnight',
    validator => validator.addRule('',
      order => order.totalAmount.amount >= 100,
      'Overnight shipping requires minimum order of $100'
    )
  )
  .when(
    order => order.paymentMethod === 'credit_card',
    validator => validator.apply(Rules.required('creditCardToken'))
  )
  .mustSatisfy(
    new OrderCanBePlacedSpecification(),
    'Order cannot be placed due to business constraints'
  );
```

### Using Validation in Domain Services

```typescript
class OrderService {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly customerRepository: CustomerRepository,
    private readonly inventoryService: InventoryService
  ) {}
  
  async placeOrder(order: Order): Promise<Result<Order, Error>> {
    // Validate order
    const validationResult = orderPlacementValidator.validate(order);
    if (validationResult.isFailure()) {
      return Result.fail(new Error(
        `Order validation failed: ${validationResult.error.message}`
      ));
    }
    
    // Additional async validations
    const asyncValidator = new AsyncOrderValidator(
      this.customerRepository,
      this.inventoryService
    );
    
    const asyncResult = await asyncValidator.validate(order);
    if (asyncResult.isFailure()) {
      return Result.fail(new Error(
        `Order validation failed: ${asyncResult.error.message}`
      ));
    }
    
    // Process order...
    return Result.ok(order);
  }
}
```

## Testing Validators

```typescript
describe('OrderValidator', () => {
  let validator: BusinessRuleValidator<Order>;
  
  beforeEach(() => {
    validator = createOrderValidator(); // Your validator factory
  });
  
  it('should validate valid order', () => {
    const order = createValidOrder(); // Helper to create valid order
    const result = validator.validate(order);
    
    expect(result.isSuccess()).toBe(true);
  });
  
  it('should reject order without items', () => {
    const order = createOrderWithoutItems();
    const result = validator.validate(order);
    
    expect(result.isFailure()).toBe(true);
    expect(result.error.errors).toContainEqual(
      expect.objectContaining({
        property: 'items',
        message: 'Order must have at least one item'
      })
    );
  });
  
  it('should validate US address correctly', () => {
    const orderWithUSAddress = createOrderWithAddress({
      country: 'US',
      state: 'CA',
      postalCode: '90210'
    });
    
    const result = validator.validate(orderWithUSAddress);
    expect(result.isSuccess()).toBe(true);
  });
  
  it('should reject invalid US postal code', () => {
    const orderWithInvalidZip = createOrderWithAddress({
      country: 'US',
      state: 'CA',
      postalCode: 'INVALID'
    });
    
    const result = validator.validate(orderWithInvalidZip);
    expect(result.isFailure()).toBe(true);
    expect(result.error.errors).toContainEqual(
      expect.objectContaining({
        property: 'shippingAddress.postalCode',
        message: 'Invalid US postal code'
      })
    );
  });
});
```

## Best Practices

### 1. Separate Validation Concerns

```typescript
// Bad - mixing UI and domain validation
class UserValidator {
  validate(user: User) {
    if (!user.email) return 'Email is required'; // UI concern
    if (user.age < 18) return 'Must be adult'; // Domain concern
  }
}

// Good - separate validators
const uiValidator = BusinessRuleValidator.create<UserForm>()
  .apply(Rules.required('email'));

const domainValidator = BusinessRuleValidator.create<User>()
  .mustSatisfy(new AdultUserSpecification(), 'User must be adult');
```

### 2. Use Specifications for Complex Rules

```typescript
// Bad - complex logic in validator
const validator = BusinessRuleValidator.create<Order>()
  .addRule('', order => {
    if (order.customer.type === 'premium') {
      if (order.total > 1000) return true;
      if (order.items.length > 5) return true;
      return false;
    }
    return order.total > 2000;
  }, 'Order does not meet requirements');

// Good - use specification
const validator = BusinessRuleValidator.create<Order>()
  .mustSatisfy(
    new OrderEligibleForDiscountSpecification(),
    'Order is not eligible for discount'
  );
```

### 3. Create Reusable Validators

```typescript
// Create validator factories
function createMoneyValidator(maxAmount: number = 999999.99): IValidator<Money> {
  return BusinessRuleValidator.create<Money>()
    .apply(Rules.range('amount', 0, maxAmount))
    .apply(Rules.pattern('currency', /^[A-Z]{3}$/));
}

// Compose validators
const orderValidator = BusinessRuleValidator.create<Order>()
  .addNested('totalAmount', createMoneyValidator(), order => order.totalAmount)
  .addNested('shippingCost', createMoneyValidator(1000), order => order.shippingCost);
```

### 4. Provide Clear Error Messages

```typescript
// Bad - generic messages
.addRule('email', customer => isValidEmail(customer.email), 'Invalid value');

// Good - specific messages
.addRule('email', 
  customer => isValidEmail(customer.email), 
  'Email must be in format: user@domain.com'
);

// Better - context-aware messages
.addRule('creditLimit',
  customer => customer.creditLimit <= calculateMaxCredit(customer),
  customer => `Credit limit cannot exceed ${calculateMaxCredit(customer)} based on credit score`
);
```

### 5. Handle Validation at Boundaries

```typescript
// Validate at aggregate creation
class Order extends Aggregate {
  static create(props: OrderProps): Result<Order, ValidationErrors> {
    const validationResult = orderValidator.validate(props);
    if (validationResult.isFailure()) {
      return Result.fail(validationResult.error);
    }
    
    return Result.ok(new Order(props));
  }
}

// Validate at application service
class OrderApplicationService {
  async createOrder(command: CreateOrderCommand): Promise<Result<OrderDto, Error>> {
    const validationResult = createOrderCommandValidator.validate(command);
    if (validationResult.isFailure()) {
      return Result.fail(validationResult.error);
    }
    
    // Proceed with order creation...
  }
}
```

## Performance Considerations

### 1. Lazy Validation

```typescript
class LazyValidator<T> implements IValidator<T> {
  constructor(
    private readonly rules: Array<(value: T) => ValidationError | null>
  ) {}
  
  validate(value: T): Result<T, ValidationErrors> {
    const errors: ValidationError[] = [];
    
    // Stop at first error if needed
    for (const rule of this.rules) {
      const error = rule(value);
      if (error) {
        errors.push(error);
        // Optionally break here for fail-fast behavior
      }
    }
    
    return errors.length > 0 
      ? Result.fail(new ValidationErrors(errors))
      : Result.ok(value);
  }
}
```

### 2. Cached Validation Results

```typescript
class CachedValidator<T> implements IValidator<T> {
  private cache = new WeakMap<T, Result<T, ValidationErrors>>();
  
  constructor(private readonly innerValidator: IValidator<T>) {}
  
  validate(value: T): Result<T, ValidationErrors> {
    if (this.cache.has(value)) {
      return this.cache.get(value)!;
    }
    
    const result = this.innerValidator.validate(value);
    this.cache.set(value, result);
    return result;
  }
}
```

## Conclusion

The Validation system in DomainTS provides:

- **Type-safe validation**: Full TypeScript support
- **Business rule enforcement**: Not just data validation
- **Composability**: Build complex validations from simple rules
- **Integration**: Works seamlessly with Specifications
- **Flexibility**: Multiple validation styles and patterns
- **Reusability**: Share validation logic across the domain

This comprehensive validation system ensures your domain objects always maintain their invariants and business rules, providing a solid foundation for building robust domain models.

---

# Business Rules in DomainTS - LLM-Optimized Guide

## Document Metadata

- **Pattern Name**: Business Rules Pattern
- **Category**: Domain-Driven Design (DDD) Pattern
- **Purpose**: Encapsulate and enforce domain-specific business logic
- **Library**: DomainTS
- **Language**: TypeScript
- **Version**: 1.0.0

## Pattern Overview

### What are Business Rules?

Business Rules are the core logic that governs how a business operates. In DDD, they represent the invariants and constraints that must be maintained within the domain. Unlike simple data validation, business rules encode complex domain knowledge and policies.

**Core Concept**:

```typescript
// Business rule validation: "Does this object comply with our business policies?"
const validator = BusinessRuleValidator.create<Order>()
  .addRule('totalAmount', 
    order => order.totalAmount > 0, 
    'Order total must be positive'
  );

validator.validate(order); // Returns Result<Order, ValidationErrors>
```

### Primary Use Cases

1. **Domain Invariant Enforcement**: Ensure aggregates maintain their invariants
2. **Complex Validation Logic**: Rules that involve multiple properties or calculations
3. **Conditional Business Logic**: Rules that apply only in specific contexts
4. **Policy Implementation**: Encode business policies as executable rules
5. **Cross-Entity Validation**: Rules that span multiple domain objects

### Key Benefits

- **Domain Expertise Encoding**: Business rules as first-class citizens
- **Fluent API**: Readable, chainable rule definitions
- **Composability**: Combine simple rules into complex validations
- **Conditional Logic**: Rules that apply based on object state
- **Specification Integration**: Seamless use of specification pattern

## Core Components

### 1. BusinessRuleValidator

**Purpose**: Primary class for defining and executing business rules

```typescript
class BusinessRuleValidator<T> implements IValidator<T> {
  // Add a simple validation rule
  addRule(
    property: string,
    validationFn: (value: T) => boolean,
    message: string,
    context?: Record<string, any>
  ): BusinessRuleValidator<T>;
  
  // Add specification-based validation
  mustSatisfy(
    specification: ISpecification<T>,
    message: string,
    context?: Record<string, any>
  ): BusinessRuleValidator<T>;
  
  // Add conditional validation
  when(
    condition: (value: T) => boolean,
    thenValidator: (validator: BusinessRuleValidator<T>) => void
  ): BusinessRuleValidator<T>;
  
  // Add alternative conditional validation
  otherwise(
    elseValidator: (validator: BusinessRuleValidator<T>) => void
  ): BusinessRuleValidator<T>;
  
  // Validate nested objects
  addNested<P>(
    property: string,
    validator: IValidator<P>,
    getValue: (obj: T) => P | undefined | null
  ): BusinessRuleValidator<T>;
}
```

### 2. ValidationRule Interface

**Purpose**: Internal representation of a validation rule

```typescript
interface ValidationRule<T> {
  property: string;
  validate: (value: T) => Result<true, ValidationError>;
  condition?: (value: T) => boolean;
}
```

### 3. Extension Methods

**Purpose**: Additional functionality through prototype extension

```typescript
// Convert validator to specification
validator.toSpecification(errorMessage?: string): ISpecification<T>;

// Validate with additional specifications
validator.validateWithSpecifications(
  value: T,
  ...specs: ISpecification<T>[]
): Result<T, ValidationErrors>;

// Apply rule functions
validator.apply(
  rule: (validator: BusinessRuleValidator<T>) => BusinessRuleValidator<T>
): BusinessRuleValidator<T>;
```

## Basic Usage Examples

### 1. Simple Property Validation

```typescript
// Domain model
class Product {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly price: number,
    public readonly stock: number,
    public readonly category: string
  ) {}
}

// Create validator with basic rules
const productValidator = BusinessRuleValidator.create<Product>()
  .addRule('name', 
    product => product.name.length >= 3,
    'Product name must be at least 3 characters'
  )
  .addRule('price',
    product => product.price > 0,
    'Price must be positive'
  )
  .addRule('stock',
    product => product.stock >= 0,
    'Stock cannot be negative'
  );

// Validate a product
const product = new Product('1', 'AB', -10, -5, 'electronics');
const result = productValidator.validate(product);

if (result.isFailure()) {
  console.log('Validation errors:', result.error.errors);
  // Output:
  // - name: Product name must be at least 3 characters
  // - price: Price must be positive
  // - stock: Stock cannot be negative
}
```

### 2. Using Specifications

```typescript
// Define business specifications
class PremiumProductSpecification extends CompositeSpecification<Product> {
  isSatisfiedBy(product: Product): boolean {
    return product.price > 1000 || product.category === 'luxury';
  }
}

class InStockSpecification extends CompositeSpecification<Product> {
  isSatisfiedBy(product: Product): boolean {
    return product.stock > 0;
  }
}

// Use specifications in validator
const productValidator = BusinessRuleValidator.create<Product>()
  .mustSatisfy(
    new PremiumProductSpecification(),
    'Product must be premium (price > $1000 or luxury category)'
  )
  .mustSatisfy(
    new InStockSpecification(),
    'Product must be in stock'
  )
  .propertyMustSatisfy(
    'name',
    new MinLengthSpecification(3),
    'Product name too short',
    product => product.name
  );
```

### 3. Conditional Validation

```typescript
// Order validation with conditional rules
class Order {
  constructor(
    public readonly id: string,
    public readonly customerId: string,
    public readonly items: OrderItem[],
    public readonly shippingMethod: 'standard' | 'express' | 'overnight',
    public readonly totalAmount: number,
    public readonly isPaid: boolean,
    public readonly isGift: boolean,
    public readonly giftMessage?: string
  ) {}
}

const orderValidator = BusinessRuleValidator.create<Order>()
  // Basic validations
  .addRule('items', 
    order => order.items.length > 0,
    'Order must have at least one item'
  )
  .addRule('totalAmount',
    order => order.totalAmount > 0,
    'Order total must be positive'
  )
  // Conditional validation for overnight shipping
  .when(
    order => order.shippingMethod === 'overnight',
    validator => validator
      .addRule('totalAmount',
        order => order.totalAmount >= 100,
        'Overnight shipping requires minimum order of $100'
      )
      .addRule('isPaid',
        order => order.isPaid,
        'Overnight shipping requires payment upfront'
      )
  )
  // Conditional validation for gift orders
  .when(
    order => order.isGift,
    validator => validator
      .addRule('giftMessage',
        order => order.giftMessage !== undefined && order.giftMessage.length > 0,
        'Gift orders must include a message'
      )
  )
  .otherwise(
    validator => validator
      .addRule('giftMessage',
        order => order.giftMessage === undefined,
        'Non-gift orders should not have gift messages'
      )
  );
```

### 4. Nested Object Validation

```typescript
// Domain models with nested structure
class Address {
  constructor(
    public readonly street: string,
    public readonly city: string,
    public readonly zipCode: string,
    public readonly country: string
  ) {}
}

class Customer {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly email: string,
    public readonly billingAddress: Address,
    public readonly shippingAddress: Address
  ) {}
}

// Validators for nested objects
const addressValidator = BusinessRuleValidator.create<Address>()
  .addRule('street', 
    address => address.street.length > 0,
    'Street is required'
  )
  .addRule('city',
    address => address.city.length > 0,
    'City is required'
  )
  .addRule('zipCode',
    address => /^\d{5}$/.test(address.zipCode),
    'Invalid zip code format'
  );

const customerValidator = BusinessRuleValidator.create<Customer>()
  .addRule('name',
    customer => customer.name.length >= 2,
    'Name must be at least 2 characters'
  )
  .addRule('email',
    customer => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email),
    'Invalid email format'
  )
  .addNested(
    'billingAddress',
    addressValidator,
    customer => customer.billingAddress
  )
  .addNested(
    'shippingAddress',
    addressValidator,
    customer => customer.shippingAddress
  );
```

## Advanced Business Rule Patterns

### 1. Complex Cross-Property Rules

```typescript
class Subscription {
  constructor(
    public readonly id: string,
    public readonly startDate: Date,
    public readonly endDate: Date,
    public readonly type: 'monthly' | 'annual',
    public readonly price: number,
    public readonly autoRenew: boolean
  ) {}
}

const subscriptionValidator = BusinessRuleValidator.create<Subscription>()
  // Cross-property validation
  .addRule('',  // Empty property means validate entire object
    subscription => subscription.endDate > subscription.startDate,
    'End date must be after start date'
  )
  // Complex business rule
  .addRule('',
    subscription => {
      const duration = subscription.endDate.getTime() - subscription.startDate.getTime();
      const days = duration / (1000 * 60 * 60 * 24);
      
      if (subscription.type === 'monthly') {
        return days >= 28 && days <= 31;
      } else {
        return days >= 365 && days <= 366;
      }
    },
    'Subscription duration does not match subscription type'
  )
  // Pricing rules
  .when(
    subscription => subscription.type === 'annual',
    validator => validator
      .addRule('price',
        subscription => subscription.price >= 100,
        'Annual subscription minimum price is $100'
      )
      .addRule('autoRenew',
        subscription => subscription.autoRenew === true,
        'Annual subscriptions must have auto-renewal enabled'
      )
  );
```

### 2. Dynamic Business Rules

```typescript
// Configuration-driven validation
interface ValidationConfig {
  minOrderAmount: number;
  maxOrderItems: number;
  allowedPaymentMethods: string[];
  requiresApprovalThreshold: number;
}

class ConfigurableOrderValidator {
  private validator: BusinessRuleValidator<Order>;
  
  constructor(private config: ValidationConfig) {
    this.validator = this.buildValidator();
  }
  
  private buildValidator(): BusinessRuleValidator<Order> {
    return BusinessRuleValidator.create<Order>()
      .addRule('totalAmount',
        order => order.totalAmount >= this.config.minOrderAmount,
        `Minimum order amount is $${this.config.minOrderAmount}`
      )
      .addRule('items',
        order => order.items.length <= this.config.maxOrderItems,
        `Maximum ${this.config.maxOrderItems} items per order`
      )
      .addRule('paymentMethod',
        order => this.config.allowedPaymentMethods.includes(order.paymentMethod),
        'Payment method not allowed'
      )
      .when(
        order => order.totalAmount > this.config.requiresApprovalThreshold,
        validator => validator
          .addRule('approvalStatus',
            order => order.approvalStatus === 'approved',
            `Orders over $${this.config.requiresApprovalThreshold} require approval`
          )
      );
  }
  
  validate(order: Order): Result<Order, ValidationErrors> {
    return this.validator.validate(order);
  }
  
  updateConfig(newConfig: Partial<ValidationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.validator = this.buildValidator();
  }
}
```

### 3. Combining Validators and Specifications

```typescript
// Extend validator with specification support
const enhancedOrderValidator = BusinessRuleValidator.create<Order>()
  .mustSatisfy(
    new ValidOrderSpecification(),
    'Order must be in valid state'
  )
  .when(
    order => order.customer.type === 'premium',
    validator => validator
      .mustSatisfy(
        new PremiumOrderBenefitsSpecification(),
        'Premium order must include benefits'
      )
  )
  .apply(Rules.required('orderId'))
  .apply(Rules.minLength('items', 1))
  .apply(order => order
    .addRule('shippingCost',
      o => o.shippingCost >= 0 || o.customer.type === 'premium',
      'Shipping cost required for non-premium customers'
    )
  );

// Convert to specification for use elsewhere
const orderSpec = enhancedOrderValidator.toSpecification(
  'Order does not meet business requirements'
);

// Use in repository
class OrderRepository {
  findValidOrders(): Order[] {
    return this.orders.filter(order => orderSpec.isSatisfiedBy(order));
  }
}
```

### 4. Validator Composition

```typescript
// Base validators for common rules
const baseCustomerValidator = BusinessRuleValidator.create<Customer>()
  .apply(Rules.required('id'))
  .apply(Rules.required('email'))
  .apply(Rules.email('email'));

const addressRequiredValidator = BusinessRuleValidator.create<Customer>()
  .addNested('billingAddress', addressValidator, c => c.billingAddress)
  .addNested('shippingAddress', addressValidator, c => c.shippingAddress);

// Compose for different contexts
const registrationValidator = baseCustomerValidator
  .and(addressRequiredValidator)
  .addRule('password',
    customer => customer.password.length >= 8,
    'Password must be at least 8 characters'
  );

const profileUpdateValidator = baseCustomerValidator
  .addRule('',
    customer => customer.modifiedAt > customer.createdAt,
    'Modified date must be after creation date'
  );
```

## Domain Example: E-commerce Order Processing

### Domain Models

```typescript
// Value Objects
class Money {
  constructor(
    public readonly amount: number,
    public readonly currency: string
  ) {}
  
  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error('Cannot add different currencies');
    }
    return new Money(this.amount + other.amount, this.currency);
  }
}

class Discount {
  constructor(
    public readonly code: string,
    public readonly percentage: number,
    public readonly minOrderAmount: number,
    public readonly expiryDate: Date
  ) {}
  
  isValid(): boolean {
    return this.expiryDate > new Date();
  }
}

// Entities
class OrderItem {
  constructor(
    public readonly productId: string,
    public readonly quantity: number,
    public readonly unitPrice: Money,
    public readonly discount: number = 0
  ) {}
  
  get totalPrice(): Money {
    const discountedAmount = this.unitPrice.amount * (1 - this.discount / 100);
    return new Money(
      discountedAmount * this.quantity,
      this.unitPrice.currency
    );
  }
}

// Aggregate
class Order {
  constructor(
    public readonly id: string,
    public readonly customerId: string,
    public readonly items: OrderItem[],
    public readonly discount?: Discount,
    public readonly shippingMethod: 'standard' | 'express' | 'overnight',
    public readonly paymentMethod: string,
    public readonly status: OrderStatus = 'pending',
    public readonly createdAt: Date = new Date()
  ) {}
  
  get subtotal(): Money {
    return this.items.reduce(
      (sum, item) => sum.add(item.totalPrice),
      new Money(0, 'USD')
    );
  }
  
  get totalAmount(): Money {
    const subtotal = this.subtotal;
    if (this.discount && this.discount.isValid()) {
      const discountAmount = subtotal.amount * (this.discount.percentage / 100);
      return new Money(subtotal.amount - discountAmount, subtotal.currency);
    }
    return subtotal;
  }
}

type OrderStatus = 'pending' | 'confirmed' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
```

### Business Rule Implementation

```typescript
// Order business rules validator
class OrderBusinessRulesValidator {
  private static readonly MINIMUM_ORDER_AMOUNT = 10;
  private static readonly MAXIMUM_ITEMS_PER_ORDER = 50;
  private static readonly EXPRESS_SHIPPING_MIN_AMOUNT = 50;
  private static readonly OVERNIGHT_SHIPPING_MIN_AMOUNT = 100;
  
  static create(): BusinessRuleValidator<Order> {
    return BusinessRuleValidator.create<Order>()
      // Basic order rules
      .addRule('items',
        order => order.items.length > 0,
        'Order must contain at least one item'
      )
      .addRule('items',
        order => order.items.length <= this.MAXIMUM_ITEMS_PER_ORDER,
        `Order cannot exceed ${this.MAXIMUM_ITEMS_PER_ORDER} items`
      )
      .addRule('',
        order => order.totalAmount.amount >= this.MINIMUM_ORDER_AMOUNT,
        `Minimum order amount is $${this.MINIMUM_ORDER_AMOUNT}`
      )
      
      // Item validation
      .addRule('items',
        order => order.items.every(item => item.quantity > 0),
        'All items must have positive quantity'
      )
      .addRule('items',
        order => order.items.every(item => item.unitPrice.amount > 0),
        'All items must have positive price'
      )
      
      // Discount rules
      .when(
        order => order.discount !== undefined,
        validator => validator
          .addRule('discount',
            order => order.discount!.isValid(),
            'Discount code has expired'
          )
          .addRule('',
            order => order.subtotal.amount >= order.discount!.minOrderAmount,
            order => `Minimum order amount for this discount is $${order.discount!.minOrderAmount}`
          )
      )
      
      // Shipping method rules
      .when(
        order => order.shippingMethod === 'express',
        validator => validator
          .addRule('',
            order => order.totalAmount.amount >= this.EXPRESS_SHIPPING_MIN_AMOUNT,
            `Express shipping requires minimum order of $${this.EXPRESS_SHIPPING_MIN_AMOUNT}`
          )
      )
      .when(
        order => order.shippingMethod === 'overnight',
        validator => validator
          .addRule('',
            order => order.totalAmount.amount >= this.OVERNIGHT_SHIPPING_MIN_AMOUNT,
            `Overnight shipping requires minimum order of $${this.OVERNIGHT_SHIPPING_MIN_AMOUNT}`
          )
          .addRule('createdAt',
            order => {
              const hour = order.createdAt.getHours();
              return hour < 14; // Must be placed before 2 PM
            },
            'Overnight orders must be placed before 2 PM'
          )
      )
      
      // Payment method rules
      .addRule('paymentMethod',
        order => ['credit_card', 'paypal', 'bank_transfer'].includes(order.paymentMethod),
        'Invalid payment method'
      )
      .when(
        order => order.paymentMethod === 'bank_transfer',
        validator => validator
          .addRule('',
            order => order.totalAmount.amount >= 500,
            'Bank transfer is only available for orders over $500'
          )
      );
  }
  
  static createForPremiumCustomers(): BusinessRuleValidator<Order> {
    return this.create()
      .addRule('',
        order => order.totalAmount.amount >= 5, // Lower minimum for premium
        'Premium customers have a minimum order of $5'
      )
      .when(
        order => order.shippingMethod === 'express',
        validator => validator
          .addRule('',
            order => true, // No minimum for premium customers
            'Express shipping available for all premium orders'
          )
      );
  }
}

// Usage in domain service
class OrderService {
  private readonly standardValidator = OrderBusinessRulesValidator.create();
  private readonly premiumValidator = OrderBusinessRulesValidator.createForPremiumCustomers();
  
  constructor(
    private readonly customerRepository: CustomerRepository,
    private readonly inventoryService: InventoryService
  ) {}
  
  async validateOrder(order: Order): Promise<Result<Order, ValidationErrors>> {
    // Choose validator based on customer type
    const customer = await this.customerRepository.findById(order.customerId);
    const validator = customer.isPremium ? this.premiumValidator : this.standardValidator;
    
    // Validate business rules
    const result = validator.validate(order);
    if (result.isFailure()) {
      return result;
    }
    
    // Additional async validations (inventory, etc.)
    const inventorySpec = new OrderInventorySpecification(this.inventoryService);
    if (!await inventorySpec.isSatisfiedByAsync(order)) {
      return Result.fail(new ValidationErrors([
        new ValidationError('', 'Insufficient inventory for order items')
      ]));
    }
    
    return Result.ok(order);
  }
}
```

### Testing Business Rules

```typescript
describe('OrderBusinessRulesValidator', () => {
  let validator: BusinessRuleValidator<Order>;
  
  beforeEach(() => {
    validator = OrderBusinessRulesValidator.create();
  });
  
  describe('basic order validation', () => {
    it('should accept valid order', () => {
      const order = createValidOrder();
      const result = validator.validate(order);
      
      expect(result.isSuccess()).toBe(true);
    });
    
    it('should reject empty order', () => {
      const order = createOrderWithoutItems();
      const result = validator.validate(order);
      
      expect(result.isFailure()).toBe(true);
      expect(result.error.errors).toContainEqual(
        expect.objectContaining({
          property: 'items',
          message: 'Order must contain at least one item'
        })
      );
    });
    
    it('should enforce minimum order amount', () => {
      const order = createOrderWithAmount(5);
      const result = validator.validate(order);
      
      expect(result.isFailure()).toBe(true);
      expect(result.error.errors).toContainEqual(
        expect.objectContaining({
          property: '',
          message: 'Minimum order amount is $10'
        })
      );
    });
  });
  
  describe('conditional shipping rules', () => {
    it('should enforce express shipping minimum', () => {
      const order = createOrder({
        shippingMethod: 'express',
        totalAmount: new Money(30, 'USD')
      });
      
      const result = validator.validate(order);
      
      expect(result.isFailure()).toBe(true);
      expect(result.error.errors).toContainEqual(
        expect.objectContaining({
          message: 'Express shipping requires minimum order of $50'
        })
      );
    });
    
    it('should allow express shipping for qualifying orders', () => {
      const order = createOrder({
        shippingMethod: 'express',
        totalAmount: new Money(75, 'USD')
      });
      
      const result = validator.validate(order);
      
      expect(result.isSuccess()).toBe(true);
    });
    
    it('should enforce overnight shipping time restriction', () => {
      const lateOrder = createOrder({
        shippingMethod: 'overnight',
        totalAmount: new Money(150, 'USD'),
        createdAt: new Date('2024-01-01T15:00:00') // 3 PM
      });
      
      const result = validator.validate(lateOrder);
      
      expect(result.isFailure()).toBe(true);
      expect(result.error.errors).toContainEqual(
        expect.objectContaining({
          property: 'createdAt',
          message: 'Overnight orders must be placed before 2 PM'
        })
      );
    });
  });
  
  describe('discount validation', () => {
    it('should validate discount eligibility', () => {
      const expiredDiscount = new Discount(
        'EXPIRED20',
        20,
        50,
        new Date('2023-01-01')
      );
      
      const order = createOrder({
        discount: expiredDiscount,
        totalAmount: new Money(100, 'USD')
      });
      
      const result = validator.validate(order);
      
      expect(result.isFailure()).toBe(true);
      expect(result.error.errors).toContainEqual(
        expect.objectContaining({
          property: 'discount',
          message: 'Discount code has expired'
        })
      );
    });
  });
});
```

## Best Practices

### 1. Keep Rules Focused

```typescript
// Bad - multiple concerns in one rule
.addRule('order',
  order => {
    if (order.items.length === 0) return false;
    if (order.totalAmount <= 0) return false;
    if (!order.customerId) return false;
    return true;
  },
  'Invalid order'
);

// Good - separate rules for each concern
.addRule('items',
  order => order.items.length > 0,
  'Order must have items'
)
.addRule('totalAmount',
  order => order.totalAmount > 0,
  'Order total must be positive'
)
.addRule('customerId',
  order => !!order.customerId,
  'Customer ID is required'
);
```

### 2. Use Specific Error Messages

```typescript
// Bad - generic message
.addRule('email',
  customer => emailRegex.test(customer.email),
  'Invalid value'
);

// Good - specific, helpful message
.addRule('email',
  customer => emailRegex.test(customer.email),
  'Email must be in format: user@domain.com'
);

// Better - context-aware message
.addRule('creditLimit',
  customer => customer.creditLimit <= calculateMaxCredit(customer),
  customer => `Credit limit cannot exceed $${calculateMaxCredit(customer)} based on credit score`
);
```

### 3. Leverage Specifications for Complex Rules

```typescript
// Bad - complex logic in validator
.addRule('',
  order => {
    // Complex 20-line validation logic here
    return isValid;
  },
  'Order failed complex validation'
);

// Good - encapsulate in specification
.mustSatisfy(
  new ComplexOrderValidationSpecification(),
  'Order does not meet business requirements'
);
```

### 4. Group Related Rules

```typescript
// Good - organize rules by concern
const customerValidator = BusinessRuleValidator.create<Customer>()
  // Identity rules
  .apply(Rules.required('id'))
  .apply(Rules.pattern('id', /^[A-Z0-9]{8}$/))
  
  // Contact information rules
  .apply(Rules.required('email'))
  .apply(Rules.email('email'))
  .apply(Rules.required('phone'))
  .apply(Rules.pattern('phone', /^\+?[\d\s-()]+$/))
  
  // Address rules
  .addNested('address', addressValidator, c => c.address)
  
  // Business rules
  .mustSatisfy(new CustomerCreditWorthinessSpec(), 'Customer not creditworthy');
```

### 5. Create Reusable Validators

```typescript
// Create validator factories
class ValidatorFactory {
  static createMoneyValidator(maxAmount: number = 999999.99): IValidator<Money> {
    return BusinessRuleValidator.create<Money>()
      .addRule('amount',
        money => money.amount >= 0 && money.amount <= maxAmount,
        `Amount must be between 0 and ${maxAmount}`
      )
      .addRule('currency',
        money => /^[A-Z]{3}$/.test(money.currency),
        'Currency must be 3-letter ISO code'
      );
  }
  
  static createDateRangeValidator(): IValidator<DateRange> {
    return BusinessRuleValidator.create<DateRange>()
      .addRule('',
        range => range.startDate <= range.endDate,
        'Start date must be before end date'
      )
      .addRule('',
        range => range.startDate >= new Date(),
        'Start date cannot be in the past'
      );
  }
}
```

### 6. Use Conditional Rules Wisely

```typescript
// Good - clear conditional structure
const orderValidator = BusinessRuleValidator.create<Order>()
  .when(
    order => order.type === 'subscription',
    validator => validator
      .apply(subscriptionRules)
      .mustSatisfy(new ValidSubscriptionSpec(), 'Invalid subscription')
  )
  .when(
    order => order.type === 'one-time',
    validator => validator
      .apply(oneTimeOrderRules)
  )
  .otherwise(
    validator => validator
      .addRule('type',
        () => false,
        'Unknown order type'
      )
  );
```

## Performance Considerations

### 1. Early Termination

```typescript
const validator = BusinessRuleValidator.create<Order>()
  .setStopOnFirstFailure() // Stop validation on first error
  .addRule('id', order => !!order.id, 'ID required')
  .addRule('items', order => order.items.length > 0, 'Items required')
  // Won't check this if previous rules fail
  .addExpensiveValidation();
```

### 2. Lazy Rule Evaluation

```typescript
class LazyBusinessRuleValidator<T> extends BusinessRuleValidator<T> {
  addLazyRule(
    property: string,
    validationFn: () => (value: T) => boolean,
    message: string
  ): this {
    let cachedValidator: ((value: T) => boolean) | null = null;
    
    return this.addRule(
      property,
      (value: T) => {
        if (!cachedValidator) {
          cachedValidator = validationFn();
        }
        return cachedValidator(value);
      },
      message
    );
  }
}
```

## Conclusion

Business Rules in DomainTS provide:

- **Domain Knowledge Encoding**: Business logic as executable rules
- **Flexible Validation**: From simple to complex scenarios
- **Conditional Logic**: Rules that adapt to object state
- **Composition**: Build complex validators from simple rules
- **Integration**: Works seamlessly with specifications
- **Type Safety**: Full TypeScript support

The BusinessRuleValidator enables you to express complex domain logic in a readable, maintainable way while keeping your domain models focused on their core responsibilities.

---

# Business Policies in DomainTS - LLM-Optimized Guide

## Document Metadata

- **Pattern Name**: Business Policy Pattern
- **Category**: Domain-Driven Design (DDD) Pattern
- **Purpose**: Encapsulate high-level business decisions and constraints
- **Library**: DomainTS
- **Language**: TypeScript
- **Version**: 1.0.0

## Pattern Overview

### What are Business Policies?

Business Policies represent high-level business decisions that govern how the system should behave. While validation ensures data integrity and business rules enforce domain constraints, policies represent strategic business decisions that can change based on business context.

**Core Concept**:

```typescript
// Business policy answers: "Is this action allowed by our business strategy?"
const policy = new CreditApprovalPolicy();
policy.check(creditApplication); // Returns Result<T, PolicyViolation>
```

### Policy vs. Validation vs. Business Rules

1. **Validation**: "Is this data correct?" (e.g., email format)
2. **Business Rules**: "Does this comply with domain constraints?" (e.g., order must have items)
3. **Business Policies**: "Is this allowed by our business strategy?" (e.g., can we offer credit to this customer?)

### Primary Use Cases

1. **Strategic Decisions**: Encoding high-level business strategies
2. **Risk Management**: Determining acceptable business risks
3. **Compliance**: Ensuring actions comply with business policies
4. **Dynamic Rules**: Rules that change based on business context
5. **Authorization**: Determining what actions are permitted

### Key Benefits

- **Explicit Strategy**: Business policies become explicit in code
- **Composability**: Combine policies with AND/OR logic
- **Changeability**: Policies can be modified without changing core domain
- **Centralization**: All policies in one place for easy management
- **Traceability**: Clear audit trail of policy decisions

## Core Components

### 1. IBusinessPolicy Interface

**Purpose**: Define the contract for all business policies

```typescript
interface IBusinessPolicy<T> {
  // Check if entity satisfies the policy
  isSatisfiedBy(entity: T): boolean;
  
  // Validate entity against policy with detailed result
  check(entity: T): Result<T, PolicyViolation>;
  
  // Combine policies with AND logic
  and(other: IBusinessPolicy<T>): IBusinessPolicy<T>;
  
  // Combine policies with OR logic
  or(other: IBusinessPolicy<T>): IBusinessPolicy<T>;
}
```

**Key Methods**:

- `isSatisfiedBy()`: Quick boolean check
- `check()`: Detailed check with violation information
- `and()`, `or()`: Policy composition

### 2. PolicyViolation

**Purpose**: Represent policy violations with detailed information

```typescript
class PolicyViolation {
  constructor(
    public readonly code: string,        // Unique violation code
    public readonly message: string,     // Human-readable message
    public readonly details?: Record<string, any>  // Additional context
  ) {}
}
```

### 3. BusinessPolicy

**Purpose**: Core implementation of business policies

```typescript
class BusinessPolicy<T> implements IBusinessPolicy<T> {
  constructor(
    private readonly specification: ISpecification<T>,
    private readonly violationCode: string,
    private readonly violationMessage: string,
    private readonly violationDetails?: (entity: T) => Record<string, any>
  ) {}
  
  // Create from specification
  static fromSpecification<T>(
    specification: ISpecification<T>,
    violationCode: string,
    violationMessage: string
  ): BusinessPolicy<T>;
  
  // Create from validator
  static fromValidator<T>(
    validator: IValidator<T>,
    violationCode: string,
    violationMessage: string
  ): BusinessPolicy<T>;
}
```

### 4. CompositePolicy

**Purpose**: Combine multiple policies with AND/OR logic

```typescript
class CompositePolicy<T> implements IBusinessPolicy<T> {
  constructor(
    private readonly operator: 'AND' | 'OR',
    private readonly policies: IBusinessPolicy<T>[]
  ) {}
}
```

### 5. PolicyRegistry

**Purpose**: Central registry for managing domain policies

```typescript
class PolicyRegistry {
  // Register a policy for a domain
  static register<T>(
    domain: string,
    policyName: string,
    policy: IBusinessPolicy<T>
  ): void;
  
  // Get a specific policy
  static getPolicy<T>(
    domain: string, 
    policyName: string
  ): IBusinessPolicy<T>;
  
  // Get all policies for a domain
  static getDomainPolicies<T>(
    domain: string
  ): Record<string, IBusinessPolicy<T>>;
}
```

## Basic Usage Examples

### 1. Creating Simple Policies

```typescript
// Domain model
class LoanApplication {
  constructor(
    public readonly id: string,
    public readonly customerId: string,
    public readonly amount: number,
    public readonly purpose: string,
    public readonly customerCreditScore: number,
    public readonly customerIncome: number,
    public readonly existingDebt: number
  ) {}
  
  get debtToIncomeRatio(): number {
    return this.existingDebt / this.customerIncome;
  }
}

// Create a policy from specification
const minimumCreditScoreSpec = new MinimumCreditScoreSpecification(650);
const creditScorePolicy = BusinessPolicy.fromSpecification(
  minimumCreditScoreSpec,
  'CREDIT_SCORE_TOO_LOW',
  'Credit score must be at least 650',
  (application) => ({
    actualScore: application.customerCreditScore,
    requiredScore: 650
  })
);

// Use the policy
const application = new LoanApplication(
  '1', 'cust-123', 50000, 'home', 600, 80000, 20000
);

const result = creditScorePolicy.check(application);
if (result.isFailure()) {
  console.log(result.error.message); // "Credit score must be at least 650"
  console.log(result.error.details); // { actualScore: 600, requiredScore: 650 }
}
```

### 2. Creating Policies from Validators

```typescript
// Create a validator
const loanValidator = BusinessRuleValidator.create<LoanApplication>()
  .addRule('amount',
    app => app.amount >= 10000 && app.amount <= 500000,
    'Loan amount must be between $10,000 and $500,000'
  )
  .addRule('debtToIncomeRatio',
    app => app.debtToIncomeRatio <= 0.4,
    'Debt-to-income ratio cannot exceed 40%'
  );

// Convert to policy
const loanEligibilityPolicy = BusinessPolicy.fromValidator(
  loanValidator,
  'LOAN_ELIGIBILITY_FAILED',
  'Loan application does not meet eligibility requirements'
);
```

### 3. Composing Policies

```typescript
// Create individual policies
const creditScorePolicy = BusinessPolicy.fromSpecification(
  new MinimumCreditScoreSpecification(650),
  'LOW_CREDIT_SCORE',
  'Credit score too low'
);

const incomePolicy = BusinessPolicy.fromSpecification(
  new MinimumIncomeSpecification(50000),
  'INSUFFICIENT_INCOME',
  'Income below minimum requirement'
);

const debtRatioPolicy = BusinessPolicy.fromSpecification(
  new MaxDebtToIncomeRatioSpecification(0.4),
  'HIGH_DEBT_RATIO',
  'Debt-to-income ratio too high'
);

// Compose with AND logic (all must be satisfied)
const standardLoanPolicy = creditScorePolicy
  .and(incomePolicy)
  .and(debtRatioPolicy);

// Compose with OR logic (alternative criteria)
const premiumCustomerCreditPolicy = new MinimumCreditScoreSpecification(750);
const highIncomePolicy = new MinimumIncomeSpecification(150000);

const alternativeApprovalPolicy = BusinessPolicy.fromSpecification(
  premiumCustomerCreditPolicy,
  'PREMIUM_CREDIT',
  'Premium credit requirement'
).or(
  BusinessPolicy.fromSpecification(
    highIncomePolicy,
    'HIGH_INCOME',
    'High income qualification'
  )
);

// Complex composition
const finalLoanPolicy = standardLoanPolicy.or(alternativeApprovalPolicy);
```

## Advanced Policy Patterns

### 1. Domain-Specific Policy Factory

```typescript
// Create a policy factory for the lending domain
const lendingPolicies = createPolicyFactory<LoanApplication>('lending');

// Register policies
lendingPolicies.register(
  'creditScore',
  new MinimumCreditScoreSpecification(650),
  'LOW_CREDIT_SCORE',
  'Credit score must be at least 650',
  (loan) => ({
    actualScore: loan.customerCreditScore,
    requiredScore: 650
  })
);

lendingPolicies.register(
  'debtToIncome',
  new MaxDebtToIncomeRatioSpecification(0.4),
  'HIGH_DEBT_RATIO',
  'Debt-to-income ratio cannot exceed 40%',
  (loan) => ({
    actualRatio: loan.debtToIncomeRatio,
    maxRatio: 0.4
  })
);

lendingPolicies.register(
  'loanAmount',
  new LoanAmountRangeSpecification(10000, 500000),
  'INVALID_LOAN_AMOUNT',
  'Loan amount must be between $10,000 and $500,000'
);

// Use registered policies
const creditPolicy = lendingPolicies.get('creditScore');
const result = creditPolicy.check(loanApplication);

// Check all policies at once
const allPoliciesResult = lendingPolicies.checkAll(loanApplication);
if (allPoliciesResult.isFailure()) {
  console.log('Policy violations:', allPoliciesResult.error);
}
```

### 2. Context-Aware Policies

```typescript
// Policy that changes based on context
class ContextualLoanPolicy implements IBusinessPolicy<LoanApplication> {
  constructor(
    private readonly context: {
      isRecession: boolean;
      region: string;
      customerSegment: 'standard' | 'premium' | 'vip';
    }
  ) {}
  
  isSatisfiedBy(application: LoanApplication): boolean {
    return this.getContextualPolicy().isSatisfiedBy(application);
  }
  
  check(application: LoanApplication): Result<LoanApplication, PolicyViolation> {
    return this.getContextualPolicy().check(application);
  }
  
  private getContextualPolicy(): IBusinessPolicy<LoanApplication> {
    // Stricter policies during recession
    if (this.context.isRecession) {
      return new MinimumCreditScoreSpecification(700)
        .and(new MaxDebtToIncomeRatioSpecification(0.3));
    }
    
    // Different policies by customer segment
    switch (this.context.customerSegment) {
      case 'vip':
        return new MinimumCreditScoreSpecification(600);
      case 'premium':
        return new MinimumCreditScoreSpecification(650);
      default:
        return new MinimumCreditScoreSpecification(680);
    }
  }
  
  and(other: IBusinessPolicy<LoanApplication>): IBusinessPolicy<LoanApplication> {
    return new CompositePolicy('AND', [this, other]);
  }
  
  or(other: IBusinessPolicy<LoanApplication>): IBusinessPolicy<LoanApplication> {
    return new CompositePolicy('OR', [this, other]);
  }
}
```

### 3. Policy Versioning

```typescript
// Managing policy versions
class VersionedPolicyRegistry {
  private static policies = new Map<string, Map<string, IBusinessPolicy<any>>>();
  
  static register<T>(
    domain: string,
    policyName: string,
    version: string,
    policy: IBusinessPolicy<T>
  ): void {
    const key = `${domain}:${policyName}:${version}`;
    if (!this.policies.has(domain)) {
      this.policies.set(domain, new Map());
    }
    this.policies.get(domain)!.set(key, policy);
  }
  
  static getPolicy<T>(
    domain: string,
    policyName: string,
    version: string = 'latest'
  ): IBusinessPolicy<T> {
    const domainPolicies = this.policies.get(domain);
    if (!domainPolicies) {
      throw new Error(`Domain ${domain} not found`);
    }
    
    if (version === 'latest') {
      // Find the latest version
      const versions = Array.from(domainPolicies.keys())
        .filter(key => key.startsWith(`${domain}:${policyName}:`))
        .map(key => key.split(':')[2])
        .sort();
      
      if (versions.length === 0) {
        throw new Error(`Policy ${policyName} not found`);
      }
      
      version = versions[versions.length - 1];
    }
    
    const key = `${domain}:${policyName}:${version}`;
    const policy = domainPolicies.get(key);
    
    if (!policy) {
      throw new Error(`Policy ${policyName} version ${version} not found`);
    }
    
    return policy as IBusinessPolicy<T>;
  }
}
```

## Domain Example: Insurance Underwriting System

### Domain Models

```typescript
// Value Objects
class RiskProfile {
  constructor(
    public readonly score: number,
    public readonly category: 'low' | 'medium' | 'high' | 'extreme',
    public readonly factors: string[]
  ) {}
}

class Coverage {
  constructor(
    public readonly type: string,
    public readonly amount: number,
    public readonly deductible: number,
    public readonly premium: number
  ) {}
}

// Entity
class PolicyApplication {
  constructor(
    public readonly id: string,
    public readonly applicantId: string,
    public readonly applicantAge: number,
    public readonly healthStatus: 'excellent' | 'good' | 'fair' | 'poor',
    public readonly smokingStatus: boolean,
    public readonly occupation: string,
    public readonly annualIncome: number,
    public readonly coverageRequested: Coverage,
    public readonly medicalHistory: string[],
    public readonly riskProfile?: RiskProfile
  ) {}
  
  get isHighRisk(): boolean {
    return this.riskProfile?.category === 'high' || 
           this.riskProfile?.category === 'extreme';
  }
}
```

### Insurance Policy Implementation

```typescript
// Specifications for insurance policies
class AgeEligibilitySpecification extends CompositeSpecification<PolicyApplication> {
  constructor(
    private readonly minAge: number = 18,
    private readonly maxAge: number = 65
  ) {
    super();
  }
  
  isSatisfiedBy(application: PolicyApplication): boolean {
    return application.applicantAge >= this.minAge && 
           application.applicantAge <= this.maxAge;
  }
}

class HealthStatusSpecification extends CompositeSpecification<PolicyApplication> {
  constructor(private readonly acceptableStatuses: string[]) {
    super();
  }
  
  isSatisfiedBy(application: PolicyApplication): boolean {
    return this.acceptableStatuses.includes(application.healthStatus);
  }
}

class CoverageAmountSpecification extends CompositeSpecification<PolicyApplication> {
  constructor(private readonly maxCoverageByIncome: number = 10) {
    super();
  }
  
  isSatisfiedBy(application: PolicyApplication): boolean {
    const maxCoverage = application.annualIncome * this.maxCoverageByIncome;
    return application.coverageRequested.amount <= maxCoverage;
  }
}

// Create insurance policies
const insurancePolicies = createPolicyFactory<PolicyApplication>('insurance');

// Basic eligibility policy
insurancePolicies.register(
  'ageEligibility',
  new AgeEligibilitySpecification(18, 65),
  'AGE_INELIGIBLE',
  'Applicant age must be between 18 and 65',
  (app) => ({
    applicantAge: app.applicantAge,
    minAge: 18,
    maxAge: 65
  })
);

// Health policy
insurancePolicies.register(
  'healthRequirements',
  new HealthStatusSpecification(['excellent', 'good', 'fair']),
  'HEALTH_STATUS_UNACCEPTABLE',
  'Health status does not meet requirements',
  (app) => ({
    currentStatus: app.healthStatus,
    acceptableStatuses: ['excellent', 'good', 'fair']
  })
);

// Coverage amount policy
insurancePolicies.register(
  'coverageLimit',
  new CoverageAmountSpecification(10),
  'COVERAGE_EXCEEDS_LIMIT',
  'Coverage amount exceeds allowed limit based on income',
  (app) => ({
    requestedCoverage: app.coverageRequested.amount,
    maxAllowedCoverage: app.annualIncome * 10,
    annualIncome: app.annualIncome
  })
);

// Complex underwriting policy
class UnderwritingPolicy implements IBusinessPolicy<PolicyApplication> {
  private basePolicy: IBusinessPolicy<PolicyApplication>;
  
  constructor() {
    // Combine base requirements
    this.basePolicy = insurancePolicies.get('ageEligibility')
      .and(insurancePolicies.get('healthRequirements'))
      .and(insurancePolicies.get('coverageLimit'));
  }
  
  isSatisfiedBy(application: PolicyApplication): boolean {
    // Base requirements
    if (!this.basePolicy.isSatisfiedBy(application)) {
      return false;
    }
    
    // Additional risk-based rules
    if (application.isHighRisk) {
      return this.evaluateHighRiskCase(application);
    }
    
    return true;
  }
  
  check(application: PolicyApplication): Result<PolicyApplication, PolicyViolation> {
    // Check base requirements first
    const baseResult = this.basePolicy.check(application);
    if (baseResult.isFailure()) {
      return baseResult;
    }
    
    // Check high-risk specific rules
    if (application.isHighRisk && !this.evaluateHighRiskCase(application)) {
      return Result.fail(new PolicyViolation(
        'HIGH_RISK_DECLINED',
        'Application declined due to high risk profile',
        {
          riskCategory: application.riskProfile?.category,
          riskFactors: application.riskProfile?.factors
        }
      ));
    }
    
    return Result.ok(application);
  }
  
  private evaluateHighRiskCase(application: PolicyApplication): boolean {
    // High-risk applicants need excellent health and lower coverage
    if (application.healthStatus !== 'excellent') {
      return false;
    }
    
    // Limit coverage for high-risk applicants
    const maxHighRiskCoverage = application.annualIncome * 5;
    if (application.coverageRequested.amount > maxHighRiskCoverage) {
      return false;
    }
    
    // No smokers in high-risk category
    if (application.smokingStatus) {
      return false;
    }
    
    return true;
  }
  
  and(other: IBusinessPolicy<PolicyApplication>): IBusinessPolicy<PolicyApplication> {
    return new CompositePolicy('AND', [this, other]);
  }
  
  or(other: IBusinessPolicy<PolicyApplication>): IBusinessPolicy<PolicyApplication> {
    return new CompositePolicy('OR', [this, other]);
  }
}
```

### Using Policies in Domain Services

```typescript
class InsuranceUnderwritingService {
  private readonly standardPolicy = new UnderwritingPolicy();
  
  constructor(
    private readonly riskAssessmentService: RiskAssessmentService,
    private readonly pricingService: PricingService
  ) {}
  
  async evaluateApplication(
    application: PolicyApplication
  ): Promise<Result<UnderwritingDecision, PolicyViolation[]>> {
    // Assess risk profile
    const riskProfile = await this.riskAssessmentService.assessRisk(application);
    const applicationWithRisk = {
      ...application,
      riskProfile
    };
    
    // Check all policies
    const policyResult = this.standardPolicy.check(applicationWithRisk);
    
    if (policyResult.isFailure()) {
      return Result.fail([policyResult.error]);
    }
    
    // Additional checks for specific occupations
    const occupationPolicy = this.getOccupationPolicy(application.occupation);
    const occupationResult = occupationPolicy.check(applicationWithRisk);
    
    if (occupationResult.isFailure()) {
      return Result.fail([occupationResult.error]);
    }
    
    // Calculate premium
    const premium = await this.pricingService.calculatePremium(
      applicationWithRisk
    );
    
    return Result.ok(new UnderwritingDecision(
      application.id,
      'approved',
      premium,
      riskProfile
    ));
  }
  
  private getOccupationPolicy(occupation: string): IBusinessPolicy<PolicyApplication> {
    // High-risk occupations have additional requirements
    const highRiskOccupations = [
      'firefighter', 'police officer', 'pilot', 'miner'
    ];
    
    if (highRiskOccupations.includes(occupation.toLowerCase())) {
      return new HighRiskOccupationPolicy();
    }
    
    return new AlwaysTruePolicy(); // No additional requirements
  }
}

// Usage
const underwritingService = new InsuranceUnderwritingService(
  riskAssessmentService,
  pricingService
);

const application = new PolicyApplication(
  'app-123',
  'cust-456',
  35,
  'good',
  false,
  'software engineer',
  120000,
  new Coverage('life', 1000000, 1000, 0),
  []
);

const decision = await underwritingService.evaluateApplication(application);

if (decision.isSuccess()) {
  console.log('Application approved with premium:', decision.value.premium);
} else {
  console.log('Application declined:', decision.error);
}
```

## Testing Policies

```typescript
describe('UnderwritingPolicy', () => {
  let policy: UnderwritingPolicy;
  
  beforeEach(() => {
    policy = new UnderwritingPolicy();
  });
  
  describe('standard applications', () => {
    it('should approve eligible application', () => {
      const application = createStandardApplication({
        age: 30,
        healthStatus: 'good',
        coverageAmount: 500000,
        annualIncome: 80000
      });
      
      const result = policy.check(application);
      expect(result.isSuccess()).toBe(true);
    });
    
    it('should reject underage applicant', () => {
      const application = createStandardApplication({
        age: 16
      });
      
      const result = policy.check(application);
      expect(result.isFailure()).toBe(true);
      expect(result.error.code).toBe('AGE_INELIGIBLE');
    });
    
    it('should reject excessive coverage', () => {
      const application = createStandardApplication({
        coverageAmount: 2000000,
        annualIncome: 50000 // 40x income requested
      });
      
      const result = policy.check(application);
      expect(result.isFailure()).toBe(true);
      expect(result.error.code).toBe('COVERAGE_EXCEEDS_LIMIT');
    });
  });
  
  describe('high-risk applications', () => {
    it('should have stricter requirements for high-risk', () => {
      const highRiskApp = createHighRiskApplication({
        healthStatus: 'good', // Not excellent
        coverageAmount: 500000,
        annualIncome: 100000
      });
      
      const result = policy.check(highRiskApp);
      expect(result.isFailure()).toBe(true);
      expect(result.error.code).toBe('HIGH_RISK_DECLINED');
    });
    
    it('should approve high-risk with excellent health', () => {
      const highRiskApp = createHighRiskApplication({
        healthStatus: 'excellent',
        coverageAmount: 400000,
        annualIncome: 100000, // 4x income, under 5x limit
        smokingStatus: false
      });
      
      const result = policy.check(highRiskApp);
      expect(result.isSuccess()).toBe(true);
    });
  });
});
```

## Best Practices

### 1. Keep Policies Focused

```typescript
// Bad - mixing multiple concerns
class EverythingPolicy implements IBusinessPolicy<Order> {
  check(order: Order): Result<Order, PolicyViolation> {
    // Checks customer, product, inventory, payment, shipping...
    // Too many responsibilities
  }
}

// Good - single responsibility
class PaymentMethodPolicy implements IBusinessPolicy<Order> {
  check(order: Order): Result<Order, PolicyViolation> {
    // Only checks if payment method is acceptable
  }
}

class ShippingEligibilityPolicy implements IBusinessPolicy<Order> {
  check(order: Order): Result<Order, PolicyViolation> {
    // Only checks shipping eligibility
  }
}
```

### 2. Use Clear Violation Codes

```typescript
// Bad - generic codes
new PolicyViolation('ERROR', 'Something went wrong');

// Good - specific, actionable codes
new PolicyViolation(
  'CREDIT_SCORE_BELOW_MINIMUM',
  'Credit score of 580 is below minimum requirement of 650',
  {
    actualScore: 580,
    minimumRequired: 650,
    improvementNeeded: 70
  }
);
```

### 3. Compose Policies Meaningfully

```typescript
// Good - clear composition
const loanApprovalPolicy = creditScorePolicy
  .and(incomeVerificationPolicy)
  .and(debtRatioPolicy)
  .and(employmentHistoryPolicy);

// Better - named compositions
const basicEligibilityPolicy = creditScorePolicy.and(incomeVerificationPolicy);
const financialHealthPolicy = debtRatioPolicy.and(assetVerificationPolicy);
const finalPolicy = basicEligibilityPolicy.and(financialHealthPolicy);
```

### 4. Use Factory Pattern for Complex Policies

```typescript
class PolicyFactory {
  static createLoanPolicy(params: {
    loanType: 'personal' | 'mortgage' | 'auto';
    amount: number;
    customerSegment: 'standard' | 'premium';
  }): IBusinessPolicy<LoanApplication> {
    // Build appropriate policy based on parameters
    switch (params.loanType) {
      case 'mortgage':
        return this.createMortgagePolicy(params);
      case 'auto':
        return this.createAutoLoanPolicy(params);
      default:
        return this.createPersonalLoanPolicy(params);
    }
  }
  
  private static createMortgagePolicy(params: any): IBusinessPolicy<LoanApplication> {
    // Specific mortgage requirements
    let policy = new MinimumCreditScoreSpecification(680)
      .and(new MinimumDownPaymentSpecification(0.20))
      .and(new PropertyAppraisalPolicy());
    
    if (params.amount > 500000) {
      policy = policy.and(new JumboLoanPolicy());
    }
    
    return policy;
  }
}
```

### 5. Document Policy Rationale

```typescript
/**
 * High-Value Transaction Policy
 * 
 * Business Rationale:
 * - Transactions over $10,000 require additional verification
 * - Reduces fraud risk and ensures regulatory compliance
 * - Based on: Company Policy DOC-123, Regulation XYZ
 * 
 * Requirements:
 * 1. Customer must be verified
 * 2. Two-factor authentication must be completed
 * 3. Transaction must be approved by senior staff
 */
class HighValueTransactionPolicy implements IBusinessPolicy<Transaction> {
  private static readonly THRESHOLD = 10000;
  
  check(transaction: Transaction): Result<Transaction, PolicyViolation> {
    if (transaction.amount <= HighValueTransactionPolicy.THRESHOLD) {
      return Result.ok(transaction);
    }
    
    // Implementation...
  }
}
```

### 6. Consider Policy Versioning

```typescript
// Track policy versions for audit and rollback
class VersionedPolicy<T> implements IBusinessPolicy<T> {
  constructor(
    private readonly version: string,
    private readonly effectiveDate: Date,
    private readonly policy: IBusinessPolicy<T>,
    private readonly changeLog: string
  ) {}
  
  check(entity: T): Result<T, PolicyViolation> {
    const result = this.policy.check(entity);
    
    if (result.isFailure()) {
      return Result.fail(new PolicyViolation(
        result.error.code,
        result.error.message,
        {
          ...result.error.details,
          policyVersion: this.version,
          effectiveDate: this.effectiveDate
        }
      ));
    }
    
    return result;
  }
}
```

## Performance Considerations

### 1. Cache Expensive Policy Checks

```typescript
class CachedPolicy<T> implements IBusinessPolicy<T> {
  private cache = new Map<string, boolean>();
  
  constructor(
    private readonly policy: IBusinessPolicy<T>,
    private readonly keyGenerator: (entity: T) => string,
    private readonly ttl: number = 300000 // 5 minutes
  ) {}
  
  isSatisfiedBy(entity: T): boolean {
    const key = this.keyGenerator(entity);
    const cached = this.cache.get(key);
    
    if (cached !== undefined) {
      return cached;
    }
    
    const result = this.policy.isSatisfiedBy(entity);
    this.cache.set(key, result);
    
    // Clear cache after TTL
    setTimeout(() => this.cache.delete(key), this.ttl);
    
    return result;
  }
}
```

### 2. Lazy Policy Evaluation

```typescript
class LazyCompositePolicy<T> implements IBusinessPolicy<T> {
  check(entity: T): Result<T, PolicyViolation> {
    // For AND: stop at first failure
    // For OR: stop at first success
    // This is already implemented in CompositePolicy
  }
}
```

## Conclusion

Business Policies in DomainTS provide:

- **Strategic Encoding**: Business strategies as executable code
- **Flexibility**: Policies can change without modifying core domain
- **Composition**: Complex policies from simple building blocks
- **Clarity**: Explicit business decisions with clear violations
- **Maintainability**: Centralized policy management
- **Auditability**: Clear trail of policy decisions

The Business Policy pattern enables you to separate high-level business decisions from core domain logic, making your system more adaptable to changing business requirements while maintaining a clean, understandable domain model.

---

# Domain Services in DomainTS

## Overview

Domain Services are a crucial tactical pattern in Domain-Driven Design (DDD) that encapsulate domain logic which doesn't naturally fit within entities or value objects. The DomainTS library provides a comprehensive, modular implementation of domain services, allowing you to organize and manage complex business operations while maintaining clean separation of concerns.

This guide will walk you through the Domain Services module, explaining its components, how they work together, and best practices for implementation.

## Table of Contents

1. [Core Concepts](#core-concepts)
2. [Domain Service Interfaces](#domain-service-interfaces)
3. [Base Implementations](#base-implementations)
4. [Service Registration and Discovery](#service-registration-and-discovery)
5. [Service Container and Dependency Injection](#service-container-and-dependency-injection)
6. [Fluent API for Service Configuration](#fluent-api-for-service-configuration)
7. [Event Integration](#event-integration)
8. [Transactional Operations](#transactional-operations)
9. [Async Initialization](#async-initialization)
10. [Best Practices](#best-practices)
11. [Complete Example](#complete-example)

## Concepts Overview

Before diving into implementation details, let's understand what each concept means and when to use it:

### 1. Core Concepts

**What**: Fundamental principles and patterns of Domain Services in DDD.

**Why important**: Provides the theoretical foundation for understanding how Domain Services fit into the broader DDD approach.

**When to use**: When starting with DDD or designing your domain model.

**Examples**:

- Implementing business rules that span multiple entities
- Coordinating operations across aggregates
- Implementing domain processes like validation, calculation, or transformation

### 2. Domain Service Interfaces

**What**: The contract definitions for domain services in your application.

**Why important**: Interfaces define capabilities, promote loose coupling, and enable polymorphism.

**When to use**: When defining what a domain service can do or when implementing dependency injection.

**Examples**:

- Basic service identification via `IDomainService`
- Event publication capability via `IEventBusAware`
- Transaction participation via `IUnitOfWorkAware`
- Lifecycle management via `IAsyncDomainService`

### 3. Base Implementations

**What**: Ready-to-extend abstract classes implementing the service interfaces.

**Why important**: Reduces boilerplate code and ensures consistent implementation.

**When to use**: When creating new domain services to avoid reimplementing common functionality.

**Examples**:

- Use `BaseDomainService` for simple services
- Use `EventAwareDomainService` for services that publish domain events
- Use `UnitOfWorkAwareDomainService` for services requiring transactional consistency
- Use `AsyncDomainService` for services with async initialization needs

### 4. Service Registration and Discovery

**What**: Mechanisms for registering services and locating them by identifier.

**Why important**: Enables dependency resolution and service location without tight coupling.

**When to use**: When organizing services and managing their lifecycle in your application.

**Examples**:

- Maintaining a catalog of all available services
- Finding services by ID at runtime
- Checking if a specific service is available
- Managing service lifecycles (registration, retrieval, removal)

### 5. Service Container and Dependency Injection

**What**: Infrastructure for managing service dependencies and their initialization order.

**Why important**: Automates the complex task of resolving dependencies and initializing services.

**When to use**: In applications with multiple services that depend on each other.

**Examples**:

- Resolving a complex dependency graph of services
- Automatic wiring of infrastructure components (event bus, unit of work)
- Detecting circular dependencies
- Ensuring services are initialized in the correct order

### 6. Fluent API for Service Configuration

**What**: Expressive builder pattern API for configuring services.

**Why important**: Makes service configuration more readable and less error-prone.

**When to use**: When setting up services with complex configurations or dependencies.

**Examples**:

- Building a service with multiple dependencies
- Configuring a service with specific infrastructure
- Creating and registering services in a single chain
- Building a custom service registry

### 7. Event Integration

**What**: Infrastructure for domain services to publish and subscribe to domain events.

**Why important**: Enables loose coupling through event-driven communication.

**When to use**: When services need to communicate state changes or trigger processes.

**Examples**:

- Publishing events when important domain operations complete
- Notifying other parts of the system about state changes
- Implementing event sourcing patterns
- Creating audit trails of domain operations

### 8. Transactional Operations

**What**: Support for executing operations in a transactional context.

**Why important**: Ensures atomicity and consistency across aggregates.

**When to use**: When operations affect multiple aggregates or require all-or-nothing semantics.

**Examples**:

- Transferring items between orders
- Processing a payment and updating order status
- Coordinating inventory adjustments across multiple products
- Recording complex business operations that must succeed or fail as a unit

### 9. Async Initialization

**What**: Support for asynchronous service initialization and cleanup.

**Why important**: Enables resources that require async setup/teardown to be properly managed.

**When to use**: When services rely on external resources or need async configuration.

**Examples**:

- Connecting to external APIs or databases
- Setting up event subscriptions
- Loading cached data
- Initializing complex resources that require async operations

### 10. Best Practices

**What**: Recommended patterns and approaches for domain service implementation.

**Why important**: Helps avoid common pitfalls and ensures alignment with DDD principles.

**When to use**: Throughout your domain service implementations.

**Examples**:

- Keeping services stateless
- Properly defining transaction boundaries
- Organizing services by bounded context
- Effective error handling strategies

## Core Concepts

In DDD, Domain Services:

- Implement operations that involve multiple aggregates
- Represent processes or transformations that are stateless
- Encapsulate complex domain logic that doesn't belong to any specific entity
- Coordinate activities across different parts of the domain

The DomainTS implementation follows these principles while providing additional infrastructure for:

- Dependency injection and service location
- Integration with domain events
- Transactional consistency through Unit of Work pattern
- Asynchronous initialization and resource management

## Domain Service Interfaces

The foundation of the Domain Services module is the `IDomainService` interface:

```typescript
interface IDomainService {
  readonly serviceId?: string;
}
```

This minimal interface is extended by more specialized interfaces:

```typescript
interface IEventBusAware {
  setEventBus(eventBus: IEventBus): void;
}

interface IUnitOfWorkAware {
  setUnitOfWork(unitOfWork: IUnitOfWork): void;
  clearUnitOfWork(): void;
}

interface IAsyncDomainService extends IDomainService {
  initialize?(): Promise<void>;
  dispose?(): Promise<void>;
}
```

These interfaces define capabilities that services can implement:

- **IEventBusAware**: For services that need to publish domain events
- **IUnitOfWorkAware**: For services that participate in transactions
- **IAsyncDomainService**: For services with asynchronous initialization/cleanup

## Base Implementations

To simplify implementation, the library provides base classes for common service types:

```typescript
// Base class for all domain services
abstract class BaseDomainService implements IDomainService {
  constructor(public readonly serviceId: string) {}
}

// For services that publish events
abstract class EventAwareDomainService 
  extends BaseDomainService 
  implements IEventBusAware {
  // Implementation details...
}

// For services that need transactions
abstract class UnitOfWorkAwareDomainService 
  extends EventAwareDomainService 
  implements IUnitOfWorkAware {
  // Implementation details...
}

// For services with async lifecycle
abstract class AsyncDomainService 
  extends BaseDomainService 
  implements IAsyncDomainService {
  // Implementation details...
}
```

Choose the appropriate base class based on your service's needs. For example, if your service needs to publish events and perform transactions, extend `UnitOfWorkAwareDomainService`.

## Service Registration and Discovery

To make services available throughout your application, DomainTS provides a registry system:

```typescript
interface IDomainServiceRegistry {
  register<T extends IDomainService>(service: T, serviceId?: string): void;
  get<T extends IDomainService>(serviceId: string): T | undefined;
  has(serviceId: string): boolean;
  remove(serviceId: string): boolean;
  getAll(): Map<string, IDomainService>;
  clear(): void;
}
```

The library includes a default implementation (`DefaultDomainServiceRegistry`) and a singleton access point (`GlobalServiceRegistry`):

```typescript
// Using the default registry
const registry = new DefaultDomainServiceRegistry();
registry.register(new MyDomainService("my-service"));
const service = registry.get<MyDomainService>("my-service");

// Using the global registry
const globalRegistry = GlobalServiceRegistry.getInstance();
globalRegistry.register(new MyDomainService("global-service"));
const globalService = globalRegistry.get<MyDomainService>("global-service");
```

## Service Container and Dependency Injection

For more complex scenarios with service dependencies, DomainTS provides a container:

```typescript
const container = new DomainServiceContainer();

// Register services with dependencies
container.registerFactory('orderService', 
  () => new OrderService(), 
  ['productService', 'customerService']);

container.registerFactory('productService', 
  () => new ProductService());

container.registerFactory('customerService', 
  () => new CustomerService());

// Initialize all services (resolving dependencies)
container.initializeServices();

// Retrieve a service
const orderService = container.getService<OrderService>('orderService');
```

The container:

- Tracks dependencies between services
- Ensures initialization in the correct order
- Detects circular dependencies
- Configures services with infrastructure components

## Fluent API for Service Configuration

For a more expressive way to configure services, use the builder pattern:

```typescript
// Using ServiceRegistryBuilder
const registry = new ServiceRegistryBuilder()
  .withEventBus(eventBus)
  .withUnitOfWork(unitOfWork)
  .register(new LoggingService())
  .build();

// Using ServiceBuilder
const orderService = new ServiceBuilder<OrderService>(registry, 'orderService', 
  (productRepo, customerRepo) => new OrderService(productRepo, customerRepo))
  .dependsOn('productRepository')
  .dependsOn('customerRepository')
  .withEventBus(eventBus)
  .buildAndRegister();
```

This approach provides:

- Type-safe dependency injection
- Fluent configuration of infrastructure components
- Clear visualization of service dependencies

## Event Integration

Domain Services often need to publish domain events. The `EventAwareDomainService` base class makes this simple:

```typescript
class OrderProcessingService extends EventAwareDomainService {
  constructor() {
    super('order-processor');
  }
  
  processOrder(order: Order): void {
    // Process order logic...
    
    // Publish domain event
    this.publishEvent(new OrderProcessedEvent(order.id));
  }
}
```

Services can be configured with an event bus:

- Automatically by the service container
- Explicitly through the builder API
- Manually by calling `setEventBus()`

## Transactional Operations

For operations that span multiple aggregates, use transactional domain services:

```typescript
class OrderManagementService extends UnitOfWorkAwareDomainService {
  constructor() {
    super('order-manager');
  }
  
  async transferOrderItems(sourceOrderId: string, targetOrderId: string): Promise<void> {
    return this.executeInTransaction(async () => {
      const orderRepo = this.getRepository<OrderRepository>('orderRepository');
      
      const sourceOrder = await orderRepo.findById(sourceOrderId);
      const targetOrder = await orderRepo.findById(targetOrderId);
      
      // Transfer logic...
      
      await orderRepo.save(sourceOrder);
      await orderRepo.save(targetOrder);
    });
  }
}
```

The `executeInTransaction` method:

- Begins a transaction automatically
- Commits on successful completion
- Rolls back if an error occurs
- Coordinates event publication after commit

## Async Initialization

Services that need asynchronous setup or cleanup can use the async lifecycle:

```typescript
@DomainService({
  serviceId: 'external-api-service',
  async: true
})
class ExternalApiService extends AsyncDomainService {
  private client: ApiClient;
  
  constructor() {
    super('external-api-service');
  }
  
  async initialize(): Promise<void> {
    this.client = await ApiClient.connect();
    // Setup is complete, service is ready to use
  }
  
  async dispose(): Promise<void> {
    await this.client.disconnect();
    // Resources are released
  }
  
  async fetchData(id: string): Promise<Data> {
    return this.client.getData(id);
  }
}
```

Async services:

- Are initialized by the container during `initializeServices()`
- Can be explicitly initialized using the builder API
- Should be awaited before use

## Best Practices

When implementing domain services with DomainTS:

1. **Use the right base class**: Choose the appropriate base class based on your service's needs.

2. **Keep services stateless**: Domain services should not maintain state between operations. Use aggregates for stateful domain concepts.

3. **Service ID conventions**: Use consistent naming for service IDs, like 'order-processor' or 'customer-manager'.

4. **Avoid circular dependencies**: Design your services to avoid circular dependencies, which will cause initialization failures.

5. **Transactional boundaries**: Place transaction boundaries at the highest appropriate level - typically within domain service methods.

6. **Service responsibilities**: Each service should have a single, focused responsibility within the domain.

7. **Use dependency injection**: Prefer constructor injection via the container or builder rather than manual service location.

8. **Domain event publication**: Publish domain events to communicate important domain changes to other parts of the system.

9. **Error handling**: Use the Result pattern or exceptions consistently within your services.

## Complete Example

Here's a complete example of defining, registering, and using domain services:

```typescript
// Define domain service
@DomainService({
  serviceId: 'order-processor',
  dependencies: ['order-repository', 'payment-service'],
  transactional: true,
  publishesEvents: true
})
class OrderProcessingService extends UnitOfWorkAwareDomainService {
  constructor(
    private orderRepository: OrderRepository,
    private paymentService: PaymentService
  ) {
    super('order-processor');
  }
  
  async processOrder(orderId: string): Promise<Result<Order, Error>> {
    return this.executeInTransaction(async () => {
      // Retrieve order from repository
      const order = await this.orderRepository.findById(orderId);
      if (!order) {
        return Result.failure(new Error(`Order ${orderId} not found`));
      }
      
      // Process payment
      const paymentResult = await this.paymentService.processPayment(
        order.customerId, 
        order.totalAmount
      );
      
      if (paymentResult.isFailure()) {
        return Result.failure(paymentResult.error);
      }
      
      // Update order status
      order.markAsPaid(paymentResult.value.transactionId);
      await this.orderRepository.save(order);
      
      return Result.success(order);
    });
  }
}

// Register and configure services
const eventBus = new InMemoryEventBus();
const unitOfWork = new DatabaseUnitOfWork(eventBus);

// Setup repositories
const orderRepo = new SqlOrderRepository();
unitOfWork.registerRepository('order-repository', orderRepo);

// Configure service container
const container = new DomainServiceContainer(
  undefined, // Use default registry
  eventBus,
  () => unitOfWork
);

// Register services
container.registerFactory('payment-service', 
  () => new PaymentService());

container.registerFactory('order-processor', 
  () => new OrderProcessingService(
    container.getService<OrderRepository>('order-repository')!,
    container.getService<PaymentService>('payment-service')!
  ),
  ['order-repository', 'payment-service']
);

// Initialize all services
container.initializeServices();

// Use the service
const orderProcessor = container.getService<OrderProcessingService>('order-processor')!;
const result = await orderProcessor.processOrder('order-123');

if (result.isSuccess()) {
  console.log(`Order processed: ${result.value.id}`);
} else {
  console.error(`Order processing failed: ${result.error.message}`);
}
```

## Conclusion

Domain Services in DomainTS provide a powerful, flexible implementation of this important DDD pattern. By leveraging the provided interfaces, base classes, and infrastructure components, you can create domain services that are:

- Focused on domain logic
- Properly integrated with domain events
- Transaction-aware
- Easily testable
- Well-organized with clear dependencies

This enables you to implement complex domain processes while maintaining a clean, maintainable codebase aligned with DDD principles.

