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
