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
