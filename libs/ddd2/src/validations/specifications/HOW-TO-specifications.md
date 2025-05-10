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
