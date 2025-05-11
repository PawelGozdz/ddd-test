Rozumiem, podzielę dokument na 4 części. Zacznę od części 1/4:

# DomainTS Library - LLM Knowledge Base

## Introduction

DomainTS is an independent, modular library supporting Domain-Driven Design (DDD) implementation in TypeScript. Designed with maximum flexibility and minimal coupling between components, it allows you to choose and use only the elements you actually need.

### Key Principles

1. **Full modularity** - use only the components you need
2. **Minimal coupling** - components work independently with clear and minimal dependencies
3. **Pure TypeScript** - designed with full type support and modern TS features in mind
4. **Production-ready** - tested, well-documented, and based on proven patterns
5. **Framework-agnostic** - works independently of any framework
6. **Practice-oriented** - focuses on real DDD implementation challenges

### Problem Statement

DomainTS addresses common challenges in DDD implementation:
- Lack of flexible, modular DDD libraries for TypeScript
- Tight coupling between DDD building blocks in existing solutions
- Difficulty in progressive adoption of DDD patterns
- Need for type-safe domain modeling
- Complexity in handling domain events and integrations

### Target Audience

- Teams implementing Domain-Driven Design in TypeScript projects
- Developers looking for modular DDD building blocks
- Projects requiring flexible event-driven architecture
- Applications needing strong domain modeling with TypeScript

### Quick Overview

The library consists of independent modules that can be used separately or combined as needed. Start with basic domain modeling (Entities, Value Objects), then progressively add Events, Repositories, and more advanced patterns as your needs grow.

## Inspirations and Best Practices

DomainTS has been inspired by proven solutions and best practices from other DDD implementations:

### Axon Framework (Java)

- **Event handling approach** - separation of publication and handling
- **CQRS support** - command-query responsibility segregation
- **Event tracking** - correlation and flow tracking support
- **Event-driven aggregates** - domain event emission and handling

### EventFlow (C#/.NET)

- **Aggregate structure** - elegant state management model
- **Optimistic concurrency control** - aggregate version management
- **Snapshotting** - optimization for aggregate state reconstruction
- **Strong typing** - leveraging advanced type system features

### Broadway (PHP)

- **Implementation simplicity** - approachable DDD implementation
- **Flexible event mapping** - easy handler matching
- **Process modeling** - long-running process coordination
- **Modularity focus** - cooperating but independent components

### Domain-Driven Design (Eric Evans)

- **Ubiquitous Language** - consistent naming in code and communication
- **Bounded Contexts** - clear boundaries between different domain models
- **Aggregates and consistency rules** - ensuring business invariants
- **Tactical patterns** - Entities, Value Objects, Domain Services

### Reactive Models and Event Sourcing

- **Reactive event processing** - asynchronous event handling
- **Event Sourcing patterns** - storing event history instead of state
- **Projections and read models** - materialized views for query optimization
- **Idempotency** - safe multiple event processing

## Modular Architecture

### Module Dependencies

- **Core Domain**: Foundation with no external dependencies
- **Events**: Depends on Core Domain for event metadata
- **Repositories**: Can optionally integrate with Events
- **Domain Services**: Can optionally use Event Bus for publishing, Unit of Work for transactional
- **Unit of Work**: Coordinates Repositories and handles Event publication
- **Anti-Corruption Layer**: Translates between bounded contexts
- **Patterns**: Independent implementations that can enhance domain models

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Value Objects](#value-objects)
4. [Entities](#entities)
5. [Aggregates](#aggregates)
6. [Specifications](#specifications)
7. [Business Rules](#business-rules)
8. [Business Policies](#business-policies)
9. [Validation](#validation)
10. [Domain Services](#domain-services)
11. [Domain Events](#domain-events)
12. [Event Bus](#event-bus)
13. [Event Dispatcher](#event-dispatcher)
14. [Error Handling](#error-handling)
15. [Repository Pattern](#repository-pattern)
16. [Unit of Work](#unit-of-work)
17. [Outbox Pattern](#outbox-pattern)
18. [Result Pattern](#result-pattern)
19. [Utilities (LibUtils & SafeRun)](#utilities)
20. [Advanced Integration Examples](#advanced-integration-examples)

---

## Overview

DomainTS is a comprehensive TypeScript library implementing Domain-Driven Design (DDD) patterns. It provides type-safe implementations of tactical DDD patterns, enabling developers to build robust domain models with clean architecture principles.

### Core Philosophy

- **Type Safety**: Full TypeScript support with generics
- **Domain First**: Focus on business logic, not technical details
- **Modularity**: Use only what you need
- **Integration**: Patterns work seamlessly together
- **Testability**: All components are easily testable

### Primary Use Cases

- Building complex business applications
- Implementing microservices with DDD
- Migrating legacy systems to domain-driven architecture
- Creating event-driven systems
- Ensuring business rule consistency

### When to Use DomainTS

- Complex business logic requiring clear domain models
- Applications with multiple bounded contexts
- Systems requiring event sourcing capabilities
- Projects needing strong type safety and domain validation

### When NOT to Use DomainTS

- Simple CRUD applications without complex business logic
- Prototypes or proof-of-concepts
- Applications with minimal business rules
- Projects where team lacks DDD knowledge

---

## Getting Started

### Installation

```typescript
npm install domaints
```

### Basic Setup

```typescript
import { 
  ValueObject, 
  Entity, 
  AggregateRoot,
  DomainEvent,
  Repository 
} from 'domaints';

// Start with simple value objects and entities
class Email extends ValueObject<string> {
  constructor(value: string) {
    super(value);
    this.validate();
  }
  
  protected validate(): void {
    if (!this.value.includes('@')) {
      throw new Error('Invalid email format');
    }
  }
}
```

---

## Value Objects

### What are Value Objects?

Value Objects represent descriptive aspects of the domain with no conceptual identity. They are immutable and compared by their values rather than identity.

### Primary Use Cases

- Representing domain concepts like Money, Email, Address
- Ensuring type safety instead of using primitives
- Encapsulating validation rules
- Creating self-documenting code

### When to Use

- When the concept has no identity
- When equality is based on attributes
- When you need immutability
- When encapsulating validation logic

### When NOT to Use

- When the object needs unique identity
- When the object has a lifecycle
- When the object needs to be tracked over time

### Core Components

#### BaseValueObject

```typescript
abstract class BaseValueObject<T> {
  protected readonly value: T;
  
  constructor(value: T) {
    this.value = Object.freeze(value);
  }
  
  equals(other: BaseValueObject<T>): boolean {
    return JSON.stringify(this.value) === JSON.stringify(other.value);
  }
  
  getValue(): T {
    return this.value;
  }
}
```

### Basic Examples

#### Email Value Object

```typescript
class Email extends BaseValueObject<string> {
  constructor(value: string) {
    super(value);
    this.validate();
  }
  
  private validate(): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.value)) {
      throw new Error('Invalid email format');
    }
  }
  
  getDomain(): string {
    return this.value.split('@')[1];
  }
}

// Usage
const email1 = new Email('user@example.com');
const email2 = new Email('user@example.com');
console.log(email1.equals(email2)); // true
console.log(email1.getDomain()); // 'example.com'
```

#### Money Value Object

```typescript
interface MoneyProps {
  amount: number;
  currency: string;
}

class Money extends BaseValueObject<MoneyProps> {
  constructor(amount: number, currency: string) {
    super({ amount, currency });
    this.validate();
  }
  
  private validate(): void {
    if (this.value.amount < 0) {
      throw new Error('Amount cannot be negative');
    }
    if (this.value.currency.length !== 3) {
      throw new Error('Currency must be 3-letter code');
    }
  }
  
  add(other: Money): Money {
    if (this.value.currency !== other.value.currency) {
      throw new Error('Cannot add different currencies');
    }
    return new Money(
      this.value.amount + other.value.amount,
      this.value.currency
    );
  }
  
  multiply(factor: number): Money {
    return new Money(
      this.value.amount * factor,
      this.value.currency
    );
  }
}

// Usage
const price = new Money(99.99, 'USD');
const tax = price.multiply(0.08);
const total = price.add(tax);
```

### Advanced Examples

#### Address Value Object
```typescript
interface AddressProps {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

class Address extends BaseValueObject<AddressProps> {
  constructor(props: AddressProps) {
    super(props);
    this.validate();
  }
  
  private validate(): void {
    const { street, city, state, zipCode, country } = this.value;
    
    if (!street || !city || !state || !zipCode || !country) {
      throw new Error('All address fields are required');
    }
    
    // US ZIP code validation
    if (country === 'US' && !/^\d{5}(-\d{4})?$/.test(zipCode)) {
      throw new Error('Invalid US ZIP code format');
    }
  }
  
  format(): string {
    const { street, city, state, zipCode, country } = this.value;
    return `${street}\n${city}, ${state} ${zipCode}\n${country}`;
  }
  
  isInState(state: string): boolean {
    return this.value.state === state;
  }
}
```

#### DateRange Value Object
```typescript
interface DateRangeProps {
  startDate: Date;
  endDate: Date;
}

class DateRange extends BaseValueObject<DateRangeProps> {
  constructor(startDate: Date, endDate: Date) {
    super({ startDate, endDate });
    this.validate();
  }
  
  private validate(): void {
    if (this.value.startDate >= this.value.endDate) {
      throw new Error('Start date must be before end date');
    }
  }
  
  contains(date: Date): boolean {
    return date >= this.value.startDate && date <= this.value.endDate;
  }
  
  overlaps(other: DateRange): boolean {
    return this.value.startDate <= other.value.endDate &&
           other.value.startDate <= this.value.endDate;
  }
  
  getDurationInDays(): number {
    const diff = this.value.endDate.getTime() - this.value.startDate.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
}
```

### Standalone Usage
```typescript
// Value Objects can be used independently
const email = new Email('contact@company.com');
const phone = new PhoneNumber('+1-555-123-4567');
const coordinates = new GeoCoordinates(40.7128, -74.0060);

// They work well in data structures
const contactInfo = {
  email,
  phone,
  location: coordinates
};

// And in functions
function validateContact(email: Email, phone: PhoneNumber): boolean {
  return email.getDomain() !== 'example.com' && 
         phone.getCountryCode() === '+1';
}
```

### Integration with Other Patterns
```typescript
// With Entities
class Customer extends Entity<CustomerId> {
  constructor(
    id: CustomerId,
    private email: Email,
    private address: Address,
    private creditLimit: Money
  ) {
    super(id);
  }
  
  changeEmail(newEmail: Email): void {
    this.email = newEmail;
    this.addDomainEvent(new CustomerEmailChanged(this.id, newEmail));
  }
}

// With Specifications
class HighValueOrderSpecification implements ISpecification<Order> {
  constructor(private threshold: Money) {}
  
  isSatisfiedBy(order: Order): boolean {
    return order.total.isGreaterThan(this.threshold);
  }
}
```

### Best Practices
1. Always validate in constructor
2. Make all properties readonly
3. Provide meaningful methods beyond getters
4. Override equals() for proper comparison
5. Consider factory methods for complex creation

### Common Pitfalls
1. Making value objects mutable
2. Adding identity to value objects
3. Not validating invariants
4. Creating anemic value objects without behavior

---

## Entities

### What are Entities?
Entities are domain objects with identity that persists through time and different states. Unlike value objects, entities are distinguished by their identity rather than their attributes.

### Primary Use Cases
- Representing domain objects with unique identity
- Tracking objects through their lifecycle
- Maintaining continuity through state changes

### When to Use
- When object identity matters
- When tracking changes over time
- When objects have a lifecycle
- When you need to reference objects uniquely

### When NOT to Use
- When equality is based on attributes only
- When objects are immutable
- When there's no need to track individual instances

### Core Components

#### BaseEntity
```typescript
abstract class BaseEntity<TId extends EntityId> {
  protected readonly id: TId;
  
  constructor(id: TId) {
    this.id = id;
  }
  
  getId(): TId {
    return this.id;
  }
  
  equals(other: BaseEntity<TId>): boolean {
    return this.id.equals(other.id);
  }
}
```

#### EntityId
```typescript
class EntityId<T = string> extends ValueObject<T> {
  static create(): EntityId<string> {
    return new EntityId(uuid());
  }
  
  static from<T>(value: T): EntityId<T> {
    return new EntityId(value);
  }
}
```

### Basic Examples

#### User Entity
```typescript
class UserId extends EntityId<string> {}

class User extends BaseEntity<UserId> {
  private email: Email;
  private passwordHash: string;
  private isActive: boolean;
  private createdAt: Date;
  private lastLoginAt?: Date;
  
  constructor(
    id: UserId,
    email: Email,
    passwordHash: string
  ) {
    super(id);
    this.email = email;
    this.passwordHash = passwordHash;
    this.isActive = true;
    this.createdAt = new Date();
  }
  
  static create(email: Email, passwordHash: string): User {
    return new User(UserId.create(), email, passwordHash);
  }
  
  changeEmail(newEmail: Email): void {
    this.email = newEmail;
  }
  
  deactivate(): void {
    this.isActive = false;
  }
  
  recordLogin(): void {
    this.lastLoginAt = new Date();
  }
  
  canLogin(): boolean {
    return this.isActive;
  }
}
```

#### Product Entity
```typescript
class ProductId extends EntityId<string> {}

class Product extends BaseEntity<ProductId> {
  private name: string;
  private description: string;
  private price: Money;
  private sku: string;
  private stockQuantity: number;
  
  constructor(
    id: ProductId,
    name: string,
    description: string,
    price: Money,
    sku: string,
    stockQuantity: number
  ) {
    super(id);
    this.name = name;
    this.description = description;
    this.price = price;
    this.sku = sku;
    this.stockQuantity = stockQuantity;
  }
  
  changePrice(newPrice: Money): void {
    if (newPrice.getValue().amount <= 0) {
      throw new Error('Price must be positive');
    }
    this.price = newPrice;
  }
  
  adjustStock(quantity: number): void {
    const newQuantity = this.stockQuantity + quantity;
    if (newQuantity < 0) {
      throw new Error('Insufficient stock');
    }
    this.stockQuantity = newQuantity;
  }
  
  isInStock(): boolean {
    return this.stockQuantity > 0;
  }
}
```

### Advanced Examples

#### Account Entity (Banking Domain)
```typescript
class AccountId extends EntityId<string> {}

enum AccountStatus {
  ACTIVE = 'ACTIVE',
  FROZEN = 'FROZEN',
  CLOSED = 'CLOSED'
}

class BankAccount extends BaseEntity<AccountId> {
  private accountNumber: string;
  private balance: Money;
  private status: AccountStatus;
  private owner: CustomerId;
  private transactions: Transaction[] = [];
  private overdraftLimit: Money;
  
  constructor(
    id: AccountId,
    accountNumber: string,
    owner: CustomerId,
    initialBalance: Money,
    overdraftLimit: Money
  ) {
    super(id);
    this.accountNumber = accountNumber;
    this.owner = owner;
    this.balance = initialBalance;
    this.overdraftLimit = overdraftLimit;
    this.status = AccountStatus.ACTIVE;
  }
  
  deposit(amount: Money): void {
    this.ensureActive();
    this.balance = this.balance.add(amount);
    this.recordTransaction(TransactionType.DEPOSIT, amount);
  }
  
  withdraw(amount: Money): void {
    this.ensureActive();
    const newBalance = this.balance.subtract(amount);
    
    if (newBalance.isLessThan(this.overdraftLimit.negate())) {
      throw new Error('Exceeds overdraft limit');
    }
    
    this.balance = newBalance;
    this.recordTransaction(TransactionType.WITHDRAWAL, amount);
  }
  
  freeze(): void {
    if (this.status === AccountStatus.CLOSED) {
      throw new Error('Cannot freeze closed account');
    }
    this.status = AccountStatus.FROZEN;
  }
  
  private ensureActive(): void {
    if (this.status !== AccountStatus.ACTIVE) {
      throw new Error(`Account is ${this.status}`);
    }
  }
  
  private recordTransaction(type: TransactionType, amount: Money): void {
    this.transactions.push(new Transaction(type, amount, new Date()));
  }
}
```

#### Employee Entity (HR Domain)
```typescript
class EmployeeId extends EntityId<string> {}

class Employee extends BaseEntity<EmployeeId> {
  private personalInfo: PersonalInfo;
  private position: Position;
  private department: DepartmentId;
  private salary: Money;
  private manager?: EmployeeId;
  private subordinates: EmployeeId[] = [];
  private performanceReviews: PerformanceReview[] = [];
  
  constructor(
    id: EmployeeId,
    personalInfo: PersonalInfo,
    position: Position,
    department: DepartmentId,
    salary: Money
  ) {
    super(id);
    this.personalInfo = personalInfo;
    this.position = position;
    this.department = department;
    this.salary = salary;
  }
  
  promote(newPosition: Position, salaryIncrease: Money): void {
    if (newPosition.level <= this.position.level) {
      throw new Error('New position must be higher level');
    }
    
    this.position = newPosition;
    this.salary = this.salary.add(salaryIncrease);
  }
  
  assignManager(managerId: EmployeeId): void {
    if (managerId.equals(this.id)) {
      throw new Error('Employee cannot be their own manager');
    }
    this.manager = managerId;
  }
  
  addSubordinate(subordinateId: EmployeeId): void {
    if (subordinateId.equals(this.id)) {
      throw new Error('Employee cannot be their own subordinate');
    }
    if (this.subordinates.some(id => id.equals(subordinateId))) {
      throw new Error('Subordinate already exists');
    }
    this.subordinates.push(subordinateId);
  }
  
  recordPerformanceReview(review: PerformanceReview): void {
    this.performanceReviews.push(review);
  }
  
  getAverageRating(): number {
    if (this.performanceReviews.length === 0) return 0;
    
    const sum = this.performanceReviews.reduce(
      (acc, review) => acc + review.rating, 
      0
    );
    return sum / this.performanceReviews.length;
  }
}
```

### Standalone Usage
```typescript
// Create and manipulate entities independently
const user = User.create(
  new Email('john@example.com'),
  'hashedPassword123'
);

user.changeEmail(new Email('john.doe@example.com'));
user.recordLogin();

// Entities can be used in collections
const users = new Map<string, User>();
users.set(user.getId().getValue(), user);

// And passed to functions
function authenticateUser(user: User, password: string): boolean {
  return user.canLogin() && user.validatePassword(password);
}
```

### Integration with Other Patterns
```typescript
// With Value Objects
class Order extends BaseEntity<OrderId> {
  private items: OrderItem[] = [];
  private shippingAddress: Address;
  private total: Money;
  
  addItem(product: Product, quantity: number): void {
    const price = product.getPrice();
    const itemTotal = price.multiply(quantity);
    
    this.items.push(new OrderItem(product.getId(), quantity, price));
    this.total = this.calculateTotal();
  }
}

// With Domain Events
class Customer extends BaseEntity<CustomerId> {
  private events: DomainEvent[] = [];
  
  changeEmail(newEmail: Email): void {
    const oldEmail = this.email;
    this.email = newEmail;
    
    this.events.push(new CustomerEmailChanged(
      this.id,
      oldEmail,
      newEmail
    ));
  }
  
  getDomainEvents(): DomainEvent[] {
    return [...this.events];
  }
  
  clearDomainEvents(): void {
    this.events = [];
  }
}
```

### Best Practices
1. Always use meaningful identifiers
2. Encapsulate business logic in methods
3. Validate state changes
4. Keep entities focused on their core responsibility
5. Use factory methods for complex creation

### Common Pitfalls
1. Exposing mutable collections directly
2. Not validating state transitions
3. Putting too much logic in entities
4. Using primitive types for IDs

---

## Aggregates

### What are Aggregates?
Aggregates are clusters of domain objects that are treated as a single unit. The aggregate root is the only entry point for external objects and ensures consistency of changes within the aggregate boundary. In DomainTS, aggregates use event sourcing patterns with the `apply` method and event handlers.

### Primary Use Cases
- Enforcing invariants across related objects
- Defining transaction boundaries
- Managing complex domain relationships
- Implementing event sourcing
- Supporting snapshots for performance
- Handling event versioning

### When to Use
- When you have invariants spanning multiple entities
- When you need to ensure consistency
- When implementing event sourcing
- When you need event replay capabilities
- When versioning events is required

### When NOT to Use
- For simple CRUD operations
- When entities have no invariants between them
- When event sourcing adds unnecessary complexity

### Core Components

#### AggregateRoot
```typescript
abstract class AggregateRoot<TId = string, TState = any, TMeta = object> 
  extends BaseEntity<TId> {
  
  private _events: IExtendedDomainEvent[] = [];
  private _version: number = 0;
  private _initialVersion: number = 0;
  private _features: {
    snapshots: boolean;
    versioning: boolean;
  } = {
    snapshots: false,
    versioning: false
  };
  
  // Apply domain event
  protected apply(eventType: string, payload: any, metadata?: Partial<IEventMetadata>): void;
  protected apply(domainEvent: IDomainEvent, metadata?: Partial<IEventMetadata>): void;
  
  // Event handling
  private _handleEvent<P = any>(event: IExtendedDomainEvent<P>): void {
    if (this._features.versioning) {
      this._handleVersionedEvent(event);
    } else {
      const handlerMethod = `on${event.eventType}`;
      if (typeof this[handlerMethod] === 'function') {
        this[handlerMethod](event.payload, event.metadata);
      }
    }
  }
  
  // Event sourcing features
  public loadFromHistory(events: IExtendedDomainEvent[]): void;
  public getDomainEvents(): ReadonlyArray<IExtendedDomainEvent>;
  public clearDomainEvents(): void;
  
  // Snapshot features
  public enableSnapshots(): this;
  public createSnapshot(metadata?: TMeta): ISnapshot<TState, TMeta>;
  public restoreFromSnapshot(snapshot: ISnapshot<TState, TMeta>): void;
  protected abstract serializeState(): TState;
  protected abstract deserializeState(state: TState): void;
  
  // Versioning features
  public enableVersioning(): this;
  public registerUpcaster<OldPayload, NewPayload>(
    eventType: string,
    fromVersion: number,
    upcaster: IEventUpcaster<OldPayload, NewPayload>
  ): this;
  
  // Version management
  public getVersion(): number;
  public getInitialVersion(): number;
  public hasChanges(): boolean;
  public commit(): void;
}
```

#### Event Handler Pattern
```typescript
// Event handlers must follow the naming convention: on{EventType}
interface AggregateEventHandler {
  // Example: for OrderPlaced event
  onOrderPlaced?(payload: OrderPlacedPayload, metadata?: IEventMetadata): void;
  
  // Example: for PaymentProcessed event
  onPaymentProcessed?(payload: PaymentProcessedPayload, metadata?: IEventMetadata): void;
}
```

### Basic Examples

#### Order Aggregate with Event Sourcing
```typescript
class OrderId extends EntityId<string> {}

class Order extends AggregateRoot<OrderId> {
  private customerId!: CustomerId;
  private items: OrderItem[] = [];
  private status!: OrderStatus;
  private total!: Money;
  
  constructor(id: OrderId) {
    super(id);
  }
  
  static create(
    customerId: CustomerId,
    shippingAddress: Address
  ): Order {
    const order = new Order(OrderId.create());
    
    // Apply event instead of directly setting properties
    order.apply('OrderCreated', {
      orderId: order.getId(),
      customerId,
      shippingAddress,
      timestamp: new Date()
    });
    
    return order;
  }
  
  addItem(productId: ProductId, quantity: number, price: Money): void {
    // Validate business rules
    if (this.status !== OrderStatus.PENDING) {
      throw new Error('Cannot add items to non-pending order');
    }
    
    // Apply event - this will trigger onItemAdded
    this.apply('ItemAdded', {
      orderId: this.getId(),
      productId,
      quantity,
      price
    });
  }
  
  submit(): void {
    if (this.items.length === 0) {
      throw new Error('Cannot submit empty order');
    }
    
    this.apply('OrderSubmitted', {
      orderId: this.getId(),
      total: this.calculateTotal(),
      submittedAt: new Date()
    });
  }
  
  // Event handlers - called automatically by apply()
  protected onOrderCreated(payload: {
    orderId: OrderId;
    customerId: CustomerId;
    shippingAddress: Address;
    timestamp: Date;
  }): void {
    this.customerId = payload.customerId;
    this.status = OrderStatus.PENDING;
    this.total = Money.zero('USD');
  }
  
  protected onItemAdded(payload: {
    orderId: OrderId;
    productId: ProductId;
    quantity: number;
    price: Money;
  }): void {
    const item = new OrderItem(
      payload.productId,
      payload.quantity,
      payload.price
    );
    this.items.push(item);
    this.total = this.calculateTotal();
  }
  
  protected onOrderSubmitted(payload: {
    orderId: OrderId;
    total: Money;
    submittedAt: Date;
  }): void {
    this.status = OrderStatus.SUBMITTED;
    this.total = payload.total;
  }
  
  private calculateTotal(): Money {
    return this.items.reduce(
      (sum, item) => sum.add(item.getTotal()),
      Money.zero('USD')
    );
  }
}
```

#### Account Aggregate with Snapshots
```typescript
interface AccountState {
  accountNumber: string;
  balance: Money;
  status: AccountStatus;
  overdraftLimit: Money;
  holders: AccountHolder[];
  createdAt: Date;
}

class Account extends AggregateRoot<AccountId, AccountState> {
  private accountNumber!: string;
  private balance!: Money;
  private status!: AccountStatus;
  private overdraftLimit!: Money;
  private holders: AccountHolder[] = [];
  private createdAt!: Date;
  
  constructor(id: AccountId) {
    super(id);
    // Enable snapshots for better performance
    this.enableSnapshots();
  }
  
  static open(
    accountNumber: string,
    primaryHolder: AccountHolder,
    initialDeposit: Money
  ): Account {
    const account = new Account(AccountId.create());
    
    account.apply('AccountOpened', {
      accountId: account.getId(),
      accountNumber,
      primaryHolder,
      initialDeposit,
      createdAt: new Date()
    });
    
    return account;
  }
  
  deposit(amount: Money, reference: string): void {
    this.ensureActive();
    
    if (amount.isNegative() || amount.isZero()) {
      throw new Error('Deposit amount must be positive');
    }
    
    this.apply('MoneyDeposited', {
      accountId: this.getId(),
      amount,
      newBalance: this.balance.add(amount),
      reference,
      timestamp: new Date()
    });
  }
  
  withdraw(amount: Money, reference: string): void {
    this.ensureActive();
    
    const newBalance = this.balance.subtract(amount);
    if (newBalance.isLessThan(this.overdraftLimit.negate())) {
      throw new Error('Insufficient funds');
    }
    
    this.apply('MoneyWithdrawn', {
      accountId: this.getId(),
      amount,
      newBalance,
      reference,
      timestamp: new Date()
    });
  }
  
  // Event handlers
  protected onAccountOpened(payload: {
    accountId: AccountId;
    accountNumber: string;
    primaryHolder: AccountHolder;
    initialDeposit: Money;
    createdAt: Date;
  }): void {
    this.accountNumber = payload.accountNumber;
    this.balance = payload.initialDeposit;
    this.status = AccountStatus.ACTIVE;
    this.overdraftLimit = Money.zero('USD');
    this.holders = [payload.primaryHolder];
    this.createdAt = payload.createdAt;
  }
  
  protected onMoneyDeposited(payload: {
    accountId: AccountId;
    amount: Money;
    newBalance: Money;
    reference: string;
    timestamp: Date;
  }): void {
    this.balance = payload.newBalance;
  }
  
  protected onMoneyWithdrawn(payload: {
    accountId: AccountId;
    amount: Money;
    newBalance: Money;
    reference: string;
    timestamp: Date;
  }): void {
    this.balance = payload.newBalance;
  }
  
  // Snapshot implementation
  protected serializeState(): AccountState {
    return {
      accountNumber: this.accountNumber,
      balance: this.balance,
      status: this.status,
      overdraftLimit: this.overdraftLimit,
      holders: [...this.holders],
      createdAt: this.createdAt
    };
  }
  
  protected deserializeState(state: AccountState): void {
    this.accountNumber = state.accountNumber;
    this.balance = state.balance;
    this.status = state.status;
    this.overdraftLimit = state.overdraftLimit;
    this.holders = [...state.holders];
    this.createdAt = state.createdAt;
  }
  
  private ensureActive(): void {
    if (this.status !== AccountStatus.ACTIVE) {
      throw new Error(`Account is ${this.status}`);
    }
  }
}
```

### Advanced Examples

#### Aggregate with Event Versioning

```typescript
class Product extends AggregateRoot<ProductId> {
  private name!: string;
  private price!: Money;
  private description!: string;
  private category!: string;
  
  constructor(id: ProductId) {
    super(id);
    // Enable versioning for event evolution
    this.enableVersioning();
    
    // Register upcaster for PriceChanged event from v1 to v2
    this.registerUpcaster('PriceChanged', 1, {
      upcast: (oldPayload: { price: number }) => ({
        price: new Money(oldPayload.price, 'USD'),
        currency: 'USD',
        effectiveDate: new Date()
      })
    });
  }
  
  changePrice(newPrice: Money): void {
    this.apply('PriceChanged', {
      productId: this.getId(),
      price: newPrice,
      currency: newPrice.getCurrency(),
      effectiveDate: new Date()
    }, {
      eventVersion: 2 // Specify event version
    });
  }
  
  // Handler for version 1 events (legacy)
  protected onPriceChanged_v1(payload: { price: number }): void {
    this.price = new Money(payload.price, 'USD');
  }
  
  // Handler for version 2 events (current)
  protected onPriceChanged_v2(payload: { 
    price: Money; 
    currency: string; 
    effectiveDate: Date;
  }): void {
    this.price = payload.price;
  }
}
```

#### Loading Aggregate from Event History

```typescript
class ProjectRepository {
  async findById(id: ProjectId): Promise<Project | null> {
    // Load events from event store
    const events = await this.eventStore.getEvents(id.getValue());
    
    if (events.length === 0) {
      return null;
    }
    
    // Create aggregate and replay events
    const project = new Project(id);
    project.loadFromHistory(events);
    
    return project;
  }
  
  async save(project: Project): Promise<void> {
    // Get new events
    const events = project.getDomainEvents();
    
    // Persist events
    await this.eventStore.saveEvents(
      project.getId().getValue(),
      events,
      project.getVersion()
    );
    
    // Clear events after saving
    project.commit();
  }
}
```

#### Using Snapshots for Performance

```typescript
class InventoryItem extends AggregateRoot<ItemId, InventoryState> {
  private sku!: string;
  private quantity!: number;
  private movements: StockMovement[] = [];
  
  constructor(id: ItemId) {
    super(id);
    this.enableSnapshots();
  }
  
  static async loadFromRepository(
    id: ItemId,
    eventStore: IEventStore,
    snapshotStore: ISnapshotStore
  ): Promise<InventoryItem> {
    const item = new InventoryItem(id);
    
    // Try to load from snapshot first
    const snapshot = await snapshotStore.getLatest(id.getValue());
    
    if (snapshot) {
      item.restoreFromSnapshot(snapshot);
      
      // Load events after snapshot
      const eventsSinceSnapshot = await eventStore.getEventsAfterVersion(
        id.getValue(),
        snapshot.version
      );
      
      if (eventsSinceSnapshot.length > 0) {
        item.loadFromHistory(eventsSinceSnapshot);
      }
    } else {
      // No snapshot, load all events
      const allEvents = await eventStore.getEvents(id.getValue());
      item.loadFromHistory(allEvents);
    }
    
    return item;
  }
  
  async saveWithSnapshot(
    eventStore: IEventStore,
    snapshotStore: ISnapshotStore
  ): Promise<void> {
    const events = this.getDomainEvents();
    
    // Save events
    await eventStore.saveEvents(
      this.getId().getValue(),
      events,
      this.getVersion()
    );
    
    // Create snapshot every 100 events
    if (this.getVersion() % 100 === 0) {
      const snapshot = this.createSnapshot({
        createdAt: new Date(),
        reason: 'Periodic snapshot'
      });
      await snapshotStore.save(snapshot);
    }
    
    this.commit();
  }
  
  protected serializeState(): InventoryState {
    return {
      sku: this.sku,
      quantity: this.quantity,
      movements: [...this.movements]
    };
  }
  
  protected deserializeState(state: InventoryState): void {
    this.sku = state.sku;
    this.quantity = state.quantity;
    this.movements = [...state.movements];
  }
}
```

### Event Sourcing Patterns

#### Complete Event Sourcing Example

```typescript
class ShoppingCart extends AggregateRoot<CartId> {
  private customerId!: CustomerId;
  private items: Map<ProductId, CartItem> = new Map();
  private status!: CartStatus;
  
  constructor(id: CartId) {
    super(id);
  }
  
  static create(customerId: CustomerId): ShoppingCart {
    const cart = new ShoppingCart(CartId.create());
    cart.apply('CartCreated', { customerId });
    return cart;
  }
  
  addItem(productId: ProductId, quantity: number, price: Money): void {
    if (this.status !== CartStatus.ACTIVE) {
      throw new Error('Cannot add items to inactive cart');
    }
    
    this.apply('ItemAddedToCart', {
      productId,
      quantity,
      price
    });
  }
  
  removeItem(productId: ProductId): void {
    if (!this.items.has(productId)) {
      throw new Error('Item not in cart');
    }
    
    this.apply('ItemRemovedFromCart', { productId });
  }
  
  checkout(): void {
    if (this.items.size === 0) {
      throw new Error('Cannot checkout empty cart');
    }
    
    this.apply('CartCheckedOut', {
      items: Array.from(this.items.values()),
      total: this.calculateTotal()
    });
  }
  
  // Event handlers
  protected onCartCreated(payload: { customerId: CustomerId }): void {
    this.customerId = payload.customerId;
    this.status = CartStatus.ACTIVE;
  }
  
  protected onItemAddedToCart(payload: {
    productId: ProductId;
    quantity: number;
    price: Money;
  }): void {
    const existingItem = this.items.get(payload.productId);
    
    if (existingItem) {
      existingItem.quantity += payload.quantity;
    } else {
      this.items.set(payload.productId, new CartItem(
        payload.productId,
        payload.quantity,
        payload.price
      ));
    }
  }
  
  protected onItemRemovedFromCart(payload: { productId: ProductId }): void {
    this.items.delete(payload.productId);
  }
  
  protected onCartCheckedOut(payload: {
    items: CartItem[];
    total: Money;
  }): void {
    this.status = CartStatus.CHECKED_OUT;
  }
  
  private calculateTotal(): Money {
    let total = Money.zero('USD');
    for (const item of this.items.values()) {
      total = total.add(item.price.multiply(item.quantity));
    }
    return total;
  }
}
```

### Working with Aggregate Features

#### Snapshot Usage Pattern

```typescript
// Repository with snapshot support
class AggregateRepository<T extends AggregateRoot> {
  constructor(
    private eventStore: IEventStore,
    private snapshotStore: ISnapshotStore
  ) {}
  
  async save(aggregate: T): Promise<void> {
    const events = aggregate.getDomainEvents();
    
    if (events.length === 0) {
      return; // No changes to save
    }
    
    // Save events
    await this.eventStore.saveEvents(
      aggregate.getId().getValue(),
      events,
      aggregate.getVersion()
    );
    
    // Consider creating snapshot
    if (this.shouldCreateSnapshot(aggregate)) {
      const snapshot = aggregate.createSnapshot();
      await this.snapshotStore.save(snapshot);
    }
    
    aggregate.commit();
  }
  
  async load<T extends AggregateRoot>(
    id: EntityId,
    AggregateClass: new (id: EntityId) => T
  ): Promise<T | null> {
    const aggregate = new AggregateClass(id);
    
    // Enable features if needed
    if (this.supportsSnapshots(aggregate)) {
      aggregate.enableSnapshots();
    }
    
    // Try loading from snapshot
    const snapshot = await this.snapshotStore.getLatest(id.getValue());
    let startVersion = 0;
    
    if (snapshot && this.supportsSnapshots(aggregate)) {
      aggregate.restoreFromSnapshot(snapshot);
      startVersion = snapshot.version;
    }
    
    // Load remaining events
    const events = await this.eventStore.getEventsAfterVersion(
      id.getValue(),
      startVersion
    );
    
    if (events.length === 0 && !snapshot) {
      return null; // Aggregate doesn't exist
    }
    
    if (events.length > 0) {
      aggregate.loadFromHistory(events);
    }
    
    return aggregate;
  }
  
  private shouldCreateSnapshot(aggregate: T): boolean {
    // Create snapshot every 50 events or every 24 hours
    return aggregate.getVersion() % 50 === 0;
  }
  
  private supportsSnapshots(aggregate: T): boolean {
    return typeof aggregate['serializeState'] === 'function';
  }
}
```

#### Event Versioning Pattern

```typescript
class Customer extends AggregateRoot<CustomerId> {
  constructor(id: CustomerId) {
    super(id);
    this.enableVersioning();
    
    // Register upcasters for event evolution
    this.registerUpcaster('CustomerRegistered', 1, {
      upcast: (v1: { email: string }) => ({
        email: new Email(v1.email),
        registeredAt: new Date(),
        source: 'UNKNOWN'
      })
    });
    
    this.registerUpcaster('AddressChanged', 1, {
      upcast: (v1: { address: string }) => ({
        address: Address.parse(v1.address),
        type: AddressType.BILLING
      })
    });
  }
  
  // Current event version handlers
  protected onCustomerRegistered_v2(payload: {
    email: Email;
    registeredAt: Date;
    source: string;
  }): void {
    this.email = payload.email;
    this.registeredAt = payload.registeredAt;
    this.source = payload.source;
  }
  
  // Legacy event handlers still supported
  protected onCustomerRegistered_v1(payload: {
    email: string;
  }): void {
    this.email = new Email(payload.email);
    this.registeredAt = new Date();
    this.source = 'LEGACY';
  }
}
```

### Best Practices

1. Use `apply()` method for all state changes
2. Implement event handlers with `on{EventType}` naming
3. Keep aggregates small and focused
4. Enable snapshots for aggregates with many events
5. Version events from the start if they might evolve
6. Use `loadFromHistory` for event replay
7. Always validate business rules before applying events

### Common Pitfalls

1. Directly modifying state instead of using events
2. Missing event handlers for applied events
3. Not enabling features (snapshots, versioning) when needed
4. Large aggregates that should be split
5. Not handling event versioning properly

### Integration with Other Patterns

```typescript
// With Repository Pattern
class OrderRepository implements IRepository<Order> {
  constructor(
    private eventStore: IEventStore,
    private snapshotStore: ISnapshotStore
  ) {}
  
  async findById(id: OrderId): Promise<Order | null> {
    const events = await this.eventStore.getEvents(id.getValue());
    if (events.length === 0) return null;
    
    const order = new Order(id);
    order.loadFromHistory(events);
    return order;
  }
  
  async save(order: Order): Promise<void> {
    const events = order.getDomainEvents();
    await this.eventStore.saveEvents(
      order.getId().getValue(),
      events,
      order.getVersion()
    );
    order.commit();
  }
}

// With Domain Services
class TransferService {
  constructor(private accountRepo: IRepository<Account>) {}
  
  async transfer(
    fromAccountId: AccountId,
    toAccountId: AccountId,
    amount: Money
  ): Promise<void> {
    const fromAccount = await this.accountRepo.findById(fromAccountId);
    const toAccount = await this.accountRepo.findById(toAccountId);
    
    if (!fromAccount || !toAccount) {
      throw new Error('Account not found');
    }
    
    // Use domain methods that apply events
    fromAccount.withdraw(amount, `Transfer to ${toAccountId}`);
    toAccount.deposit(amount, `Transfer from ${fromAccountId}`);
    
    // Save aggregates with their events
    await this.accountRepo.save(fromAccount);
    await this.accountRepo.save(toAccount);
  }
}
```

---

## Specifications

### What are Specifications?

The Specification Pattern encapsulates business rules as reusable objects. A specification can answer a yes/no question about a domain object and can be combined with other specifications using logical operators.

### Primary Use Cases
- Encapsulating complex business rules
- Building reusable query predicates
- Validating domain objects
- Filtering collections
- Combining simple rules into complex ones

### When to Use
- When business rules are complex or change frequently
- When rules need to be reused across different contexts
- When you need to combine rules dynamically
- For building query criteria

### When NOT to Use
- For simple, one-time validations
- When rules are trivial and unlikely to change
- When performance is critical (adds abstraction overhead)

### Core Components

#### ISpecification Interface
```typescript
interface ISpecification<T> {
  // Core evaluation method
  isSatisfiedBy(candidate: T): boolean;
  
  // Logical operators
  and(other: ISpecification<T>): ISpecification<T>;
  or(other: ISpecification<T>): ISpecification<T>;
  not(): ISpecification<T>;
  
  // Optional metadata
  readonly name?: string;
  readonly description?: string;
  
  // Optional advanced features
  toExpression?(): any;
  toQueryPredicate?(): any;
  explainFailure?(candidate: T): string | null;
}
```

#### CompositeSpecification Base Class
```typescript
abstract class CompositeSpecification<T> implements ISpecification<T> {
  abstract isSatisfiedBy(candidate: T): boolean;
  
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

### Basic Examples

#### E-commerce: Customer Eligibility
```typescript
// Premium customer specification
class PremiumCustomerSpecification extends CompositeSpecification<Customer> {
  isSatisfiedBy(customer: Customer): boolean {
    return customer.getTotalPurchases() > 1000 || 
           customer.getMembershipLevel() === 'GOLD';
  }
}

// Active customer specification
class ActiveCustomerSpecification extends CompositeSpecification<Customer> {
  isSatisfiedBy(customer: Customer): boolean {
    const lastPurchase = customer.getLastPurchaseDate();
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    return lastPurchase > threeMonthsAgo;
  }
}

// Combining specifications
const eligibleForPromotion = new PremiumCustomerSpecification()
  .and(new ActiveCustomerSpecification());

// Usage
const customer = customerRepository.findById('123');
if (eligibleForPromotion.isSatisfiedBy(customer)) {
  promotionService.applyDiscount(customer);
}
```

#### Banking: Loan Approval
```typescript
class MinimumCreditScoreSpecification extends CompositeSpecification<LoanApplication> {
  constructor(private minScore: number) {
    super();
  }
  
  isSatisfiedBy(application: LoanApplication): boolean {
    return application.getCreditScore() >= this.minScore;
  }
  
  explainFailure(application: LoanApplication): string | null {
    if (!this.isSatisfiedBy(application)) {
      return `Credit score ${application.getCreditScore()} is below minimum ${this.minScore}`;
    }
    return null;
  }
}

class DebtToIncomeRatioSpecification extends CompositeSpecification<LoanApplication> {
  constructor(private maxRatio: number) {
    super();
  }
  
  isSatisfiedBy(application: LoanApplication): boolean {
    const ratio = application.getMonthlyDebt() / application.getMonthlyIncome();
    return ratio <= this.maxRatio;
  }
}

// Complex loan approval specification
const loanApprovalSpec = new MinimumCreditScoreSpecification(650)
  .and(new DebtToIncomeRatioSpecification(0.4))
  .and(new MinimumIncomeSpecification(50000));

// Alternative approval path
const alternativeApprovalSpec = new MinimumCreditScoreSpecification(750)
  .or(new CollateralSpecification(100000));

const finalApprovalSpec = loanApprovalSpec.or(alternativeApprovalSpec);
```

### Advanced Examples

#### Healthcare: Patient Eligibility
```typescript
class AgeRangeSpecification extends CompositeSpecification<Patient> {
  constructor(
    private minAge: number,
    private maxAge: number
  ) {
    super();
  }
  
  isSatisfiedBy(patient: Patient): boolean {
    const age = patient.getAge();
    return age >= this.minAge && age <= this.maxAge;
  }
}

class MedicalConditionSpecification extends CompositeSpecification<Patient> {
  constructor(private requiredConditions: string[]) {
    super();
  }
  
  isSatisfiedBy(patient: Patient): boolean {
    const patientConditions = patient.getMedicalConditions();
    return this.requiredConditions.every(
      condition => patientConditions.includes(condition)
    );
  }
}

class InsuranceCoverageSpecification extends CompositeSpecification<Patient> {
  constructor(private requiredCoverage: string[]) {
    super();
  }
  
  isSatisfiedBy(patient: Patient): boolean {
    const insurance = patient.getInsurance();
    return this.requiredCoverage.some(
      coverage => insurance.covers(coverage)
    );
  }
}

// Clinical trial eligibility
const clinicalTrialSpec = new AgeRangeSpecification(18, 65)
  .and(new MedicalConditionSpecification(['diabetes', 'hypertension']))
  .and(new InsuranceCoverageSpecification(['TRIAL_COVERAGE']))
  .and(new NoContraindicationSpecification(['pregnancy', 'heart_disease']));
```

#### Dynamic Specification Building
```typescript
class SpecificationBuilder<T> {
  private specifications: ISpecification<T>[] = [];
  
  add(spec: ISpecification<T>): this {
    this.specifications.push(spec);
    return this;
  }
  
  addIf(condition: boolean, spec: ISpecification<T>): this {
    if (condition) {
      this.specifications.push(spec);
    }
    return this;
  }
  
  buildAnd(): ISpecification<T> {
    if (this.specifications.length === 0) {
      return new AlwaysTrueSpecification<T>();
    }
    
    return this.specifications.reduce(
      (acc, spec) => acc.and(spec)
    );
  }
  
  buildOr(): ISpecification<T> {
    if (this.specifications.length === 0) {
      return new AlwaysFalseSpecification<T>();
    }
    
    return this.specifications.reduce(
      (acc, spec) => acc.or(spec)
    );
  }
}

// Usage
const filterSpec = new SpecificationBuilder<Product>()
  .add(new InStockSpecification())
  .addIf(userPreferences.priceRange, new PriceRangeSpecification(0, 100))
  .addIf(userPreferences.category, new CategorySpecification('electronics'))
  .buildAnd();

const products = productRepository.findBySpecification(filterSpec);
```

### Standalone Usage
```typescript
// Simple specification usage without other patterns
const activeUserSpec = new ActiveUserSpecification();
const premiumUserSpec = new PremiumUserSpecification();

// Filter in-memory collection
const eligibleUsers = users.filter(
  user => activeUserSpec.and(premiumUserSpec).isSatisfiedBy(user)
);

// Use in business logic
function canAccessFeature(user: User, feature: Feature): boolean {
  const spec = feature.getAccessSpecification();
  return spec.isSatisfiedBy(user);
}

// Building complex queries
const searchSpec = new ProductNameSpecification(searchTerm)
  .and(new PriceRangeSpecification(minPrice, maxPrice))
  .and(new AvailabilitySpecification());

const results = products.filter(p => searchSpec.isSatisfiedBy(p));
```

### Integration with Other Patterns
```typescript
// With Repository Pattern
interface ISpecificationRepository<T> {
  findBySpecification(spec: ISpecification<T>): Promise<T[]>;
  countBySpecification(spec: ISpecification<T>): Promise<number>;
  existsBySpecification(spec: ISpecification<T>): Promise<boolean>;
}

class ProductRepository implements ISpecificationRepository<Product> {
  async findBySpecification(spec: ISpecification<Product>): Promise<Product[]> {
    // In-memory implementation
    const allProducts = await this.findAll();
    return allProducts.filter(p => spec.isSatisfiedBy(p));
  }
  
  // SQL translation example
  async findBySpecificationSQL(spec: ISpecification<Product>): Promise<Product[]> {
    const query = this.specificationTranslator.toSQL(spec);
    return this.db.query(query);
  }
}

// With Validation
class SpecificationValidator<T> implements IValidator<T> {
  constructor(
    private specification: ISpecification<T>,
    private errorMessage: string
  ) {}
  
  validate(value: T): Result<T, ValidationError> {
    if (this.specification.isSatisfiedBy(value)) {
      return Result.ok(value);
    }
    
    const reason = this.specification.explainFailure?.(value) || this.errorMessage;
    return Result.fail(new ValidationError(reason));
  }
}

// With Domain Services
class DiscountService {
  calculateDiscount(order: Order, customer: Customer): Money {
    const discountSpecs: Array<[ISpecification<Order>, number]> = [
      [new HighValueOrderSpecification(1000), 0.15],
      [new BulkOrderSpecification(10), 0.10],
      [new FirstTimeOrderSpecification(), 0.20]
    ];
    
    const customerSpecs: Array<[ISpecification<Customer>, number]> = [
      [new VIPCustomerSpecification(), 0.10],
      [new LoyalCustomerSpecification(2), 0.05]
    ];
    
    let totalDiscount = 0;
    
    for (const [spec, discount] of discountSpecs) {
      if (spec.isSatisfiedBy(order)) {
        totalDiscount += discount;
      }
    }
    
    for (const [spec, discount] of customerSpecs) {
      if (spec.isSatisfiedBy(customer)) {
        totalDiscount += discount;
      }
    }
    
    return order.getTotal().multiply(Math.min(totalDiscount, 0.30));
  }
}
```

### Best Practices
1. Name specifications clearly (e.g., `EligibleForFreeShippingSpecification`)
2. Keep specifications focused on single responsibilities
3. Implement `explainFailure` for better debugging
4. Use composition to build complex rules from simple ones
5. Consider performance when translating to queries

### Common Pitfalls
1. Creating overly complex single specifications
2. Not providing meaningful failure explanations
3. Tight coupling to implementation details
4. Not considering query translation needs

---

### 7. Business Rules

### What are Business Rules?
Business Rules in DomainTS encapsulate and enforce domain-specific business logic. They provide a fluent API for defining complex validation rules, conditional logic, and business constraints.

### Primary Use Cases
- Enforcing domain invariants
- Complex validation scenarios
- Conditional business logic
- Cross-property validation
- Building validation pipelines

### When to Use
- When validation involves multiple properties
- When rules have complex conditional logic
- When you need readable, maintainable validation code
- For reusable validation logic across entities

### When NOT to Use
- For simple property validation (use basic validators)
- When validation logic is trivial
- For UI-only validation concerns

### Core Components

#### BusinessRuleValidator
```typescript
class BusinessRuleValidator<T> implements IValidator<T> {
  // Add simple validation rule
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
  
  // Alternative conditional validation
  otherwise(
    elseRules: (validator: BusinessRuleValidator<T>) => void
  ): BusinessRuleValidator<T>;
  
  // Validate nested objects
  addNested<P>(
    property: string,
    validator: IValidator<P>,
    getValue: (obj: T) => P
  ): BusinessRuleValidator<T>;
  
  // Execute validation
  validate(value: T): Result<T, ValidationErrors>;
}
```

### Basic Examples

#### E-commerce: Order Validation
```typescript
const orderValidator = BusinessRuleValidator.create<Order>()
  .addRule('items',
    order => order.getItems().length > 0,
    'Order must contain at least one item'
  )
  .addRule('totalAmount',
    order => order.getTotalAmount().isPositive(),
    'Order total must be positive'
  )
  .addRule('shippingAddress',
    order => order.hasShippingAddress(),
    'Shipping address is required'
  )
  .mustSatisfy(
    new ValidPaymentMethodSpecification(),
    'Invalid payment method'
  );

// Usage
const result = orderValidator.validate(order);
if (result.isFailure()) {
  console.log('Validation errors:', result.error.errors);
}
```

#### Banking: Account Operations
```typescript
const withdrawalValidator = BusinessRuleValidator.create<WithdrawalRequest>()
  .addRule('amount',
    request => request.amount.isPositive(),
    'Withdrawal amount must be positive'
  )
  .addRule('',
    request => request.amount.isLessThanOrEqual(request.dailyLimit),
    'Amount exceeds daily withdrawal limit'
  )
  .mustSatisfy(
    new AccountActiveSpecification(),
    'Account must be active for withdrawals'
  )
  .when(
    request => request.amount.isGreaterThan(new Money(10000, 'USD')),
    validator => validator
      .addRule('approvalCode',
        request => request.hasApprovalCode(),
        'Large withdrawals require approval code'
      )
      .addRule('',
        request => request.isApprovalCodeValid(),
        'Invalid approval code'
      )
  );
```

### Advanced Examples

#### Healthcare: Patient Admission
```typescript
interface AdmissionRequest {
  patient: Patient;
  department: Department;
  admissionType: AdmissionType;
  insuranceInfo: InsuranceInfo;
  emergencyContact: Contact;
}

const admissionValidator = BusinessRuleValidator.create<AdmissionRequest>()
  .addRule('patient.age',
    request => request.patient.getAge() >= 0,
    'Invalid patient age'
  )
  .when(
    request => request.department.isPediatric(),
    validator => validator
      .addRule('patient.age',
        request => request.patient.getAge() <= 18,
        'Pediatric department only accepts patients 18 and under'
      )
      .addRule('patient.guardianConsent',
        request => request.patient.hasGuardianConsent(),
        'Guardian consent required for pediatric patients'
      )
  )
  .when(
    request => request.admissionType === AdmissionType.EMERGENCY,
    validator => validator
      .addRule('emergencyContact',
        request => request.emergencyContact.isValid(),
        'Valid emergency contact required'
      )
  )
  .otherwise(
    validator => validator
      .addRule('insuranceInfo',
        request => request.insuranceInfo.isVerified(),
        'Insurance verification required for non-emergency admissions'
      )
      .addRule('',
        request => request.insuranceInfo.coversService(request.department.getServiceType()),
        'Insurance does not cover requested service'
      )
  )
  .mustSatisfy(
    new DepartmentCapacitySpecification(),
    'Department is at full capacity'
  );
```

#### Logistics: Shipment Validation
```typescript
interface ShipmentRequest {
  origin: Address;
  destination: Address;
  packages: Package[];
  service: ShippingService;
  declaredValue: Money;
}

const shipmentValidator = BusinessRuleValidator.create<ShipmentRequest>()
  .addRule('packages',
    request => request.packages.length > 0,
    'Shipment must contain at least one package'
  )
  .addRule('',
    request => request.packages.every(pkg => pkg.weight.isPositive()),
    'All packages must have positive weight'
  )
  .when(
    request => request.service === ShippingService.EXPRESS,
    validator => validator
      .addRule('',
        request => request.getTotalWeight().isLessThan(new Weight(50, 'kg')),
        'Express shipping limited to 50kg total'
      )
      .addRule('',
        request => request.destination.getCountry() === request.origin.getCountry(),
        'Express shipping only available domestically'
      )
  )
  .when(
    request => request.destination.isInternational(),
    validator => validator
      .addRule('',
        request => request.packages.every(pkg => pkg.hasCustomsDeclaration()),
        'Customs declaration required for all international packages'
      )
      .addRule('declaredValue',
        request => request.declaredValue.isLessThan(new Money(10000, 'USD')),
        'Declared value exceeds maximum for standard international shipping'
      )
  )
  .when(
    request => request.packages.some(pkg => pkg.isFragile()),
    validator => validator
      .addRule('',
        request => request.service.includesFragileHandling(),
        'Selected service does not support fragile items'
      )
  );
```

#### Conditional Validation with Multiple Paths
```typescript
const employeeValidator = BusinessRuleValidator.create<Employee>()
  .addRule('personalInfo.email',
    employee => employee.personalInfo.email.isValid(),
    'Invalid email format'
  )
  .when(
    employee => employee.employmentType === EmploymentType.FULL_TIME,
    validator => validator
      .addRule('benefits',
        employee => employee.benefits !== null,
        'Full-time employees must have benefits package'
      )
      .addRule('workHours',
        employee => employee.workHours >= 35,
        'Full-time employees must work at least 35 hours per week'
      )
  )
  .when(
    employee => employee.employmentType === EmploymentType.CONTRACTOR,
    validator => validator
      .addRule('contractEndDate',
        employee => employee.contractEndDate > new Date(),
        'Contract end date must be in the future'
      )
      .addRule('hourlyRate',
        employee => employee.hourlyRate.isGreaterThan(new Money(0, 'USD')),
        'Contractors must have positive hourly rate'
      )
  )
  .when(
    employee => employee.department === Department.ENGINEERING,
    validator => validator
      .addRule('skills',
        employee => employee.skills.includes('programming'),
        'Engineering employees must have programming skills'
      )
      .mustSatisfy(
        new TechnicalCertificationSpecification(),
        'Engineering employees must have required certifications'
      )
  );
```

### Nested Object Validation
```typescript
// Nested validators for complex objects
const addressValidator = BusinessRuleValidator.create<Address>()
  .addRule('street', address => address.street.length > 0, 'Street is required')
  .addRule('city', address => address.city.length > 0, 'City is required')
  .addRule('postalCode', address => address.postalCode.isValid(), 'Invalid postal code')
  .addRule('country', address => address.country.isValid(), 'Invalid country');

const contactValidator = BusinessRuleValidator.create<Contact>()
  .addRule('name', contact => contact.name.length > 0, 'Name is required')
  .addRule('phone', contact => contact.phone.isValid(), 'Invalid phone number')
  .addRule('email', contact => contact.email.isValid(), 'Invalid email');

const customerValidator = BusinessRuleValidator.create<Customer>()
  .addRule('id', customer => customer.id.isValid(), 'Invalid customer ID')
  .addNested('billingAddress', addressValidator, customer => customer.billingAddress)
  .addNested('shippingAddress', addressValidator, customer => customer.shippingAddress)
  .addNested('primaryContact', contactValidator, customer => customer.primaryContact)
  .when(
    customer => customer.isBusinessAccount(),
    validator => validator
      .addRule('taxId', customer => customer.taxId.isValid(), 'Valid tax ID required for business accounts')
      .addRule('companyName', customer => customer.companyName.length > 0, 'Company name required')
  );
```

### Standalone Usage
```typescript
// Direct validation without other patterns
const userValidator = BusinessRuleValidator.create<User>()
  .addRule('username', user => user.username.length >= 3, 'Username too short')
  .addRule('password', user => user.password.strength >= PasswordStrength.MEDIUM, 'Password too weak')
  .addRule('age', user => user.age >= 13, 'Must be at least 13 years old');

// Validate user input
function validateUser(userData: UserData): Result<User, ValidationErrors> {
  const user = new User(userData);
  return userValidator.validate(user);
}

// Reusable validation rules
const commonRules = {
  email: <T>(property: keyof T) => 
    (validator: BusinessRuleValidator<T>) => validator
      .addRule(property as string, 
        obj => isValidEmail(obj[property]), 
        'Invalid email format'),
        
  required: <T>(property: keyof T) => 
    (validator: BusinessRuleValidator<T>) => validator
      .addRule(property as string, 
        obj => obj[property] != null && obj[property] !== '', 
        `${String(property)} is required`)
};

// Apply common rules
const formValidator = BusinessRuleValidator.create<FormData>()
  .apply(commonRules.required('name'))
  .apply(commonRules.email('email'))
  .apply(commonRules.required('message'));
```

### Integration with Other Patterns
```typescript
// With Specifications
const orderValidator = BusinessRuleValidator.create<Order>()
  .mustSatisfy(
    new MinimumOrderValueSpecification(50),
    'Minimum order value is $50'
  )
  .mustSatisfy(
    new ValidShippingAddressSpecification(),
    'Invalid shipping address'
  )
  .mustSatisfy(
    new ProductAvailabilitySpecification(),
    'One or more products are out of stock'
  );

// With Domain Services
class OrderService {
  constructor(
    private orderValidator: BusinessRuleValidator<Order>,
    private inventoryService: InventoryService
  ) {}
  
  async placeOrder(orderData: OrderData): Promise<Result<Order, ValidationErrors>> {
    const order = Order.create(orderData);
    
    // First validate business rules
    const validationResult = this.orderValidator.validate(order);
    if (validationResult.isFailure()) {
      return validationResult;
    }
    
    // Then check external constraints
    const inventoryCheck = await this.inventoryService.checkAvailability(order);
    if (!inventoryCheck.isAvailable) {
      return Result.fail(new ValidationErrors([
        new ValidationError('items', 'Insufficient inventory')
      ]));
    }
    
    return Result.ok(order);
  }
}

// With Aggregates
class LoanApplication extends AggregateRoot<ApplicationId> {
  private validator: BusinessRuleValidator<LoanApplication>;
  
  constructor(id: ApplicationId) {
    super(id);
    this.setupValidator();
  }
  
  private setupValidator(): void {
    this.validator = BusinessRuleValidator.create<LoanApplication>()
      .addRule('amount',
        app => app.amount.isPositive(),
        'Loan amount must be positive'
      )
      .addRule('',
        app => app.amount.isLessThan(app.getMaximumLoanAmount()),
        'Amount exceeds maximum loan limit'
      )
      .mustSatisfy(
        new CreditScoreRequirementSpecification(),
        'Credit score requirements not met'
      );
  }
  
  submit(): Result<void, ValidationErrors> {
    const validationResult = this.validator.validate(this);
    if (validationResult.isFailure()) {
      return Result.fail(validationResult.error);
    }
    
    this.apply('LoanApplicationSubmitted', {
      applicationId: this.getId(),
      amount: this.amount,
      submittedAt: new Date()
    });
    
    return Result.ok();
  }
}
```

### Best Practices
1. Keep validation rules close to the domain model
2. Use descriptive error messages
3. Leverage conditional validation for complex scenarios
4. Compose validators for nested objects
5. Combine with specifications for complex rules

### Common Pitfalls
1. Putting UI validation concerns in domain validators
2. Creating overly complex conditional chains
3. Not providing context in error messages
4. Duplicating validation logic

---

### 8. Business Policies

### What are Business Policies?
Business Policies represent high-level business decisions and constraints. Unlike validation rules, policies encode strategic business decisions that may change based on business context.

### Primary Use Cases
- Encoding strategic business decisions
- Implementing configurable business rules
- Managing business constraints
- Supporting A/B testing of business logic
- Implementing feature flags

### When to Use
- When rules represent business strategy
- When rules need to be configurable
- When implementing varying business behavior
- For rules that change frequently

### When NOT to Use
- For basic data validation
- For invariant constraints
- When rules are fundamental to the domain
- For technical constraints

### Core Components

#### IBusinessPolicy Interface
```typescript
interface IBusinessPolicy<T> {
  // Evaluate if entity satisfies policy
  isSatisfiedBy(entity: T): boolean;
  
  // Get detailed result with explanations
  check(entity: T): Result<T, PolicyViolation>;
  
  // Combine policies
  and(other: IBusinessPolicy<T>): IBusinessPolicy<T>;
  or(other: IBusinessPolicy<T>): IBusinessPolicy<T>;
}
```

#### PolicyViolation
```typescript
class PolicyViolation {
  constructor(
    public readonly code: string,
    public readonly message: string,
    public readonly details?: Record<string, any>
  ) {}
}
```

### Basic Examples

#### E-commerce: Pricing Policy
```typescript
class DynamicPricingPolicy implements IBusinessPolicy<PricingRequest> {
  constructor(
    private readonly config: PricingConfig,
    private readonly marketData: MarketDataService
  ) {}
  
  isSatisfiedBy(request: PricingRequest): boolean {
    return this.check(request).isSuccess();
  }
  
  check(request: PricingRequest): Result<PricingRequest, PolicyViolation> {
    const { product, customer, timestamp } = request;
    
    // Check time-based pricing
    if (this.isPeakHour(timestamp)) {
      const peakMultiplier = this.config.peakHourMultiplier;
      if (peakMultiplier > 1.5) {
        return Result.fail(new PolicyViolation(
          'EXCESSIVE_PEAK_PRICING',
          'Peak pricing multiplier exceeds maximum allowed',
          { multiplier: peakMultiplier, maximum: 1.5 }
        ));
      }
    }
    
    // Check customer segment pricing
    if (customer.segment === CustomerSegment.NEW) {
      const discount = this.config.newCustomerDiscount;
      if (discount > 0.3) {
        return Result.fail(new PolicyViolation(
          'EXCESSIVE_NEW_CUSTOMER_DISCOUNT',
          'New customer discount exceeds maximum allowed',
          { discount, maximum: 0.3 }
        ));
      }
    }
    
    // Check competitive pricing
    const marketPrice = this.marketData.getAveragePrice(product.category);
    const proposedPrice = request.calculatePrice();
    
    if (proposedPrice > marketPrice * 1.2) {
      return Result.fail(new PolicyViolation(
        'ABOVE_MARKET_PRICE',
        'Price exceeds market average by more than 20%',
        { proposedPrice, marketPrice, maxMultiplier: 1.2 }
      ));
    }
    
    return Result.ok(request);
  }
  
  private isPeakHour(timestamp: Date): boolean {
    const hour = timestamp.getHours();
    return hour >= 17 && hour <= 20; // 5-8 PM
  }
}
```

#### Banking: Credit Approval Policy
```typescript
class CreditApprovalPolicy implements IBusinessPolicy<CreditApplication> {
  constructor(
    private readonly riskConfig: RiskConfig,
    private readonly economicIndicators: EconomicIndicatorService
  ) {}
  
  check(application: CreditApplication): Result<CreditApplication, PolicyViolation> {
    // Base credit score requirement
    const baseScoreRequirement = this.calculateBaseScoreRequirement(application);
    
    if (application.creditScore < baseScoreRequirement) {
      return Result.fail(new PolicyViolation(
        'INSUFFICIENT_CREDIT_SCORE',
        `Credit score ${application.creditScore} below requirement ${baseScoreRequirement}`,
        { 
          score: application.creditScore, 
          required: baseScoreRequirement,
          factors: this.getScoreFactors(application)
        }
      ));
    }
    
    // Debt-to-income ratio check
    const maxDTI = this.getMaxDTIRatio(application);
    if (application.debtToIncomeRatio > maxDTI) {
      return Result.fail(new PolicyViolation(
        'HIGH_DEBT_TO_INCOME',
        `DTI ratio ${application.debtToIncomeRatio} exceeds maximum ${maxDTI}`,
        { ratio: application.debtToIncomeRatio, maximum: maxDTI }
      ));
    }
    
    // Economic conditions check
    if (this.economicIndicators.isRecession()) {
      const recessionPolicy = new RecessionCreditPolicy(this.riskConfig);
      return recessionPolicy.check(application);
    }
    
    return Result.ok(application);
  }
  
  private calculateBaseScoreRequirement(application: CreditApplication): number {
    let baseScore = 650;
    
    // Adjust based on loan amount
    if (application.amount > 100000) {
      baseScore += 50;
    }
    
    // Adjust based on loan purpose
    if (application.purpose === LoanPurpose.INVESTMENT) {
      baseScore += 30;
    }
    
    // Adjust based on economic conditions
    if (this.economicIndicators.getUnemploymentRate() > 0.06) {
      baseScore += 20;
    }
    
    return baseScore;
  }
  
  private getMaxDTIRatio(application: CreditApplication): number {
    // Base DTI limit
    let maxDTI = 0.43;
    
    // Adjust based on credit score
    if (application.creditScore > 720) {
      maxDTI = 0.45;
    } else if (application.creditScore < 650) {
      maxDTI = 0.36;
    }
    
    // Adjust based on down payment
    if (application.downPaymentRatio > 0.3) {
      maxDTI += 0.02;
    }
    
    return maxDTI;
  }
}
```

### Advanced Examples

#### Insurance: Underwriting Policy
```typescript
class UnderwritingPolicy implements IBusinessPolicy<InsuranceApplication> {
  constructor(
    private readonly actuarialData: ActuarialDataService,
    private readonly companyGuidelines: CompanyGuidelines
  ) {}
  
  check(application: InsuranceApplication): Result<InsuranceApplication, PolicyViolation> {
    // Age-based policy
    const agePolicy = this.createAgePolicyForProduct(application.productType);
    const ageResult = agePolicy.check(application);
    if (ageResult.isFailure()) {
      return ageResult;
    }
    
    // Health risk policy
    const healthRiskScore = this.calculateHealthRisk(application);
    if (healthRiskScore > this.companyGuidelines.maxAcceptableRisk) {
      return Result.fail(new PolicyViolation(
        'HIGH_HEALTH_RISK',
        'Health risk exceeds acceptable threshold',
        { 
          riskScore: healthRiskScore,
          threshold: this.companyGuidelines.maxAcceptableRisk,
          factors: this.getHealthRiskFactors(application)
        }
      ));
    }
    
    // Occupation risk policy
    if (this.isHighRiskOccupation(application.occupation)) {
      const occupationPolicy = new HighRiskOccupationPolicy(
        this.actuarialData,
        application.occupation
      );
      return occupationPolicy.check(application);
    }
    
    // Coverage amount policy
    const maxCoverage = this.calculateMaxCoverage(application);
    if (application.requestedCoverage > maxCoverage) {
      return Result.fail(new PolicyViolation(
        'EXCESSIVE_COVERAGE',
        'Requested coverage exceeds maximum allowed',
        { 
          requested: application.requestedCoverage,
          maximum: maxCoverage,
          calculation: this.explainCoverageCalculation(application)
        }
      ));
    }
    
    return Result.ok(application);
  }
  
  private calculateHealthRisk(application: InsuranceApplication): number {
    let riskScore = 0;
    
    // BMI factor
    const bmi = application.health.calculateBMI();
    if (bmi > 30 || bmi < 18.5) {
      riskScore += 20;
    }
    
    // Pre-existing conditions
    for (const condition of application.health.conditions) {
      riskScore += this.actuarialData.getRiskScore(condition);
    }
    
    // Lifestyle factors
    if (application.health.isSmoker) {
      riskScore += 40;
    }
    
    if (application.health.alcoholUnitsPerWeek > 21) {
      riskScore += 15;
    }
    
    // Family history
    const familyRisk = this.calculateFamilyHistoryRisk(application.health.familyHistory);
    riskScore += familyRisk;
    
    return riskScore;
  }
  
  private calculateMaxCoverage(application: InsuranceApplication): Money {
    // Base calculation: 10x annual income
    let maxCoverage = application.annualIncome.multiply(10);
    
    // Adjust based on age
    const age = application.applicant.age;
    if (age > 50) {
      maxCoverage = maxCoverage.multiply(0.8);
    } else if (age > 60) {
      maxCoverage = maxCoverage.multiply(0.6);
    }
    
    // Adjust based on health
    const healthMultiplier = this.getHealthMultiplier(application);
    maxCoverage = maxCoverage.multiply(healthMultiplier);
    
    // Apply company maximum
    const companyMax = this.companyGuidelines.absoluteMaxCoverage;
    return maxCoverage.min(companyMax);
  }
}
```

#### Dynamic Policy Configuration
```typescript
class ConfigurablePricingPolicy implements IBusinessPolicy<Order> {
  private rules: PolicyRule[] = [];
  
  constructor(private config: PolicyConfiguration) {
    this.buildRules();
  }
  
  private buildRules(): void {
    // Minimum order value
    if (this.config.minimumOrderValue) {
      this.rules.push({
        name: 'minimum_order_value',
        check: (order) => order.total.isGreaterThanOrEqual(this.config.minimumOrderValue!),
        violation: (order) => new PolicyViolation(
          'BELOW_MINIMUM_ORDER',
          `Order value ${order.total} below minimum ${this.config.minimumOrderValue}`,
          { orderTotal: order.total, minimum: this.config.minimumOrderValue }
        )
      });
    }
    
    // Maximum items per order
    if (this.config.maxItemsPerOrder) {
      this.rules.push({
        name: 'max_items_per_order',
        check: (order) => order.items.length <= this.config.maxItemsPerOrder!,
        violation: (order) => new PolicyViolation(
          'TOO_MANY_ITEMS',
          `Order contains ${order.items.length} items, maximum is ${this.config.maxItemsPerOrder}`,
          { itemCount: order.items.length, maximum: this.config.maxItemsPerOrder }
        )
      });
    }
    
    // Time-based restrictions
    if (this.config.businessHoursOnly) {
      this.rules.push({
        name: 'business_hours_only',
        check: (order) => this.isWithinBusinessHours(order.placedAt),
        violation: (order) => new PolicyViolation(
          'OUTSIDE_BUSINESS_HOURS',
          'Orders can only be placed during business hours',
          { 
            orderTime: order.placedAt,
            businessHours: this.config.businessHours
          }
        )
      });
    }
    
    // Geographic restrictions
    if (this.config.allowedRegions) {
      this.rules.push({
        name: 'geographic_restrictions',
        check: (order) => this.config.allowedRegions!.includes(order.shippingAddress.region),
        violation: (order) => new PolicyViolation(
          'REGION_NOT_ALLOWED',
          `Shipping to ${order.shippingAddress.region} is not allowed`,
          { 
            region: order.shippingAddress.region,
            allowedRegions: this.config.allowedRegions
          }
        )
      });
    }
  }
  
  check(order: Order): Result<Order, PolicyViolation> {
    for (const rule of this.rules) {
      if (!rule.check(order)) {
        return Result.fail(rule.violation(order));
      }
    }
    return Result.ok(order);
  }
  
  private isWithinBusinessHours(timestamp: Date): boolean {
    const hours = this.config.businessHours;
    const hour = timestamp.getHours();
    const day = timestamp.getDay();
    
    // Check if it's a business day
    if (!hours.days.includes(day)) {
      return false;
    }
    
    // Check if it's within business hours
    return hour >= hours.startHour && hour < hours.endHour;
  }
}
```

### Standalone Usage
```typescript
// Simple policy usage
const freeShippingPolicy = new FreeShippingPolicy(50); // $50 minimum
const order = new Order(/* ... */);

if (freeShippingPolicy.isSatisfiedBy(order)) {
  order.applyFreeShipping();
}

// Policy composition
const premiumCustomerPolicy = new PremiumCustomerPolicy();
const highValueOrderPolicy = new HighValueOrderPolicy(1000);

const specialDiscountPolicy = premiumCustomerPolicy
  .and(highValueOrderPolicy)
  .or(new FirstTimeCustomerPolicy());

// Policy factory based on context
class PolicyFactory {
  static createPricingPolicy(context: PricingContext): IBusinessPolicy<PricingRequest> {
    const basePolicy = new StandardPricingPolicy();
    
    if (context.isHolidaySeason) {
      return basePolicy.and(new HolidayPricingPolicy());
    }
    
    if (context.isFlashSale) {
      return basePolicy.and(new FlashSalePricingPolicy(context.saleDiscount));
    }
    
    return basePolicy;
  }
}
```

### Integration with Other Patterns
```typescript
// With Domain Services
class LoanApprovalService {
  constructor(
    private creditPolicy: IBusinessPolicy<CreditApplication>,
    private riskAssessmentService: RiskAssessmentService,
    private creditBureau: CreditBureauService
  ) {}
  
  async evaluateApplication(
    application: CreditApplication
  ): Promise<Result<ApprovalDecision, PolicyViolation>> {
    // Enrich application with external data
    const creditReport = await this.creditBureau.getCreditReport(application.ssn);
    const enrichedApplication = application.withCreditReport(creditReport);
    
    // Check policy
    const policyResult = this.creditPolicy.check(enrichedApplication);
    if (policyResult.isFailure()) {
      return Result.fail(policyResult.error);
    }
    
    // Perform risk assessment
    const riskScore = await this.riskAssessmentService.assess(enrichedApplication);
    
    return Result.ok(new ApprovalDecision(
      ApprovalStatus.APPROVED,
      riskScore,
      this.calculateTerms(enrichedApplication, riskScore)
    ));
  }
}

// With Specification Pattern
class CombinedApprovalPolicy implements IBusinessPolicy<LoanApplication> {
  constructor(
    private minCreditScore: number,
    private maxDTI: number
  ) {}
  
  check(application: LoanApplication): Result<LoanApplication, PolicyViolation> {
    // Use specifications for complex checks
    const creditSpec = new MinimumCreditScoreSpecification(this.minCreditScore);
    const dtiSpec = new MaximumDTISpecification(this.maxDTI);
    const combinedSpec = creditSpec.and(dtiSpec);
    
    if (!combinedSpec.isSatisfiedBy(application)) {
      const reason = combinedSpec.explainFailure(application);
      return Result.fail(new PolicyViolation(
        'APPROVAL_CRITERIA_NOT_MET',
        reason || 'Application does not meet approval criteria'
      ));
    }
    
    return Result.ok(application);
  }
}

// With Business Rules
class OrderProcessingPolicy implements IBusinessPolicy<Order> {
  constructor(
    private businessRules: BusinessRuleValidator<Order>,
    private inventoryService: InventoryService
  ) {}
  
  async check(order: Order): Promise<Result<Order, PolicyViolation>> {
    // First check business rules
    const rulesResult = this.businessRules.validate(order);
    if (rulesResult.isFailure()) {
      return Result.fail(new PolicyViolation(
        'BUSINESS_RULES_VIOLATED',
        'Order violates business rules',
        { violations: rulesResult.error.errors }
      ));
    }
    
    // Then check inventory policy
    const inventoryCheck = await this.inventoryService.checkAvailability(order);
    if (!inventoryCheck.isAvailable) {
      return Result.fail(new PolicyViolation(
        'INSUFFICIENT_INVENTORY',
        'Not enough inventory to fulfill order',
        { unavailableItems: inventoryCheck.unavailableItems }
      ));
    }
    
    return Result.ok(order);
  }
}
```

### Policy Versioning and A/B Testing
```typescript
interface PolicyVersion {
  version: string;
  effectiveFrom: Date;
  effectiveTo?: Date;
  policy: IBusinessPolicy<any>;
}

class VersionedPolicyManager<T> {
  private versions: PolicyVersion[] = [];
  
  registerVersion(
    version: string,
    policy: IBusinessPolicy<T>,
    effectiveFrom: Date,
    effectiveTo?: Date
  ): void {
    this.versions.push({ version, policy, effectiveFrom, effectiveTo });
  }
  
  getPolicy(date: Date = new Date()): IBusinessPolicy<T> {
    const activeVersion = this.versions.find(v => 
      date >= v.effectiveFrom && 
      (!v.effectiveTo || date <= v.effectiveTo)
    );
    
    if (!activeVersion) {
      throw new Error('No active policy version found');
    }
    
    return activeVersion.policy;
  }
}

// A/B Testing policies
class ABTestingPolicy<T> implements IBusinessPolicy<T> {
  constructor(
    private policyA: IBusinessPolicy<T>,
    private policyB: IBusinessPolicy<T>,
    private splitPercentage: number = 50,
    private segmentationStrategy: (entity: T) => string
  ) {}
  
  check(entity: T): Result<T, PolicyViolation> {
    const segment = this.segmentationStrategy(entity);
    const useA = this.shouldUseA(segment);
    
    const policy = useA ? this.policyA : this.policyB;
    const result = policy.check(entity);
    
    // Track which policy was used for analytics
    if (result.isSuccess()) {
      this.trackPolicyUsage(segment, useA ? 'A' : 'B', 'success');
    } else {
      this.trackPolicyUsage(segment, useA ? 'A' : 'B', 'failure');
    }
    
    return result;
  }
  
  private shouldUseA(segment: string): boolean {
    // Use consistent hashing to ensure same segment always gets same policy
    const hash = this.hashString(segment);
    return (hash % 100) < this.splitPercentage;
  }
  
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
  
  private trackPolicyUsage(segment: string, policy: 'A' | 'B', result: 'success' | 'failure'): void {
    // Analytics tracking implementation
  }
}
```

### Best Practices

1. Separate policies from validation rules
2. Make policies configurable and version-able
3. Provide detailed violation information
4. Use composition for complex policies
5. Consider policy versioning for changes

### Common Pitfalls

1. Mixing policies with domain invariants
2. Hard-coding policy values
3. Not providing enough context in violations
4. Creating overly complex single policies

---

### 9. Validation

### What is Validation?

The Validation system in DomainTS provides a comprehensive framework for validating domain objects. It goes beyond simple data validation to enforce complex business rules and domain invariants.

### Primary Use Cases

- Validating domain entity state
- Enforcing aggregate invariants
- Command validation before execution
- Complex multi-field validation
- Integration with specifications and business rules

### When to Use

- When creating or updating domain objects
- Before persisting changes
- When processing commands
- For complex validation scenarios

### When NOT to Use

- For simple data type checks (use Value Objects)
- For UI-only validation
- For formatting concerns

### Core Components

#### IValidator Interface

```typescript
interface IValidator<T> {
  validate(value: T): Result<T, ValidationErrors>;
}
```

#### ValidationError and ValidationErrors

```typescript
class ValidationError {
  constructor(
    public readonly property: string,
    public readonly message: string,
    public readonly context?: Record<string, any>
  ) {}
}

class ValidationErrors extends Error {
  constructor(public readonly errors: ValidationError[]) {
    super(`Validation failed with ${errors.length} error(s)`);
  }
}
```

### Basic Examples

#### E-commerce: Product Validation

```typescript
class ProductValidator implements IValidator<Product> {
  validate(product: Product): Result<Product, ValidationErrors> {
    const errors: ValidationError[] = [];
    
    // Name validation
    if (!product.name || product.name.trim().length === 0) {
      errors.push(new ValidationError('name', 'Product name is required'));
    } else if (product.name.length > 200) {
      errors.push(new ValidationError('name', 'Product name too long'));
    }
    
    // Price validation
    if (product.price.isNegative()) {
      errors.push(new ValidationError('price', 'Price cannot be negative'));
    } else if (product.price.isZero()) {
      errors.push(new ValidationError('price', 'Price must be greater than zero'));
    }
    
    // SKU validation
    if (!product.sku || !this.isValidSKU(product.sku)) {
      errors.push(new ValidationError('sku', 'Invalid SKU format'));
    }
    
    // Category validation
    if (!product.category || !this.isValidCategory(product.category)) {
      errors.push(new ValidationError('category', 'Invalid product category'));
    }
    
    // Stock validation
    if (product.stockLevel < 0) {
      errors.push(new ValidationError('stockLevel', 'Stock level cannot be negative'));
    }
    
    if (errors.length > 0) {
      return Result.fail(new ValidationErrors(errors));
    }
    
    return Result.ok(product);
  }
  
  private isValidSKU(sku: string): boolean {
    // SKU format: XXX-000-XX
    return /^[A-Z]{3}-\d{3}-[A-Z]{2}$/.test(sku);
  }
  
  private isValidCategory(category: string): boolean {
    const validCategories = ['electronics', 'clothing', 'books', 'home', 'sports'];
    return validCategories.includes(category.toLowerCase());
  }
}
```

#### Banking: Transaction Validation

```typescript
class TransactionValidator implements IValidator<Transaction> {
  constructor(
    private accountRepository: IAccountRepository,
    private limitsService: TransactionLimitsService
  ) {}
  
  async validate(transaction: Transaction): Promise<Result<Transaction, ValidationErrors>> {
    const errors: ValidationError[] = [];
    
    // Basic validation
    if (transaction.amount.isNegative() || transaction.amount.isZero()) {
      errors.push(new ValidationError('amount', 'Transaction amount must be positive'));
    }
    
    if (!transaction.reference || transaction.reference.trim().length === 0) {
      errors.push(new ValidationError('reference', 'Transaction reference is required'));
    }
    
    // Account validation
    const fromAccount = await this.accountRepository.findById(transaction.fromAccountId);
    const toAccount = await this.accountRepository.findById(transaction.toAccountId);
    
    if (!fromAccount) {
      errors.push(new ValidationError('fromAccountId', 'Source account not found'));
    }
    
    if (!toAccount) {
      errors.push(new ValidationError('toAccountId', 'Destination account not found'));
    }
    
    if (fromAccount && toAccount) {
      // Same account check
      if (fromAccount.id.equals(toAccount.id)) {
        errors.push(new ValidationError('', 'Cannot transfer to same account'));
      }
      
      // Currency check
      if (!fromAccount.currency.equals(toAccount.currency)) {
        errors.push(new ValidationError('', 'Currency mismatch between accounts'));
      }
      
      // Balance check
      if (fromAccount.balance.isLessThan(transaction.amount)) {
        errors.push(new ValidationError('amount', 'Insufficient funds'));
      }
      
      // Account status check
      if (!fromAccount.isActive()) {
        errors.push(new ValidationError('fromAccountId', 'Source account is not active'));
      }
      
      if (!toAccount.isActive()) {
        errors.push(new ValidationError('toAccountId', 'Destination account is not active'));
      }
    }
    
    // Transaction limits
    const limits = await this.limitsService.getTransactionLimits(transaction.fromAccountId);
    
    if (transaction.amount.isGreaterThan(limits.singleTransactionLimit)) {
      errors.push(new ValidationError('amount', 
        `Amount exceeds single transaction limit of ${limits.singleTransactionLimit}`));
    }
    
    const dailyTotal = await this.calculateDailyTotal(transaction.fromAccountId);
    if (dailyTotal.add(transaction.amount).isGreaterThan(limits.dailyLimit)) {
      errors.push(new ValidationError('amount', 
        `Transaction would exceed daily limit of ${limits.dailyLimit}`));
    }
    
    if (errors.length > 0) {
      return Result.fail(new ValidationErrors(errors));
    }
    
    return Result.ok(transaction);
  }
  
  private async calculateDailyTotal(accountId: AccountId): Promise<Money> {
    // Implementation to calculate daily transaction total
  }
}
```

### Advanced Examples

#### Healthcare: Patient Admission Validation
```typescript
interface AdmissionContext {
  patient: Patient;
  department: Department;
  admittingPhysician: Physician;
  insuranceInfo: InsuranceInfo;
  medicalHistory: MedicalHistory;
}

class AdmissionValidator implements IValidator<AdmissionContext> {
  constructor(
    private departmentService: DepartmentService,
    private insuranceService: InsuranceService,
    private medicalRecordsService: MedicalRecordsService
  ) {}
  
  async validate(context: AdmissionContext): Promise<Result<AdmissionContext, ValidationErrors>> {
    const errors: ValidationError[] = [];
    
    // Patient validation
    this.validatePatient(context.patient, errors);
    
    // Department validation
    await this.validateDepartment(context.department, context.patient, errors);
    
    // Physician validation
    await this.validatePhysician(context.admittingPhysician, context.department, errors);
    
    // Insurance validation
    await this.validateInsurance(context.insuranceInfo, context.patient, errors);
    
    // Medical history validation
    this.validateMedicalHistory(context.medicalHistory, context.patient, errors);
    
    // Cross-validation
    await this.performCrossValidation(context, errors);
    
    if (errors.length > 0) {
      return Result.fail(new ValidationErrors(errors));
    }
    
    return Result.ok(context);
  }
  
  private validatePatient(patient: Patient, errors: ValidationError[]): void {
    if (!patient.firstName || !patient.lastName) {
      errors.push(new ValidationError('patient.name', 'Patient name is required'));
    }
    
    if (!patient.dateOfBirth) {
      errors.push(new ValidationError('patient.dateOfBirth', 'Date of birth is required'));
    }
    
    if (!patient.identificationNumber) {
      errors.push(new ValidationError('patient.identificationNumber', 
        'Patient identification number is required'));
    }
    
    // Age restrictions for certain departments
    const age = patient.getAge();
    if (age < 0 || age > 150) {
      errors.push(new ValidationError('patient.age', 'Invalid patient age'));
    }
  }
  
  private async validateDepartment(
    department: Department, 
    patient: Patient, 
    errors: ValidationError[]
  ): Promise<void> {
    // Check if department is active
    if (!department.isActive()) {
      errors.push(new ValidationError('department', 'Department is not active'));
    }
    
    // Check capacity
    const capacity = await this.departmentService.getAvailableCapacity(department.id);
    if (capacity <= 0) {
      errors.push(new ValidationError('department', 'Department has no available capacity'));
    }
    
    // Age restrictions
    if (department.isPediatric() && patient.getAge() > 18) {
      errors.push(new ValidationError('department', 
        'Patient too old for pediatric department'));
    }
    
    if (department.isGeriatric() && patient.getAge() < 65) {
      errors.push(new ValidationError('department', 
        'Patient too young for geriatric department'));
    }
    
    // Specialty requirements
    if (department.requiresReferral() && !patient.hasReferral()) {
      errors.push(new ValidationError('department', 
        'Department requires referral'));
    }
  }
  
  private async validatePhysician(
    physician: Physician, 
    department: Department, 
    errors: ValidationError[]
  ): Promise<void> {
    // Check if physician is active
    if (!physician.isActive()) {
      errors.push(new ValidationError('admittingPhysician', 
        'Physician is not active'));
    }
    
    // Check privileges
    const hasPrivileges = await this.departmentService
      .physicianHasPrivileges(physician.id, department.id);
    
    if (!hasPrivileges) {
      errors.push(new ValidationError('admittingPhysician', 
        'Physician does not have privileges in this department'));
    }
    
    // Check if physician is on call
    if (department.requiresOnCallPhysician()) {
      const isOnCall = await this.departmentService
        .isPhysicianOnCall(physician.id, department.id);
      
      if (!isOnCall) {
        errors.push(new ValidationError('admittingPhysician', 
          'Physician must be on call for admission to this department'));
      }
    }
  }
  
  private async validateInsurance(
    insuranceInfo: InsuranceInfo, 
    patient: Patient, 
    errors: ValidationError[]
  ): Promise<void> {
    // Verify insurance is active
    const verificationResult = await this.insuranceService
      .verifyInsurance(insuranceInfo);
    
    if (!verificationResult.isActive) {
      errors.push(new ValidationError('insuranceInfo', 
        'Insurance is not active'));
    }
    
    // Check if patient is covered
    if (!verificationResult.coversPatient(patient.identificationNumber)) {
      errors.push(new ValidationError('insuranceInfo', 
        'Patient is not covered by this insurance'));
    }
    
    // Check coverage type
    if (!verificationResult.hasHospitalCoverage()) {
      errors.push(new ValidationError('insuranceInfo', 
        'Insurance does not cover hospital admission'));
    }
    
    // Pre-authorization check
    if (verificationResult.requiresPreAuthorization()) {
      const preAuth = await this.insuranceService
        .checkPreAuthorization(insuranceInfo, patient);
      
      if (!preAuth.isApproved) {
        errors.push(new ValidationError('insuranceInfo', 
          'Pre-authorization required but not obtained'));
      }
    }
  }
  
  private validateMedicalHistory(
    history: MedicalHistory, 
    patient: Patient, 
    errors: ValidationError[]
  ): void {
    // Check if medical history matches patient
    if (!history.patientId.equals(patient.id)) {
      errors.push(new ValidationError('medicalHistory', 
        'Medical history does not match patient'));
    }
    
    // Check if allergies are documented
    if (!history.hasDocumentedAllergies()) {
      errors.push(new ValidationError('medicalHistory.allergies', 
        'Patient allergies must be documented'));
    }
    
    // Check if medications are current
    const lastMedicationUpdate = history.getLastMedicationUpdate();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    if (lastMedicationUpdate < thirtyDaysAgo) {
      errors.push(new ValidationError('medicalHistory.medications', 
        'Medication list must be updated within last 30 days'));
    }
  }
  
  private async performCrossValidation(
    context: AdmissionContext, 
    errors: ValidationError[]
  ): Promise<void> {
    // Check for contraindications
    const medications = context.medicalHistory.getCurrentMedications();
    const departmentProtocols = await this.departmentService
      .getProtocols(context.department.id);
    
    for (const medication of medications) {
      if (departmentProtocols.hasContraindication(medication)) {
        errors.push(new ValidationError('', 
          `Medication ${medication.name} contraindicated for ${context.department.name}`));
      }
    }
    
    // Check for required vaccinations
    if (context.department.requiresVaccinations()) {
      const requiredVaccinations = context.department.getRequiredVaccinations();
      const patientVaccinations = context.medicalHistory.getVaccinations();
      
      for (const required of requiredVaccinations) {
        if (!patientVaccinations.has(required)) {
          errors.push(new ValidationError('medicalHistory.vaccinations', 
            `Missing required vaccination: ${required}`));
        }
      }
    }
  }
}
```

#### Composite Validator Pattern
```typescript
class CompositeValidator<T> implements IValidator<T> {
  private validators: IValidator<T>[] = [];
  
  addValidator(validator: IValidator<T>): this {
    this.validators.push(validator);
    return this;
  }
  
  validate(value: T): Result<T, ValidationErrors> {
    const allErrors: ValidationError[] = [];
    
    for (const validator of this.validators) {
      const result = validator.validate(value);
      if (result.isFailure()) {
        allErrors.push(...result.error.errors);
      }
    }
    
    if (allErrors.length > 0) {
      return Result.fail(new ValidationErrors(allErrors));
    }
    
    return Result.ok(value);
  }
}

// Usage
const orderValidator = new CompositeValidator<Order>()
  .addValidator(new OrderBasicValidator())
  .addValidator(new OrderItemsValidator())
  .addValidator(new OrderPricingValidator())
  .addValidator(new OrderShippingValidator());

// Async composite validator
class AsyncCompositeValidator<T> implements IValidator<T> {
  private validators: Array<IValidator<T> | IAsyncValidator<T>> = [];
  
  async validate(value: T): Promise<Result<T, ValidationErrors>> {
    const allErrors: ValidationError[] = [];
    
    for (const validator of this.validators) {
      const result = await Promise.resolve(validator.validate(value));
      if (result.isFailure()) {
        allErrors.push(...result.error.errors);
      }
    }
    
    if (allErrors.length > 0) {
      return Result.fail(new ValidationErrors(allErrors));
    }
    
    return Result.ok(value);
  }
}
```

### Fluent Validation Builder
```typescript
class ValidationBuilder<T> {
  private rules: Array<(value: T) => ValidationError | null> = [];
  
  required(property: keyof T, message?: string): this {
    this.rules.push((value) => {
      if (value[property] == null || value[property] === '') {
        return new ValidationError(
          String(property), 
          message || `${String(property)} is required`
        );
      }
      return null;
    });
    return this;
  }
  
  min(property: keyof T, minValue: number, message?: string): this {
    this.rules.push((value) => {
      const val = value[property];
      if (typeof val === 'number' && val < minValue) {
        return new ValidationError(
          String(property),
          message || `${String(property)} must be at least ${minValue}`
        );
      }
      return null;
    });
    return this;
  }
  
  max(property: keyof T, maxValue: number, message?: string): this {
    this.rules.push((value) => {
      const val = value[property];
      if (typeof val === 'number' && val > maxValue) {
        return new ValidationError(
          String(property),
          message || `${String(property)} must be at most ${maxValue}`
        );
      }
      return null;
    });
    return this;
  }
  
  pattern(property: keyof T, regex: RegExp, message?: string): this {
    this.rules.push((value) => {
      const val = value[property];
      if (typeof val === 'string' && !regex.test(val)) {
        return new ValidationError(
          String(property),
          message || `${String(property)} has invalid format`
        );
      }
      return null;
    });
    return this;
  }
  
  custom(rule: (value: T) => ValidationError | null): this {
    this.rules.push(rule);
    return this;
  }
  
  build(): IValidator<T> {
    return {
      validate: (value: T): Result<T, ValidationErrors> => {
        const errors: ValidationError[] = [];
        
        for (const rule of this.rules) {
          const error = rule(value);
          if (error) {
            errors.push(error);
          }
        }
        
        if (errors.length > 0) {
          return Result.fail(new ValidationErrors(errors));
        }
        
        return Result.ok(value);
      }
    };
  }
}

// Usage
const userValidator = new ValidationBuilder<User>()
  .required('email', 'Email is required')
  .pattern('email', /^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format')
  .required('password', 'Password is required')
  .min('age', 18, 'Must be at least 18 years old')
  .custom((user) => {
    if (user.password.length < 8) {
      return new ValidationError('password', 'Password must be at least 8 characters');
    }
    return null;
  })
  .build();
```

### Standalone Usage
```typescript
// Simple validator usage
const validator = new ProductValidator();
const result = validator.validate(product);

if (result.isFailure()) {
  // Handle validation errors
  result.error.errors.forEach(error => {
    console.log(`${error.property}: ${error.message}`);
  });
}

// Inline validation
function validateEmail(email: string): Result<string, ValidationError> {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!email) {
    return Result.fail(new ValidationError('email', 'Email is required'));
  }
  
  if (!emailRegex.test(email)) {
    return Result.fail(new ValidationError('email', 'Invalid email format'));
  }
  
  return Result.ok(email);
}

// Validation in domain operations
class User {
  changeEmail(newEmail: string): Result<void, ValidationError> {
    const validationResult = validateEmail(newEmail);
    
    if (validationResult.isFailure()) {
      return Result.fail(validationResult.error);
    }
    
    this.email = newEmail;
    return Result.ok();
  }
}
```

### Integration with Other Patterns
```typescript
// With Specifications
class SpecificationBasedValidator<T> implements IValidator<T> {
  constructor(
    private specification: ISpecification<T>,
    private errorMessage: string
  ) {}
  
  validate(value: T): Result<T, ValidationErrors> {
    if (this.specification.isSatisfiedBy(value)) {
      return Result.ok(value);
    }
    
    const error = new ValidationError('', this.errorMessage);
    return Result.fail(new ValidationErrors([error]));
  }
}

// With Business Rules
class BusinessRuleEnforcingValidator<T> implements IValidator<T> {
  constructor(private businessRules: BusinessRuleValidator<T>) {}
  
  validate(value: T): Result<T, ValidationErrors> {
    return this.businessRules.validate(value);
  }
}

// With Aggregates
class OrderAggregate extends AggregateRoot<OrderId> {
  private validator: IValidator<OrderAggregate>;
  
  constructor(id: OrderId) {
    super(id);
    this.validator = new OrderValidator();
  }
  
  update(updateData: Partial<OrderData>): Result<void, ValidationErrors> {
    // Apply updates
    Object.assign(this, updateData);
    
    // Validate new state
    const validationResult = this.validator.validate(this);
    
    if (validationResult.isFailure()) {
      // Rollback changes
      // ... rollback logic
      return Result.fail(validationResult.error);
    }
    
    this.apply('OrderUpdated', { orderId: this.getId(), updateData });
    return Result.ok();
  }
}

// With Domain Services
class TransferService {
  constructor(
    private transferValidator: IValidator<TransferRequest>,
    private accountRepository: IAccountRepository
  ) {}
  
  async transfer(request: TransferRequest): Promise<Result<Transfer, ValidationErrors>> {
    // Validate request
    const validationResult = await this.transferValidator.validate(request);
    
    if (validationResult.isFailure()) {
      return Result.fail(validationResult.error);
    }
    
    // Proceed with transfer
    const transfer = await this.executeTransfer(request);
    return Result.ok(transfer);
  }
}
```

### Best Practices
1. Validate at domain boundaries
2. Return all validation errors at once
3. Provide clear, actionable error messages
4. Use appropriate validation level (domain vs application)
5. Consider async validation for external dependencies

### Common Pitfalls
1. Validating at the wrong layer
2. Throwing exceptions instead of returning results
3. Not providing enough context in errors
4. Validating individual fields instead of whole objects
5. Duplicating validation logic

---

### Choosing the Right Pattern: Specifications vs Business Rules vs Policies vs Validation

#### When to Use Each Pattern

**Specifications**:
- Use when you need to answer a yes/no question about an object
- When you want to filter collections or build queries
- When rules need to be combined with AND/OR/NOT logic
- For reusable business criteria that can be shared across contexts

**Business Rules**:
- Use for complex validation involving multiple properties
- When you need conditional validation logic
- For enforcing domain invariants within entities/aggregates
- When validation rules are tightly coupled to the domain model

**Business Policies**:
- Use for high-level business decisions that may change
- When rules represent business strategy rather than invariants
- For configurable rules that vary by context (region, time, customer segment)
- When implementing A/B testing or feature flags for business logic

**Validation**:
- Use for ensuring data integrity and format correctness
- When checking if domain objects are in a valid state
- For command validation before execution
- When you need detailed error reporting with multiple validation errors

#### Pattern Comparison Matrix

| Aspect | Specifications | Business Rules | Business Policies | Validation |
|--------|---------------|----------------|-------------------|------------|
| **Purpose** | Answer yes/no questions | Enforce domain invariants | Implement business strategy | Ensure data correctness |
| **Returns** | Boolean | Result with errors | Result with policy violations | Result with validation errors |
| **Complexity** | Simple to moderate | Moderate to complex | Complex, configurable | Simple to complex |
| **Change Frequency** | Rarely changes | Changes with domain | Changes with business strategy | Rarely changes |
| **Scope** | Single responsibility | Multiple properties | Strategic decisions | Data integrity |
| **Composability** | High (AND/OR/NOT) | Moderate (when/then) | High (AND/OR) | Low to moderate |
| **Configuration** | Usually hardcoded | Usually hardcoded | Often configurable | Usually hardcoded |
| **Use in Queries** | Yes | No | No | No |
| **Error Detail** | Optional explanation | Detailed errors | Policy violations | Detailed errors |
| **Examples** | "Is customer eligible?", "Is order high-value?" | "Order must have items", "Email must be unique" | "Free shipping threshold", "Credit approval limits" | "Email format", "Required fields" |

#### Decision Flow Chart

```
Start: What are you trying to do?
│
├─ Answer a yes/no question about an object?
│  └─ Use Specification
│
├─ Validate data format and required fields?
│  └─ Use Validation
│
├─ Enforce business invariants that never change?
│  └─ Use Business Rules
│
├─ Implement configurable business strategy?
│  └─ Use Business Policy
│
├─ Need complex conditional validation?
│  ├─ Involves multiple properties? → Business Rules
│  └─ Based on business context? → Business Policy
│
└─ Need to filter/query collections?
   └─ Use Specification
```

#### Practical Examples

```typescript
// Specification: Can answer yes/no, used for filtering
const activeCustomerSpec = new ActiveCustomerSpecification();
const customers = repository.findBySpecification(activeCustomerSpec);

// Business Rule: Enforces invariants, returns detailed errors
const orderRules = BusinessRuleValidator.create<Order>()
  .addRule('items', order => order.items.length > 0, 'Order must have items');
  
// Business Policy: Strategic decision, configurable
const shippingPolicy = new FreeShippingPolicy(configurable.minimumOrderValue);
const policyResult = shippingPolicy.check(order);

// Validation: Data integrity, format checking
const emailValidator = new EmailValidator();
const validationResult = emailValidator.validate(userInput);
```

#### Combining Patterns

These patterns often work together:

```typescript
// Business Rule using Specifications
const orderValidator = BusinessRuleValidator.create<Order>()
  .mustSatisfy(new ValidOrderSpecification(), 'Order is invalid');

// Policy using Specifications internally
class CreditPolicy implements IBusinessPolicy<Application> {
  private spec = new MinimumCreditScoreSpecification(650);
  
  check(application: Application): Result<Application, PolicyViolation> {
    if (!this.spec.isSatisfiedBy(application)) {
      return Result.fail(new PolicyViolation('LOW_CREDIT', 'Credit score too low'));
    }
    return Result.ok(application);
  }
}

// Validation using Business Rules
class ComprehensiveValidator<T> implements IValidator<T> {
  constructor(private businessRules: BusinessRuleValidator<T>) {}
  
  validate(value: T): Result<T, ValidationErrors> {
    return this.businessRules.validate(value);
  }
}
```

---

### 10. Domain Services

### What are Domain Services?

Domain Services encapsulate domain logic that doesn't naturally fit within entities or value objects. They represent operations, actions, or activities within the domain that involve multiple aggregates or require coordination between different parts of the domain.

### Primary Use Cases

- Operations that span multiple aggregates
- Domain logic that doesn't belong to any specific entity
- Coordination of complex business processes
- Integration with external services while maintaining domain focus
- Stateless operations that transform or calculate

### When to Use

- When an operation involves multiple aggregates
- When business logic doesn't naturally fit in an entity
- For complex calculations or transformations
- When coordinating between different parts of the domain

### When NOT to Use

- When the logic belongs to a specific entity
- For simple CRUD operations
- For infrastructure concerns (use application services)
- When the operation is not part of the domain language

### Core Components

#### IDomainService Interface

```typescript
interface IDomainService {
  readonly serviceId?: string;
}
```

#### Service Capability Interfaces
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

#### Service Capability Interfaces

```typescript
interface DomainServiceOptions {
  serviceId: string;
  dependencies?: string[];
  async?: boolean;
  transactional?: boolean;
  publishesEvents?: boolean;
}

function DomainService(options: DomainServiceOptions): ClassDecorator {
  return (target: any) => {
    Reflect.defineMetadata('domainService', options, target);
    return target;
  };
}
```

#### Service Registry Components

```typescript
// Default registry implementation
class DefaultDomainServiceRegistry implements IDomainServiceRegistry {
  private services = new Map<string, IDomainService>();
  
  register<T extends IDomainService>(service: T, serviceId?: string): void {
    const id = serviceId || service.serviceId;
    if (!id) {
      throw new Error('Service ID is required');
    }
    this.services.set(id, service);
  }
  
  get<T extends IDomainService>(serviceId: string): T | undefined {
    return this.services.get(serviceId) as T;
  }
  
  has(serviceId: string): boolean {
    return this.services.has(serviceId);
  }
  
  remove(serviceId: string): boolean {
    return this.services.delete(serviceId);
  }
  
  getAll(): Map<string, IDomainService> {
    return new Map(this.services);
  }
  
  clear(): void {
    this.services.clear();
  }
}

// Global singleton registry
class GlobalServiceRegistry {
  private static instance: IDomainServiceRegistry;
  
  static getInstance(): IDomainServiceRegistry {
    if (!this.instance) {
      this.instance = new DefaultDomainServiceRegistry();
    }
    return this.instance;
  }
}
```

#### Service Registry Components

```typescript
class DomainServiceContainer {
  private registry: IDomainServiceRegistry;
  private eventBus?: IEventBus;
  private unitOfWorkFactory?: () => IUnitOfWork;
  private dependencies = new Map<string, string[]>();
  private initializing = new Set<string>();
  
  constructor(
    registry?: IDomainServiceRegistry,
    eventBus?: IEventBus,
    unitOfWorkFactory?: () => IUnitOfWork
  ) {
    this.registry = registry || new DefaultDomainServiceRegistry();
    this.eventBus = eventBus;
    this.unitOfWorkFactory = unitOfWorkFactory;
  }
  
  registerFactory<T extends IDomainService>(
    serviceId: string,
    factory: () => T,
    dependencies: string[] = []
  ): void {
    this.dependencies.set(serviceId, dependencies);
    
    // Create service instance
    const service = factory();
    
    // Configure service based on its capabilities
    this.configureService(service);
    
    // Register in registry
    this.registry.register(service, serviceId);
  }
  
  private configureService(service: IDomainService): void {
    // Set event bus if service is event-aware
    if (this.eventBus && this.isEventBusAware(service)) {
      service.setEventBus(this.eventBus);
    }
    
    // Set unit of work if service is UoW-aware
    if (this.unitOfWorkFactory && this.isUnitOfWorkAware(service)) {
      service.setUnitOfWork(this.unitOfWorkFactory());
    }
  }
  
  async initializeServices(): Promise<void> {
    const services = this.registry.getAll();
    
    for (const [serviceId, service] of services) {
      if (this.isAsyncDomainService(service) && service.initialize) {
        await this.initializeService(serviceId, service);
      }
    }
  }
  
  private async initializeService(
    serviceId: string, 
    service: IAsyncDomainService
  ): Promise<void> {
    if (this.initializing.has(serviceId)) {
      throw new Error(`Circular dependency detected: ${serviceId}`);
    }
    
    this.initializing.add(serviceId);
    
    try {
      // Initialize dependencies first
      const deps = this.dependencies.get(serviceId) || [];
      for (const depId of deps) {
        const depService = this.registry.get(depId);
        if (depService && this.isAsyncDomainService(depService)) {
          await this.initializeService(depId, depService);
        }
      }
      
      // Initialize the service
      if (service.initialize) {
        await service.initialize();
      }
    } finally {
      this.initializing.delete(serviceId);
    }
  }
  
  getService<T extends IDomainService>(serviceId: string): T | undefined {
    return this.registry.get<T>(serviceId);
  }
  
  private isEventBusAware(service: any): service is IEventBusAware {
    return 'setEventBus' in service;
  }
  
  private isUnitOfWorkAware(service: any): service is IUnitOfWorkAware {
    return 'setUnitOfWork' in service && 'clearUnitOfWork' in service;
  }
  
  private isAsyncDomainService(service: any): service is IAsyncDomainService {
    return 'initialize' in service || 'dispose' in service;
  }
}
```

#### ServiceBuilder

```typescript
class ServiceBuilder<T extends IDomainService> {
  private dependencies: string[] = [];
  private eventBus?: IEventBus;
  private unitOfWork?: IUnitOfWork;
  
  constructor(
    private registry: IDomainServiceRegistry,
    private serviceId: string,
    private factory: (...deps: any[]) => T
  ) {}
  
  dependsOn(...serviceIds: string[]): this {
    this.dependencies.push(...serviceIds);
    return this;
  }
  
  withEventBus(eventBus: IEventBus): this {
    this.eventBus = eventBus;
    return this;
  }
  
  withUnitOfWork(unitOfWork: IUnitOfWork): this {
    this.unitOfWork = unitOfWork;
    return this;
  }
  
  build(): T {
    // Resolve dependencies
    const resolvedDeps = this.dependencies.map(depId => {
      const dep = this.registry.get(depId);
      if (!dep) {
        throw new Error(`Dependency ${depId} not found`);
      }
      return dep;
    });
    
    // Create service
    const service = this.factory(...resolvedDeps);
    
    // Configure
    if (this.eventBus && 'setEventBus' in service) {
      (service as any).setEventBus(this.eventBus);
    }
    
    if (this.unitOfWork && 'setUnitOfWork' in service) {
      (service as any).setUnitOfWork(this.unitOfWork);
    }
    
    return service;
  }
  
  buildAndRegister(): T {
    const service = this.build();
    this.registry.register(service, this.serviceId);
    return service;
  }
}
```

### Basic Examples

#### E-commerce: Order Processing with Decorator

```typescript
@DomainService({
  serviceId: 'order-processing-service',
  dependencies: ['inventory-service', 'pricing-service'],
  transactional: true,
  publishesEvents: true
})
class OrderProcessingService extends UnitOfWorkAwareDomainService {
  constructor(
    private inventoryService: InventoryService,
    private pricingService: PricingService
  ) {
    super('order-processing-service');
  }
  
  async processOrder(order: Order): Promise<Result<Order, ProcessingError>> {
    return this.executeInTransaction(async () => {
      // Check inventory
      for (const item of order.getItems()) {
        const available = await this.inventoryService.checkAvailability(
          item.productId,
          item.quantity
        );
        
        if (!available) {
          throw new ProcessingError(`Product ${item.productId} out of stock`);
        }
      }
      
      // Calculate final price
      const finalPrice = await this.pricingService.calculateOrderTotal(
        order,
        order.getCustomer()
      );
      
      order.setFinalPrice(finalPrice);
      
      // Reserve inventory
      for (const item of order.getItems()) {
        await this.inventoryService.reserve(
          item.productId,
          item.quantity,
          order.getId()
        );
      }
      
      // Update order status
      order.markAsProcessed();
      
      // Events are published automatically after transaction commits
      this.publishEvent(new OrderProcessed(
        order.getId(),
        finalPrice,
        new Date()
      ));
      
      return Result.ok(order);
    });
  }
}
```

#### Banking: Account Service with Container

```typescript
// Service definition
class AccountService extends EventAwareDomainService {
  constructor(
    private accountRepository: IAccountRepository,
    private limitService: ILimitService
  ) {
    super('account-service');
  }
  
  async transfer(
    fromId: AccountId,
    toId: AccountId,
    amount: Money
  ): Promise<TransferResult> {
    const fromAccount = await this.accountRepository.findById(fromId);
    const toAccount = await this.accountRepository.findById(toId);
    
    // Validate accounts
    if (!fromAccount || !toAccount) {
      throw new Error('Account not found');
    }
    
    // Check limits
    const limitCheck = await this.limitService.checkTransferLimit(
      fromAccount,
      amount
    );
    
    if (!limitCheck.isAllowed) {
      throw new Error(`Transfer limit exceeded: ${limitCheck.reason}`);
    }
    
    // Perform transfer
    fromAccount.withdraw(amount);
    toAccount.deposit(amount);
    
    // Save accounts (events are collected in aggregates)
    await this.accountRepository.save(fromAccount);
    await this.accountRepository.save(toAccount);
    
    return new TransferResult(
      fromId,
      toId,
      amount,
      TransferStatus.COMPLETED
    );
  }
}

// Container setup
const container = new DomainServiceContainer(
  GlobalServiceRegistry.getInstance(),
  eventBus,
  () => new UnitOfWork()
);

// Register services with dependencies
container.registerFactory(
  'limit-service',
  () => new LimitService(),
  []
);

container.registerFactory(
  'account-service',
  () => new AccountService(accountRepository, limitService),
  ['limit-service']
);

// Initialize all services
await container.initializeServices();

// Get service from container
const accountService = container.getService<AccountService>('account-service');
```

#### E-commerce: Pricing Service
```typescript
class PricingService extends BaseDomainService {
  constructor(
    private readonly pricingStrategy: IPricingStrategy,
    private readonly discountRepository: IDiscountRepository
  ) {
    super('pricing-service');
  }
  
  async calculateOrderTotal(order: Order, customer: Customer): Promise<Money> {
    let total = Money.zero(order.getCurrency());
    
    // Calculate base price for all items
    for (const item of order.getItems()) {
      const itemPrice = await this.pricingStrategy.calculatePrice(
        item.getProduct(),
        item.getQuantity(),
        customer
      );
      total = total.add(itemPrice);
    }
    
    // Apply applicable discounts
    const discounts = await this.discountRepository.findApplicableDiscounts(
      order,
      customer,
      new Date()
    );
    
    for (const discount of discounts) {
      total = discount.apply(total);
    }
    
    return total;
  }
  
  async calculateShipping(order: Order, shippingMethod: ShippingMethod): Promise<Money> {
    const weight = order.getTotalWeight();
    const destination = order.getShippingAddress();
    
    return this.pricingStrategy.calculateShipping(
      weight,
      destination,
      shippingMethod
    );
  }
}
```

#### Banking: Transfer Service
```typescript
class TransferService extends EventAwareDomainService {
  constructor(
    private readonly accountRepository: IAccountRepository,
    private readonly transferLimits: ITransferLimitsService
  ) {
    super('transfer-service');
  }
  
  async transfer(
    fromAccountId: AccountId,
    toAccountId: AccountId,
    amount: Money,
    reference: string
  ): Promise<TransferResult> {
    // Load accounts
    const fromAccount = await this.accountRepository.findById(fromAccountId);
    const toAccount = await this.accountRepository.findById(toAccountId);
    
    if (!fromAccount || !toAccount) {
      throw new Error('Account not found');
    }
    
    // Validate transfer
    this.validateTransfer(fromAccount, toAccount, amount);
    
    // Check limits
    await this.checkTransferLimits(fromAccount, amount);
    
    // Perform transfer
    fromAccount.withdraw(amount, reference);
    toAccount.deposit(amount, reference);
    
    // Save accounts
    await this.accountRepository.save(fromAccount);
    await this.accountRepository.save(toAccount);
    
    // Publish event
    this.publishEvent(new MoneyTransferred(
      fromAccountId,
      toAccountId,
      amount,
      reference,
      new Date()
    ));
    
    return new TransferResult(
      fromAccountId,
      toAccountId,
      amount,
      reference,
      TransferStatus.COMPLETED
    );
  }
  
  private validateTransfer(
    fromAccount: Account,
    toAccount: Account,
    amount: Money
  ): void {
    if (!fromAccount.isActive()) {
      throw new Error('Source account is not active');
    }
    
    if (!toAccount.isActive()) {
      throw new Error('Destination account is not active');
    }
    
    if (fromAccount.getBalance().isLessThan(amount)) {
      throw new Error('Insufficient funds');
    }
    
    if (!fromAccount.getCurrency().equals(toAccount.getCurrency())) {
      throw new Error('Currency mismatch');
    }
  }
  
  private async checkTransferLimits(
    account: Account,
    amount: Money
  ): Promise<void> {
    const dailyLimit = await this.transferLimits.getDailyLimit(account.getId());
    const dailyTotal = await this.transferLimits.getDailyTotal(account.getId());
    
    if (dailyTotal.add(amount).isGreaterThan(dailyLimit)) {
      throw new Error('Daily transfer limit exceeded');
    }
  }
}
```

### Advanced Examples

#### Healthcare: Patient Care Coordination with Builder
```typescript
class PatientCareCoordinator extends EventAwareDomainService {
  constructor(
    private patientRepository: IPatientRepository,
    private appointmentService: AppointmentService,
    private medicationService: MedicationService
  ) {
    super('patient-care-coordinator');
  }
  
  async coordinateCare(
    patientId: PatientId,
    careplan: CarePlan
  ): Promise<Result<CareCoordinationResult, Error>> {
    const patient = await this.patientRepository.findById(patientId);
    if (!patient) {
      return Result.fail(new Error('Patient not found'));
    }
    
    // Schedule appointments
    const appointments = await this.scheduleAppointments(patient, careplan);
    
    // Set up medication schedule
    const medicationSchedule = await this.setupMedications(patient, careplan);
    
    // Create care coordination record
    const coordination = new CareCoordination(
      patient.getId(),
      careplan,
      appointments,
      medicationSchedule
    );
    
    // Publish coordination event
    this.publishEvent(new CareCoordinationStarted(
      coordination.getId(),
      patient.getId(),
      careplan.getId()
    ));
    
    return Result.ok(new CareCoordinationResult(
      coordination,
      appointments,
      medicationSchedule
    ));
  }
  
  private async scheduleAppointments(
    patient: Patient,
    careplan: CarePlan
  ): Promise<Appointment[]> {
    const appointments: Appointment[] = [];
    
    for (const requirement of careplan.getAppointmentRequirements()) {
      const appointment = await this.appointmentService.scheduleAppointment({
        patientId: patient.getId(),
        providerId: requirement.providerId,
        appointmentType: requirement.type,
        preferredDates: requirement.preferredDates
      });
      
      appointments.push(appointment);
    }
    
    return appointments;
  }
}

// Using ServiceBuilder
const registry = GlobalServiceRegistry.getInstance();

const patientCareCoordinator = new ServiceBuilder<PatientCareCoordinator>(
  registry,
  'patient-care-coordinator',
  (patientRepo, appointmentService, medicationService) => 
    new PatientCareCoordinator(patientRepo, appointmentService, medicationService)
)
.dependsOn('patient-repository', 'appointment-service', 'medication-service')
.withEventBus(eventBus)
.buildAndRegister();
```

#### Complex Service with Async Initialization

```typescript
@DomainService({
  serviceId: 'external-payment-service',
  async: true,
  publishesEvents: true
})
class ExternalPaymentService extends AsyncDomainService {
  private client?: PaymentGatewayClient;
  
  constructor(private config: PaymentConfig) {
    super('external-payment-service');
  }
  
  async initialize(): Promise<void> {
    // Initialize connection to external payment gateway
    this.client = await PaymentGatewayClient.connect(this.config);
    console.log('Payment service initialized');
  }
  
  async dispose(): Promise<void> {
    // Clean up resources
    if (this.client) {
      await this.client.disconnect();
    }
    console.log('Payment service disposed');
  }
  
  async processPayment(
    payment: Payment
  ): Promise<Result<PaymentReceipt, PaymentError>> {
    if (!this.client) {
      throw new Error('Payment service not initialized');
    }
    
    try {
      const result = await this.client.processPayment({
        amount: payment.amount.value,
        currency: payment.amount.currency,
        method: payment.method,
        reference: payment.reference
      });
      
      if (result.success) {
        const receipt = new PaymentReceipt(
          result.transactionId,
          payment.amount,
          result.timestamp
        );
        
        return Result.ok(receipt);
      } else {
        return Result.fail(new PaymentError(
          result.errorCode,
          result.errorMessage
        ));
      }
    } catch (error) {
      return Result.fail(new PaymentError(
        'GATEWAY_ERROR',
        error.message
      ));
    }
  }
}
```

#### Logistics: Route Optimization Service
```typescript
class RouteOptimizationService extends BaseDomainService {
  constructor(
    private readonly vehicleRepository: IVehicleRepository,
    private readonly locationService: ILocationService,
    private readonly trafficService: ITrafficService
  ) {
    super('route-optimization');
  }
  
  async optimizeDeliveryRoute(
    deliveries: Delivery[],
    vehicleId: VehicleId,
    constraints: RouteConstraints
  ): Promise<OptimizedRoute> {
    const vehicle = await this.vehicleRepository.findById(vehicleId);
    if (!vehicle) {
      throw new Error('Vehicle not found');
    }
    
    // Group deliveries by area
    const clusters = this.clusterDeliveries(deliveries);
    
    // Calculate optimal sequence for each cluster
    const optimizedClusters = await Promise.all(
      clusters.map(cluster => this.optimizeCluster(cluster, vehicle, constraints))
    );
    
    // Combine clusters into final route
    const route = await this.combineClusterRoutes(
      optimizedClusters,
      vehicle,
      constraints
    );
    
    // Apply real-time traffic adjustments
    const trafficAdjustedRoute = await this.adjustForTraffic(route);
    
    return new OptimizedRoute(
      vehicleId,
      trafficAdjustedRoute,
      this.calculateEstimates(trafficAdjustedRoute, vehicle)
    );
  }
  
  private clusterDeliveries(deliveries: Delivery[]): DeliveryCluster[] {
    // Implementation of clustering algorithm (e.g., K-means)
    const clusters: DeliveryCluster[] = [];
    
    // Group by geographic proximity
    const centerPoints = this.findClusterCenters(deliveries);
    
    for (const delivery of deliveries) {
      const nearestCluster = this.findNearestCluster(
        delivery.getAddress(),
        centerPoints
      );
      clusters[nearestCluster].addDelivery(delivery);
    }
    
    return clusters;
  }
  
  private async optimizeCluster(
    cluster: DeliveryCluster,
    vehicle: Vehicle,
    constraints: RouteConstraints
  ): Promise<OptimizedCluster> {
    // Use traveling salesman algorithm within cluster
    const deliveries = cluster.getDeliveries();
    const distanceMatrix = await this.calculateDistanceMatrix(deliveries);
    
    // Apply constraints
    const timeWindows = deliveries.map(d => d.getTimeWindow());
    const priorities = deliveries.map(d => d.getPriority());
    
    // Optimize sequence considering constraints
    const sequence = this.solveTSPWithConstraints(
      distanceMatrix,
      timeWindows,
      priorities,
      constraints
    );
    
    return new OptimizedCluster(cluster, sequence);
  }
  
  private async adjustForTraffic(route: Route): Promise<Route> {
    const segments = route.getSegments();
    const adjustedSegments: RouteSegment[] = [];
    
    for (const segment of segments) {
      const traffic = await this.trafficService.getTrafficConditions(
        segment.getStart(),
        segment.getEnd(),
        segment.getEstimatedTime()
      );
      
      if (traffic.hasCongestion()) {
        // Find alternative route for this segment
        const alternative = await this.findAlternativeRoute(
          segment,
          traffic
        );
        
        if (alternative && alternative.isFaster()) {
          adjustedSegments.push(alternative);
        } else {
          adjustedSegments.push(segment.adjustForTraffic(traffic));
        }
      } else {
        adjustedSegments.push(segment);
      }
    }
    
    return new Route(adjustedSegments);
  }
}
```

### Standalone Usage
```typescript
// Domain service without infrastructure dependencies
class ProductRecommendationService extends BaseDomainService {
  constructor() {
    super('product-recommendation');
  }
  
  recommendProducts(
    customer: Customer,
    currentCart: Cart,
    browsingHistory: BrowsingHistory
  ): Product[] {
    const recommendations: Product[] = [];
    
    // Rule-based recommendations
    const frequentlyBoughtTogether = this.findFrequentlyBoughtTogether(
      currentCart.getItems()
    );
    recommendations.push(...frequentlyBoughtTogether);
    
    // Customer preference based
    const preferenceBasedProducts = this.findByCustomerPreferences(
      customer.getPreferences(),
      browsingHistory
    );
    recommendations.push(...preferenceBasedProducts);
    
    // Remove duplicates and items already in cart
    return this.filterAndRank(recommendations, currentCart);
  }
  
  private findFrequentlyBoughtTogether(cartItems: CartItem[]): Product[] {
    // Implementation of association rule mining
    return [];
  }
  
  private findByCustomerPreferences(
    preferences: CustomerPreferences,
    history: BrowsingHistory
  ): Product[] {
    // Implementation of preference matching
    return [];
  }
  
  private filterAndRank(products: Product[], cart: Cart): Product[] {
    // Remove items already in cart
    const filtered = products.filter(
      product => !cart.containsProduct(product.getId())
    );
    
    // Rank by relevance score
    return filtered.sort((a, b) => 
      this.calculateRelevanceScore(b) - this.calculateRelevanceScore(a)
    );
  }
  
  private calculateRelevanceScore(product: Product): number {
    // Scoring algorithm
    return 0;
  }
}

// Usage
const recommendationService = new ProductRecommendationService();
const recommendations = recommendationService.recommendProducts(
  customer,
  cart,
  browsingHistory
);
```

### Integration with Other Patterns

#### With Specifications
```typescript
class LoanApplicationService extends EventAwareDomainService {
  constructor(
    private readonly creditCheckService: ICreditCheckService,
    private readonly riskAssessmentService: IRiskAssessmentService
  ) {
    super('loan-application-service');
  }
  
  async processApplication(
    application: LoanApplication
  ): Promise<ApplicationResult> {
    // Use specifications to check eligibility
    const eligibilitySpec = new LoanEligibilitySpecification();
    
    if (!eligibilitySpec.isSatisfiedBy(application)) {
      const reason = eligibilitySpec.explainFailure(application);
      return ApplicationResult.rejected(reason);
    }
    
    // Check credit score
    const creditScore = await this.creditCheckService.checkCredit(
      application.getApplicant()
    );
    
    // Create credit specification based on loan type
    const creditSpec = this.createCreditSpecification(
      application.getLoanType(),
      creditScore
    );
    
    if (!creditSpec.isSatisfiedBy(application)) {
      return ApplicationResult.rejected('Credit requirements not met');
    }
    
    // Assess risk
    const riskScore = await this.riskAssessmentService.assessRisk(
      application,
      creditScore
    );
    
    // Determine approval
    if (riskScore.isAcceptable()) {
      const terms = this.calculateLoanTerms(application, riskScore);
      
      this.publishEvent(new LoanApplicationApproved(
        application.getId(),
        terms
      ));
      
      return ApplicationResult.approved(terms);
    } else {
      this.publishEvent(new LoanApplicationRejected(
        application.getId(),
        riskScore.getReason()
      ));
      
      return ApplicationResult.rejected(riskScore.getReason());
    }
  }
  
  private createCreditSpecification(
    loanType: LoanType,
    creditScore: CreditScore
  ): ISpecification<LoanApplication> {
    switch (loanType) {
      case LoanType.MORTGAGE:
        return new MortgageCreditSpecification(creditScore);
      case LoanType.AUTO:
        return new AutoLoanCreditSpecification(creditScore);
      case LoanType.PERSONAL:
        return new PersonalLoanCreditSpecification(creditScore);
      default:
        return new StandardCreditSpecification(creditScore);
    }
  }
}
```

#### With Unit of Work (30% example)
```typescript
class OrderFulfillmentService extends UnitOfWorkAwareDomainService {
  constructor(
    private readonly inventoryService: IInventoryService,
    private readonly shippingService: IShippingService
  ) {
    super('order-fulfillment');
  }
  
  async fulfillOrder(orderId: OrderId): Promise<Result<void, FulfillmentError>> {
    return this.executeInTransaction(async () => {
      // Get repositories from unit of work
      const orderRepo = this.unitOfWork!.getRepository<Order>('orders');
      const inventoryRepo = this.unitOfWork!.getRepository<Inventory>('inventory');
      
      // Load order
      const order = await orderRepo.findById(orderId);
      if (!order) {
        throw new FulfillmentError('Order not found');
      }
      
      // Reserve inventory for each item
      for (const item of order.getItems()) {
        const inventory = await inventoryRepo.findByProduct(item.getProductId());
        
        if (!inventory.canReserve(item.getQuantity())) {
          throw new FulfillmentError(
            `Insufficient inventory for ${item.getProductId()}`
          );
        }
        
        inventory.reserve(item.getQuantity(), orderId);
        await inventoryRepo.save(inventory);
      }
      
      // Create shipment
      const shipment = await this.shippingService.createShipment(order);
      
      // Update order status
      order.markAsFulfilled(shipment.getId());
      await orderRepo.save(order);
      
      // Publish event
      this.publishEvent(new OrderFulfilled(orderId, shipment.getId()));
    });
  }
}
```

#### With Business Rules
```typescript
class InsuranceClaimService extends EventAwareDomainService {
  constructor(
    private readonly claimValidator: BusinessRuleValidator<Claim>,
    private readonly policyRepository: IPolicyRepository,
    private readonly adjustorService: IAdjustorService
  ) {
    super('insurance-claim-service');
  }
  
  async submitClaim(claimData: ClaimData): Promise<Result<Claim, ValidationErrors>> {
    // Create claim
    const claim = Claim.create(claimData);
    
    // Validate with business rules
    const validationResult = this.claimValidator.validate(claim);
    if (validationResult.isFailure()) {
      return validationResult;
    }
    
    // Load policy
    const policy = await this.policyRepository.findById(claimData.policyId);
    if (!policy) {
      return Result.fail(new ValidationErrors([
        new ValidationError('policyId', 'Policy not found')
      ]));
    }
    
    // Check policy coverage
    if (!policy.covers(claim.getType())) {
      return Result.fail(new ValidationErrors([
        new ValidationError('claimType', 'Claim type not covered by policy')
      ]));
    }
    
    // Assign to adjustor
    const adjustor = await this.adjustorService.assignAdjustor(claim);
    claim.assignTo(adjustor);
    
    // Publish event
    this.publishEvent(new ClaimSubmitted(
      claim.getId(),
      claim.getPolicyId(),
      claim.getType(),
      adjustor.getId()
    ));
    
    return Result.ok(claim);
  }
}
```

### Best Practices
1. Keep services focused on a single responsibility
2. Use dependency injection for repositories and other services
3. Return Result types for operations that can fail
4. Publish domain events for significant operations
5. Keep services stateless
6. Name services after what they do (verb-noun)

### Common Pitfalls
1. Putting too much logic in services (anemic domain model)
2. Creating services for every operation (over-engineering)
3. Not using domain language in service names
4. Mixing infrastructure concerns with domain logic
5. Creating stateful services

---

### 11. Domain Events

### What are Domain Events?
Domain Events capture and communicate important occurrences within the domain. They are immutable records of something that has happened, enabling loose coupling between different parts of the system.

### Primary Use Cases
- Recording significant domain occurrences
- Enabling event-driven architecture
- Decoupling aggregates and bounded contexts
- Supporting event sourcing
- Triggering side effects and integrations

### When to Use
- When something important happens in the domain
- To communicate between aggregates
- For audit logging and history tracking
- To trigger asynchronous processes
- For integration with external systems

### When NOT to Use
- For synchronous request-response communication
- For simple data updates without business significance
- When immediate consistency is required
- For technical events (use technical events instead)

### Core Components

#### IDomainEvent Interface
```typescript
interface IDomainEvent<P = any> {
  eventType: string;
  payload?: P;
}
```

#### IExtendedDomainEvent Interface
```typescript
interface IExtendedDomainEvent<P = any> extends IDomainEvent<P> {
  metadata?: IEventMetadata;
}
```

#### IEventMetadata Interface
```typescript
interface IEventMetadata {
  eventId?: string;               // Unique event identifier
  timestamp?: Date;               // When the event occurred
  correlationId?: string;         // To correlate related events
  causationId?: string;           // What caused this event
  aggregateId?: string | number;  // Source aggregate
  aggregateType?: string;         // Type of aggregate
  aggregateVersion?: number;      // Version after event
  eventVersion?: number;          // Event schema version
  userId?: string;                // Who triggered it
  [key: string]: any;            // Additional metadata
}
```

#### DomainEvent Abstract Class
```typescript
abstract class DomainEvent<T = any> implements IExtendedDomainEvent<T> {
  readonly eventId: string;
  readonly occurredOn: Date;
  readonly eventType: string;
  readonly payload?: T;
  readonly metadata?: IEventMetadata;
  
  constructor(payload?: T, metadata?: IEventMetadata) {
    this.eventId = uuid();
    this.occurredOn = new Date();
    this.eventType = this.constructor.name;
    this.payload = payload;
    this.metadata = {
      ...metadata,
      eventId: this.eventId,
      timestamp: this.occurredOn
    };
  }
  
  withMetadata(metadata: Partial<IEventMetadata>): DomainEvent<T> {
    return new (this.constructor as any)(
      this.payload,
      { ...this.metadata, ...metadata }
    );
  }
}
```

### Basic Examples

#### E-commerce: Order Events with Proper Aggregate Integration

```typescript
// Define domain event classes
class OrderPlaced extends DomainEvent<{
  orderId: string;
  customerId: string;
  total: Money;
  items: OrderItem[];
}> {}

class OrderShipped extends DomainEvent<{
  orderId: string;
  trackingNumber: string;
  carrier: string;
  estimatedDelivery: Date;
}> {}

// Using in aggregate - events are NOT published directly
class Order extends AggregateRoot<OrderId> {
  private customerId: CustomerId;
  private items: OrderItem[] = [];
  private status: OrderStatus;
  
  placeOrder(customerId: CustomerId, items: OrderItem[]): void {
    if (items.length === 0) {
      throw new Error('Order must have at least one item');
    }
    
    // Use apply method - it creates the event and calls the handler
    this.apply('OrderPlaced', {
      orderId: this.getId().value,
      customerId: customerId.value,
      total: this.calculateTotal(items),
      items
    });
  }
  
  ship(trackingNumber: string, carrier: string): void {
    if (this.status !== OrderStatus.PAID) {
      throw new Error('Cannot ship unpaid order');
    }
    
    // Apply method handles event creation and state update
    this.apply('OrderShipped', {
      orderId: this.getId().value,
      trackingNumber,
      carrier,
      estimatedDelivery: this.calculateDeliveryDate()
    });
  }
  
  // Event handlers - called automatically by apply()
  protected onOrderPlaced(payload: any): void {
    this.customerId = new CustomerId(payload.customerId);
    this.status = OrderStatus.PLACED;
    this.items = payload.items;
  }
  
  protected onOrderShipped(payload: any): void {
    this.status = OrderStatus.SHIPPED;
  }
}
```

#### Banking: Account Events
```typescript
class AccountOpened extends DomainEvent<{
  accountId: string;
  accountNumber: string;
  initialBalance: Money;
  accountType: AccountType;
  ownerId: string;
}> {}

class MoneyDeposited extends DomainEvent<{
  accountId: string;
  amount: Money;
  balance: Money;
  source: string;
  reference: string;
}> {}

class MoneyWithdrawn extends DomainEvent<{
  accountId: string;
  amount: Money;
  balance: Money;
  withdrawalMethod: string;
  reference: string;
}> {}

class AccountFrozen extends DomainEvent<{
  accountId: string;
  reason: string;
  frozenBy: string;
  frozenUntil?: Date;
}> {}

// Usage
const account = new Account(accountId);
account.deposit(new Money(100, 'USD'), 'ATM Deposit');

// Events are automatically created with metadata
const events = account.getDomainEvents();
// events[0] is MoneyDeposited with full metadata
```

### Advanced Examples

#### Healthcare: Patient Journey Events
```typescript
// Define rich domain events
class PatientAdmitted extends DomainEvent<{
  patientId: string;
  admissionId: string;
  department: string;
  admittingPhysician: string;
  admissionType: AdmissionType;
  primaryDiagnosis?: string;
}> {
  constructor(payload: any) {
    super(payload, {
      aggregateType: 'Patient',
      aggregateId: payload.patientId,
      eventVersion: 1
    });
  }
}

class DiagnosisRecorded extends DomainEvent<{
  patientId: string;
  diagnosisId: string;
  condition: string;
  severity: DiagnosisSevertiy;
  recordedBy: string;
  recordedAt: Date;
}> {}

class TreatmentStarted extends DomainEvent<{
  patientId: string;
  treatmentId: string;
  treatmentType: string;
  medications: Medication[];
  startedBy: string;
  expectedDuration: number;
}> {}

class PatientDischarged extends DomainEvent<{
  patientId: string;
  dischargeId: string;
  dischargeType: DischargeType;
  dischargeSummary: string;
  followUpRequired: boolean;
  dischargedBy: string;
}> {}

// Using events for patient journey tracking
class PatientJourney extends AggregateRoot<PatientId> {
  admit(admissionData: AdmissionData): void {
    this.apply(new PatientAdmitted({
      patientId: this.id.value,
      admissionId: AdmissionId.create().value,
      department: admissionData.department,
      admittingPhysician: admissionData.physicianId,
      admissionType: admissionData.type,
      primaryDiagnosis: admissionData.initialDiagnosis
    }));
  }
  
  recordDiagnosis(diagnosis: Diagnosis, physician: Physician): void {
    this.apply(new DiagnosisRecorded({
      patientId: this.id.value,
      diagnosisId: diagnosis.id.value,
      condition: diagnosis.condition,
      severity: diagnosis.severity,
      recordedBy: physician.id.value,
      recordedAt: new Date()
    }));
  }
  
  startTreatment(treatment: Treatment, physician: Physician): void {
    this.apply(new TreatmentStarted({
      patientId: this.id.value,
      treatmentId: treatment.id.value,
      treatmentType: treatment.type,
      medications: treatment.medications,
      startedBy: physician.id.value,
      expectedDuration: treatment.expectedDuration
    }));
  }
}
```

#### Event Enrichment Pattern
```typescript
// Base event with minimal data
class OrderStatusChanged extends DomainEvent<{
  orderId: string;
  oldStatus: OrderStatus;
  newStatus: OrderStatus;
}> {}

// Enriched event with additional context
class OrderStatusChangedEnriched extends OrderStatusChanged {
  constructor(
    basePayload: any,
    enrichmentData: {
      customer: CustomerSummary;
      orderValue: Money;
      itemCount: number;
    }
  ) {
    const enrichedPayload = {
      ...basePayload,
      ...enrichmentData
    };
    
    super(enrichedPayload, {
      eventVersion: 2,
      enrichedAt: new Date()
    });
  }
}

// Event enricher service
class EventEnricherService {
  constructor(
    private readonly customerRepository: ICustomerRepository,
    private readonly orderRepository: IOrderRepository
  ) {}
  
  async enrichOrderEvent(
    event: OrderStatusChanged
  ): Promise<OrderStatusChangedEnriched> {
    const order = await this.orderRepository.findById(event.payload.orderId);
    const customer = await this.customerRepository.findById(order.customerId);
    
    return new OrderStatusChangedEnriched(
      event.payload,
      {
        customer: customer.toSummary(),
        orderValue: order.total,
        itemCount: order.items.length
      }
    );
  }
}
```

#### Event Versioning
```typescript
// Version 1 of event
class ProductPriceChangedV1 extends DomainEvent<{
  productId: string;
  oldPrice: number;
  newPrice: number;
}> {
  constructor(payload: any) {
    super(payload, { eventVersion: 1 });
  }
}

// Version 2 with currency information
class ProductPriceChangedV2 extends DomainEvent<{
  productId: string;
  oldPrice: Money;
  newPrice: Money;
  reason?: string;
}> {
  constructor(payload: any) {
    super(payload, { eventVersion: 2 });
  }
}

// Event upgrader
class EventUpgrader {
  upgrade(event: IDomainEvent): IDomainEvent {
    if (event.eventType === 'ProductPriceChanged' && 
        event.metadata?.eventVersion === 1) {
      // Upgrade V1 to V2
      const v1Event = event as ProductPriceChangedV1;
      return new ProductPriceChangedV2({
        productId: v1Event.payload.productId,
        oldPrice: new Money(v1Event.payload.oldPrice, 'USD'),
        newPrice: new Money(v1Event.payload.newPrice, 'USD')
      });
    }
    
    return event;
  }
}
```

### Event Creation Patterns

#### Using Factory Function
```typescript
// Factory function for quick event creation
function createDomainEvent<P = any>(
  eventType: string,
  payload: P,
  metadata?: Partial<IEventMetadata>
): IExtendedDomainEvent<P> {
  return {
    eventType,
    payload,
    metadata: {
      eventId: uuid(),
      timestamp: new Date(),
      ...metadata
    }
  };
}

// Usage
const event = createDomainEvent('UserRegistered', {
  userId: '123',
  email: 'user@example.com',
  registeredAt: new Date()
});
```

#### Event Builder Pattern
```typescript
class DomainEventBuilder<T> {
  private payload: T;
  private metadata: Partial<IEventMetadata> = {};
  
  constructor(private eventType: string) {}
  
  withPayload(payload: T): this {
    this.payload = payload;
    return this;
  }
  
  withCorrelationId(correlationId: string): this {
    this.metadata.correlationId = correlationId;
    return this;
  }
  
  withCausationId(causationId: string): this {
    this.metadata.causationId = causationId;
    return this;
  }
  
  withUserId(userId: string): this {
    this.metadata.userId = userId;
    return this;
  }
  
  withAggregate(aggregateId: string, aggregateType: string): this {
    this.metadata.aggregateId = aggregateId;
    this.metadata.aggregateType = aggregateType;
    return this;
  }
  
  build(): IDomainEvent<T> {
    return createDomainEvent(this.eventType, this.payload, this.metadata);
  }
}

// Usage
const event = new DomainEventBuilder<OrderPlacedPayload>('OrderPlaced')
  .withPayload({ orderId: '123', total: new Money(100, 'USD') })
  .withCorrelationId('session-456')
  .withUserId('user-789')
  .withAggregate('123', 'Order')
  .build();
```

### Standalone Usage
```typescript
// Creating events without aggregates
const notificationService = {
  notifyOrderShipped(order: Order, shipment: Shipment): void {
    // Create event directly
    const event = new OrderShipped({
      orderId: order.id.value,
      trackingNumber: shipment.trackingNumber,
      carrier: shipment.carrier,
      estimatedDelivery: shipment.estimatedDelivery
    });
    
    // Publish to event bus
    eventBus.publish(event);
  }
};

// Using events for audit logging
class AuditLogger {
  private events: IDomainEvent[] = [];
  
  logEvent(event: IDomainEvent): void {
    this.events.push({
      ...event,
      metadata: {
        ...event.metadata,
        loggedAt: new Date()
      }
    });
  }
  
  getAuditTrail(aggregateId: string): IDomainEvent[] {
    return this.events.filter(
      e => e.metadata?.aggregateId === aggregateId
    );
  }
}
```

### Integration with Other Patterns

#### With Aggregates
```typescript
// Aggregate automatically creates events
class ShoppingCart extends AggregateRoot<CartId> {
  addItem(productId: ProductId, quantity: number): void {
    // Validate
    if (quantity <= 0) {
      throw new Error('Quantity must be positive');
    }
    
    // Apply event - automatically handled by aggregate
    this.apply('ItemAddedToCart', {
      cartId: this.id.value,
      productId: productId.value,
      quantity,
      addedAt: new Date()
    });
  }
  
  checkout(): void {
    if (this.items.length === 0) {
      throw new Error('Cannot checkout empty cart');
    }
    
    this.apply('CartCheckedOut', {
      cartId: this.id.value,
      items: this.items.map(i => i.toDTO()),
      total: this.calculateTotal(),
      checkedOutAt: new Date()
    });
  }
  
  // Event handlers
  protected onItemAddedToCart(payload: any): void {
    this.items.push(new CartItem(
      payload.productId,
      payload.quantity
    ));
  }
  
  protected onCartCheckedOut(payload: any): void {
    this.status = CartStatus.CHECKED_OUT;
    this.checkedOutAt = payload.checkedOutAt;
  }
}
```

#### With Domain Services
```typescript
class PaymentProcessingService extends EventAwareDomainService {
  async processPayment(
    order: Order,
    paymentMethod: PaymentMethod
  ): Promise<PaymentResult> {
    // Process payment
    const result = await this.paymentGateway.process(
      order.total,
      paymentMethod
    );
    
    if (result.success) {
      // Create and publish event
      this.publishEvent(new PaymentProcessed({
        orderId: order.id.value,
        paymentId: result.paymentId,
        amount: order.total,
        method: paymentMethod.type,
        processedAt: new Date()
      }));
      
      return PaymentResult.success(result.paymentId);
    } else {
      // Create and publish failure event
      this.publishEvent(new PaymentFailed({
        orderId: order.id.value,
        amount: order.total,
        method: paymentMethod.type,
        reason: result.error,
        failedAt: new Date()
      }));
      
      return PaymentResult.failure(result.error);
    }
  }
}
```

#### With Event Sourcing
```typescript
// Event sourced aggregate
class BankAccount extends AggregateRoot<AccountId> {
  private balance: Money;
  private status: AccountStatus;
  
  // Rebuild from events
  static fromEvents(id: AccountId, events: IDomainEvent[]): BankAccount {
    const account = new BankAccount(id);
    account.loadFromHistory(events);
    return account;
  }
  
  deposit(amount: Money): void {
    this.apply('MoneyDeposited', {
      accountId: this.id.value,
      amount,
      newBalance: this.balance.add(amount)
    });
  }
  
  protected onMoneyDeposited(payload: any): void {
    this.balance = payload.newBalance;
  }
}

// Event store
class EventStore {
  async getEvents(aggregateId: string): Promise<IDomainEvent[]> {
    // Retrieve events from storage
  }
  
  async saveEvents(
    aggregateId: string,
    events: IDomainEvent[],
    expectedVersion: number
  ): Promise<void> {
    // Save events with optimistic concurrency
  }
}
```

### Best Practices
1. Name events in past tense (OrderPlaced, not PlaceOrder)
2. Include all necessary information in the event
3. Make events immutable
4. Use meaningful event types
5. Version events from the start
6. Include metadata for tracing and correlation

### Common Pitfalls
1. Making events too granular
2. Including mutable references in events
3. Not versioning events
4. Missing important metadata
5. Using events for synchronous communication

---

### 12. Event Bus

### What is an Event Bus?
The Event Bus is a publish-subscribe mechanism for handling domain events. It decouples event producers from consumers, allowing different parts of the system to communicate through events without direct dependencies.

### Primary Use Cases
- Publishing domain events to multiple subscribers
- Decoupling event producers from consumers
- Implementing event-driven architecture
- Supporting async message processing
- Enabling system integration

### When to Use
- For publishing domain events within bounded context
- When multiple components need to react to events
- For implementing eventual consistency
- To decouple system components
- For audit logging and monitoring

### When NOT to Use
- For synchronous request-response communication
- When immediate consistency is required
- For simple method calls within same component
- For high-frequency, low-latency operations

### Core Components

#### IEventBus Interface
```typescript
abstract class IEventBus {
  abstract publish<T extends IDomainEvent>(event: T): Promise<void>;
  
  abstract subscribe<T extends IDomainEvent>(
    eventType: new (...args: any[]) => T,
    handler: EventHandlerFn<T>
  ): void;
  
  abstract registerHandler<T extends IDomainEvent>(
    eventType: new (...args: any[]) => T,
    handler: IEventHandler<T>
  ): void;
  
  abstract unsubscribe<T extends IDomainEvent>(
    eventType: new (...args: any[]) => T,
    handler: EventHandlerFn<T> | IEventHandler<T>
  ): void;
}
```

#### Handler Types
```typescript
// Function-based handler
type EventHandlerFn<T extends IDomainEvent> = 
  (event: T) => Promise<void> | void;

// Class-based handler
interface IEventHandler<T extends IDomainEvent> {
  handle(event: T): Promise<void> | void;
}

// Handler detection
function isEventHandler(obj: any): obj is IEventHandler<any> {
  return (
    obj &&
    typeof obj === 'object' &&
    'handle' in obj &&
    typeof obj.handle === 'function'
  );
}
```

#### EventBusMiddleware
```typescript
type EventBusMiddleware = (
  next: (event: IDomainEvent) => Promise<void>
) => (event: IDomainEvent) => Promise<void>;
```

### InMemoryEventBus Implementation

```typescript
export class InMemoryEventBus implements IEventBus {
  private handlers: Map<string, Set<EventHandlerFn<any> | IEventHandler<any>>> = 
    new Map();
  private publishPipeline: (event: IDomainEvent) => Promise<void>;
  
  constructor(options: InMemoryEventBusOptions = {}) {
    this.options = { enableLogging: false, ...options };
    this.publishPipeline = this.buildPublishPipeline();
  }
  
  async publish<T extends IDomainEvent>(event: T): Promise<void> {
    await this.publishPipeline(event);
  }
  
  subscribe<T extends IDomainEvent>(
    eventType: new (...args: any[]) => T,
    handler: EventHandlerFn<T>
  ): void {
    const eventName = this.getEventName(eventType);
    
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, new Set());
    }
    
    this.handlers.get(eventName)!.add(handler);
  }
  
  registerHandler<T extends IDomainEvent>(
    eventType: new (...args: any[]) => T,
    handler: IEventHandler<T>
  ): void {
    const eventName = this.getEventName(eventType);
    
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, new Set());
    }
    
    this.handlers.get(eventName)!.add(handler);
  }
  
  unsubscribe<T extends IDomainEvent>(
    eventType: new (...args: any[]) => T,
    handler: EventHandlerFn<T> | IEventHandler<T>
  ): void {
    const eventName = this.getEventName(eventType);
    this.handlers.get(eventName)?.delete(handler);
  }
  
  private getEventName<T extends IDomainEvent>(
    eventType: new (...args: any[]) => T
  ): string {
    const prototype = eventType.prototype;
    if (prototype && 'eventType' in prototype) {
      return prototype.eventType;
    }
    return eventType.name;
  }
  
  private buildPublishPipeline(): (event: IDomainEvent) => Promise<void> {
    // Base pipeline - actual event handling
    const basePipeline = async (event: IDomainEvent): Promise<void> => {
      const eventName = (event as any).eventType || event.constructor.name;
      const handlers = this.handlers.get(eventName);
      
      if (!handlers || handlers.size === 0) {
        if (this.options.enableLogging) {
          console.log(`[EventBus] No handlers for ${eventName}`);
        }
        return;
      }
      
      // Execute handlers
      const promises: Promise<void>[] = [];
      for (const handler of handlers) {
        try {
          let result: void | Promise<void>;
          
          if (isEventHandler(handler)) {
            result = handler.handle(event);
          } else {
            result = handler(event);
          }
          
          if (result instanceof Promise) {
            promises.push(result);
          }
        } catch (error) {
          this.handleError(error as Error, eventName);
        }
      }
      
      if (promises.length > 0) {
        await Promise.all(promises);
      }
    };
    
    // Apply middlewares in reverse order
    let pipeline = basePipeline;
    if (this.options.middlewares) {
      for (let i = this.options.middlewares.length - 1; i >= 0; i--) {
        pipeline = this.options.middlewares[i](pipeline);
      }
    }
    
    return pipeline;
  }
  
  private handleError(error: Error, eventName: string): void {
    if (this.options.onError) {
      this.options.onError(error, eventName);
    } else {
      console.error(`[EventBus] Error handling ${eventName}:`, error);
    }
  }
}
```

### Basic Examples

#### E-commerce: Order Processing
```typescript
// Define event handlers
class OrderEventHandler {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly emailService: EmailService
  ) {}
  
  async handleOrderPlaced(event: OrderPlaced): Promise<void> {
    const { orderId, items } = event.payload;
    
    // Reserve inventory
    for (const item of items) {
      await this.inventoryService.reserve(
        item.productId,
        item.quantity,
        orderId
      );
    }
    
    // Send confirmation email
    await this.emailService.sendOrderConfirmation(orderId);
  }
  
  async handleOrderCancelled(event: OrderCancelled): Promise<void> {
    const { orderId } = event.payload;
    
    // Release inventory
    await this.inventoryService.releaseReservation(orderId);
    
    // Send cancellation email
    await this.emailService.sendOrderCancellation(orderId);
  }
}

// Register handlers
const eventBus = new InMemoryEventBus();
const orderHandler = new OrderEventHandler(inventoryService, emailService);

eventBus.subscribe(OrderPlaced, event => orderHandler.handleOrderPlaced(event));
eventBus.subscribe(OrderCancelled, event => orderHandler.handleOrderCancelled(event));

// Publish events (typically done by aggregates)
await eventBus.publish(new OrderPlaced({
  orderId: '123',
  customerId: '456',
  items: [...],
  total: new Money(100, 'USD')
}));
```

#### Banking: Account Events
```typescript
// Class-based event handler
class AccountEventHandler implements IEventHandler<AccountOpened> {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly complianceService: ComplianceService
  ) {}
  
  async handle(event: AccountOpened): Promise<void> {
    const { accountId, ownerId, accountType } = event.payload;
    
    // Send welcome notification
    await this.notificationService.sendWelcome(ownerId, accountId);
    
    // Perform compliance checks
    await this.complianceService.performKYC(ownerId);
    
    // Set up initial account features
    if (accountType === AccountType.PREMIUM) {
      await this.setupPremiumFeatures(accountId);
    }
  }
  
  private async setupPremiumFeatures(accountId: string): Promise<void> {
    // Implementation
  }
}

// Register handler
const eventBus = new InMemoryEventBus();
const accountHandler = new AccountEventHandler(
  notificationService,
  complianceService
);

eventBus.registerHandler(AccountOpened, accountHandler);
```

### Advanced Examples

#### Event Bus with Middleware
```typescript
// Logging middleware
const loggingMiddleware: EventBusMiddleware = (next) => async (event) => {
  console.log(`[EventBus] Processing ${event.eventType}`, {
    eventId: event.metadata?.eventId,
    timestamp: event.metadata?.timestamp
  });
  
  const start = Date.now();
  
  try {
    await next(event);
    console.log(`[EventBus] Completed ${event.eventType} in ${Date.now() - start}ms`);
  } catch (error) {
    console.error(`[EventBus] Failed ${event.eventType}:`, error);
    throw error;
  }
};

// Error handling middleware
const errorHandlingMiddleware: EventBusMiddleware = (next) => async (event) => {
  try {
    await next(event);
  } catch (error) {
    // Log error
    console.error(`Error processing ${event.eventType}:`, error);
    
    // Publish error event
    await eventBus.publish(new EventProcessingFailed({
      originalEvent: event,
      error: error.message,
      stack: error.stack
    }));
    
    // Rethrow for upper middleware
    throw error;
  }
};

// Correlation middleware
const correlationMiddleware: EventBusMiddleware = (next) => async (event) => {
  // Ensure correlation ID
  if (!event.metadata?.correlationId) {
    event.metadata = {
      ...event.metadata,
      correlationId: uuid()
    };
  }
  
  // Set correlation ID in context
  AsyncLocalStorage.run({ correlationId: event.metadata.correlationId }, async () => {
    await next(event);
  });
};

// Create event bus with middleware
const eventBus = new InMemoryEventBus({
  middlewares: [
    loggingMiddleware,
    errorHandlingMiddleware,
    correlationMiddleware
  ]
});
```

#### Event Bus Builder Pattern
```typescript
class EventBusBuilder {
  private options: InMemoryEventBusOptions = {};
  
  withLogging(): this {
    this.options.enableLogging = true;
    return this;
  }
  
  withErrorHandler(handler: (error: Error, eventType: string) => void): this {
    this.options.onError = handler;
    return this;
  }
  
  withMiddleware(middleware: EventBusMiddleware): this {
    this.options.middlewares = [
      ...(this.options.middlewares || []),
      middleware
    ];
    return this;
  }
  
  withRetry(maxAttempts: number = 3, delay: number = 1000): this {
    const retryMiddleware: EventBusMiddleware = (next) => async (event) => {
      let lastError: Error;
      
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          await next(event);
          return;
        } catch (error) {
          lastError = error as Error;
          
          if (attempt < maxAttempts) {
            console.log(`Retry attempt ${attempt} for ${event.eventType}`);
            await new Promise(resolve => setTimeout(resolve, delay * attempt));
          }
        }
      }
      
      throw lastError!;
    };
    
    return this.withMiddleware(retryMiddleware);
  }
  
  build(): IEventBus {
    return new InMemoryEventBus(this.options);
  }
}

// Usage
const eventBus = new EventBusBuilder()
  .withLogging()
  .withRetry(3, 1000)
  .withErrorHandler((error, eventType) => {
    console.error(`Failed to process ${eventType}:`, error);
    // Send to monitoring system
    monitoring.captureException(error, { eventType });
  })
  .build();
```

#### Multiple Event Handlers with Priority
```typescript
// Priority-based handler registration
class PriorityEventBus extends InMemoryEventBus {
  private handlerPriorities = new Map<any, number>();
  
  registerHandlerWithPriority<T extends IDomainEvent>(
    eventType: new (...args: any[]) => T,
    handler: IEventHandler<T>,
    priority: number = 0
  ): void {
    this.registerHandler(eventType, handler);
    this.handlerPriorities.set(handler, priority);
  }
  
  protected async executeHandlers(
    handlers: Set<EventHandlerFn<any> | IEventHandler<any>>,
    event: IDomainEvent
  ): Promise<void> {
    // Sort handlers by priority
    const sortedHandlers = Array.from(handlers).sort((a, b) => {
      const priorityA = this.handlerPriorities.get(a) || 0;
      const priorityB = this.handlerPriorities.get(b) || 0;
      return priorityB - priorityA; // Higher priority first
    });
    
    // Execute in priority order
    for (const handler of sortedHandlers) {
      if (isEventHandler(handler)) {
        await handler.handle(event);
      } else {
        await handler(event);
      }
    }
  }
}

// Usage
const eventBus = new PriorityEventBus();

// Critical handler - runs first
eventBus.registerHandlerWithPriority(
  OrderPlaced,
  inventoryHandler,
  100
);

// Normal handler
eventBus.registerHandlerWithPriority(
  OrderPlaced,
  emailHandler,
  50
);

// Low priority handler - runs last
eventBus.registerHandlerWithPriority(
  OrderPlaced,
  analyticsHandler,
  10
);
```

### Standalone Usage
```typescript
// Simple event bus usage without other patterns
const eventBus = new InMemoryEventBus();

// Subscribe to events
eventBus.subscribe(UserRegistered, async (event) => {
  console.log('New user registered:', event.payload.userId);
  
  // Send welcome email
  await emailService.sendWelcome(event.payload.email);
  
  // Create initial user profile
  await profileService.createProfile(event.payload.userId);
});

// Publish events directly
const userRegisteredEvent = new UserRegistered({
  userId: '123',
  email: 'user@example.com',
  registeredAt: new Date()
});

await eventBus.publish(userRegisteredEvent);

// Multiple subscribers for same event
eventBus.subscribe(OrderPlaced, async (event) => {
  console.log('Order placed:', event.payload.orderId);
});

eventBus.subscribe(OrderPlaced, async (event) => {
  await inventoryService.reserve(event.payload.items);
});

eventBus.subscribe(OrderPlaced, async (event) => {
  await analyticsService.trackOrder(event.payload);
});
```

### Integration with Other Patterns

#### With Aggregates
```typescript
// Aggregate publishes events through event bus
class Order extends AggregateRoot<OrderId> {
  constructor(
    id: OrderId,
    private eventBus: IEventBus
  ) {
    super(id);
  }
  
  async ship(trackingNumber: string): Promise<void> {
    // Domain logic
    this.status = OrderStatus.SHIPPED;
    this.trackingNumber = trackingNumber;
    
    // Create event
    const event = new OrderShipped({
      orderId: this.id.value,
      trackingNumber,
      shippedAt: new Date()
    });
    
    // Publish immediately
    await this.eventBus.publish(event);
    
    // Or store for later publishing
    this.apply(event);
  }
}
```

#### With Domain Services
```typescript
class OrderProcessingService extends EventAwareDomainService {
  async processOrder(order: Order): Promise<void> {
    // Process order
    await this.validateOrder(order);
    await this.calculatePricing(order);
    
    // Publish event through inherited event bus
    this.publishEvent(new OrderProcessed({
      orderId: order.id.value,
      processedAt: new Date()
    }));
  }
}
```

#### With Sagas/Process Managers
```typescript
class OrderFulfillmentSaga {
  constructor(private eventBus: IEventBus) {
    // Subscribe to relevant events
    eventBus.subscribe(OrderPlaced, this.handleOrderPlaced.bind(this));
    eventBus.subscribe(PaymentProcessed, this.handlePaymentProcessed.bind(this));
    eventBus.subscribe(InventoryReserved, this.handleInventoryReserved.bind(this));
  }
  
  private async handleOrderPlaced(event: OrderPlaced): Promise<void> {
    // Start saga
    const saga = new OrderFulfillmentProcess(event.payload.orderId);
    
    // Trigger payment processing
    await this.eventBus.publish(new ProcessPaymentRequested({
      orderId: event.payload.orderId,
      amount: event.payload.total
    }));
  }
  
  private async handlePaymentProcessed(event: PaymentProcessed): Promise<void> {
    // Continue saga
    await this.eventBus.publish(new ReserveInventoryRequested({
      orderId: event.payload.orderId,
      items: event.payload.items
    }));
  }
  
  private async handleInventoryReserved(event: InventoryReserved): Promise<void> {
    // Complete saga
    await this.eventBus.publish(new FulfillOrderRequested({
      orderId: event.payload.orderId
    }));
  }
}
```

### Best Practices
1. Keep event handlers idempotent
2. Handle errors gracefully
3. Use middleware for cross-cutting concerns
4. Avoid blocking operations in handlers
5. Consider eventual consistency
6. Use correlation IDs for tracking

### Common Pitfalls
1. Creating circular event dependencies
2. Not handling handler failures
3. Blocking the event bus with long operations
4. Publishing too many fine-grained events
5. Not considering event ordering

---

### 13. Event Dispatcher

### What is an Event Dispatcher?
The Event Dispatcher is a component responsible for dispatching events to their respective handlers. It works closely with the Event Bus but focuses on the actual delivery mechanism and handler management.

### Primary Use Cases
- Managing event handler registration and execution
- Providing event delivery guarantees
- Supporting different dispatching strategies
- Enabling handler lifecycle management
- Implementing specialized event routing

### When to Use
- When you need fine-grained control over event delivery
- For implementing custom dispatching strategies
- When requiring handler prioritization
- For advanced event routing scenarios

### When NOT to Use
- For simple publish-subscribe scenarios (use Event Bus)
- When default event handling is sufficient
- For basic event-driven communication

### Core Components

#### IEventDispatcher Interface
```typescript
interface IEventDispatcher {
  dispatch<TEvent extends IDomainEvent>(event: TEvent): Promise<void>;
  register<TEvent extends IDomainEvent>(
    eventType: string,
    handler: EventHandler<TEvent>
  ): void;
  unregister<TEvent extends IDomainEvent>(
    eventType: string,
    handler: EventHandler<TEvent>
  ): void;
}
```

#### Basic Example: Priority-Based Dispatcher

```typescript
interface PriorityHandler<T extends IDomainEvent> {
  handler: EventHandler<T>;
  priority: number;
}

class PriorityEventDispatcher implements IEventDispatcher {
  private handlers = new Map<string, PriorityHandler<any>[]>();
  
  register<TEvent extends IDomainEvent>(
    eventType: string,
    handler: EventHandler<TEvent>,
    priority: number = 0
  ): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    
    const handlers = this.handlers.get(eventType)!;
    handlers.push({ handler, priority });
    
    // Sort by priority (highest first)
    handlers.sort((a, b) => b.priority - a.priority);
  }
  
  async dispatch<TEvent extends IDomainEvent>(event: TEvent): Promise<void> {
    const eventType = event.constructor.name;
    const handlers = this.handlers.get(eventType);
    
    if (!handlers) return;
    
    // Execute in priority order
    for (const { handler } of handlers) {
      await handler(event);
    }
  }
}

// Usage
const dispatcher = new PriorityEventDispatcher();

// High priority handler
dispatcher.register('OrderPlaced', inventoryHandler, 100);

// Normal priority handler
dispatcher.register('OrderPlaced', emailHandler, 50);

// Low priority handler
dispatcher.register('OrderPlaced', analyticsHandler, 10);
```

#### Advanced Example: Circuit Breaker Dispatcher

```typescript
class CircuitBreakerDispatcher implements IEventDispatcher {
  private handlers = new Map<string, EventHandler<any>[]>();
  private circuitBreakers = new Map<string, CircuitBreaker>();
  
  constructor(
    private readonly options: {
      failureThreshold: number;
      resetTimeout: number;
    } = { failureThreshold: 5, resetTimeout: 60000 }
  ) {}
  
  async dispatch<TEvent extends IDomainEvent>(event: TEvent): Promise<void> {
    const eventType = event.constructor.name;
    const handlers = this.handlers.get(eventType);
    
    if (!handlers) return;
    
    for (const handler of handlers) {
      const handlerName = handler.name || 'anonymous';
      const breaker = this.getOrCreateBreaker(handlerName);
      
      try {
        await breaker.execute(() => handler(event));
      } catch (error) {
        if (error.message === 'Circuit breaker is open') {
          console.warn(`Handler ${handlerName} circuit is open, skipping`);
          continue;
        }
        throw error;
      }
    }
  }
  
  private getOrCreateBreaker(handlerName: string): CircuitBreaker {
    if (!this.circuitBreakers.has(handlerName)) {
      this.circuitBreakers.set(
        handlerName,
        new CircuitBreaker(this.options)
      );
    }
    return this.circuitBreakers.get(handlerName)!;
  }
  
  register<TEvent extends IDomainEvent>(
    eventType: string,
    handler: EventHandler<TEvent>
  ): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }
}
```

### Best Practices

1. Keep dispatchers focused on delivery mechanics
2. Use Event Bus for standard scenarios
3. Implement proper error handling
4. Consider performance implications

### Common Pitfalls

1. Over-engineering when Event Bus would suffice
2. Not handling failures properly
3. Creating complex routing logic
4. Memory leaks from unregistered handlers

---

# Error Handling

## What is Error Handling in DomainTS?

Error handling in DomainTS provides a structured approach to dealing with domain, application, and framework errors. It uses custom error classes with specific error codes and metadata support.

### Primary Use Cases

- Distinguishing between different error types
- Providing detailed error context
- Supporting i18n and error messages
- Handling domain-specific violations
- Enabling proper error recovery

### When to Use

- When throwing domain-specific errors
- When you need error categorization
- When implementing error recovery strategies
- When providing detailed error information

### When NOT to Use

- For simple validation returns (use Result pattern)
- For expected business outcomes
- For control flow logic
- When errors don't need domain context

### Core Components

#### BaseError Class
```typescript
abstract class BaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}
```

#### IDomainError Abstract Class
```typescript
abstract class IDomainError extends BaseError {
  domain?: string | any;        // Domain context
  code: DomainErrorCode;        // Specific error code
  data?: unknown;               // Additional error data
  timestamp?: Date;             // When error occurred
  error?: Error;                // Original error if wrapped
  
  constructor(message: string) {
    super(message);
    this.timestamp = new Date();
  }
}
```

#### Error Code Enums
```typescript
export enum DomainErrorCode {
  // 400 Bad request
  MissingValue = 'D_40001',
  InvalidParameter = 'D_40002',
  InvalidState = 'D_40003',
  InvalidOperation = 'D_40005',
  
  // 404 Not found
  NotFound = 'D_40401',
  
  // 409 Conflict
  Duplicate = 'D_40901',
  VersionConflict = 'D_40902',
  
  // 422 Unprocessable entity
  ValidationFailed = 'D_42201',
  
  // 500 Internal server error
  Unknown = 'D_50001'
}

export enum ApplicationErrorCode {
  // Service errors
  ServiceNotAvailable = 'A_50301',
  ServiceTimeout = 'A_50302',
  ServiceError = 'A_50303',
  
  // Integration errors
  ExternalServiceFailed = 'A_50201',
  IntegrationFailed = 'A_50202',
  
  // Authorization errors
  Unauthorized = 'A_40101',
  Forbidden = 'A_40301',
  
  // Validation errors
  InvalidRequest = 'A_40001',
  ValidationError = 'A_42201'
}

export enum FrameworkErrorCode {
  // Configuration errors
  ConfigurationError = 'F_50001',
  InitializationError = 'F_50002',
  
  // Infrastructure errors
  DatabaseError = 'F_50101',
  NetworkError = 'F_50102',
  FileSystemError = 'F_50103',
  
  // Security errors
  SecurityViolation = 'F_40301',
  AuthenticationFailed = 'F_40101',
  
  // Rate limiting
  RateLimitExceeded = 'F_42901'
}
```

### Basic Examples

#### Domain-Specific Errors
```typescript
export class MissingValueError extends IDomainError {
  code = DomainErrorCode.MissingValue;
  
  constructor(paramName: string) {
    super(`Missing value for: ${paramName}`);
  }
  
  static withValue(
    paramName: string,
    options: { domain?: string; code?: DomainErrorCode; data?: unknown } = {}
  ): MissingValueError {
    const error = new MissingValueError(paramName);
    error.domain = options.domain;
    error.code = options.code || error.code;
    error.data = options.data;
    return error;
  }
}

export class InvalidParameterError extends IDomainError {
  code = DomainErrorCode.InvalidParameter;
  
  constructor(paramName: string, reason?: string) {
    super(`Invalid parameter: ${paramName}${reason ? ` - ${reason}` : ''}`);
  }
  
  static withParameter(
    paramName: string,
    reason?: string,
    options: { domain?: string; data?: unknown } = {}
  ): InvalidParameterError {
    const error = new InvalidParameterError(paramName, reason);
    error.domain = options.domain;
    error.data = options.data;
    return error;
  }
}

export class NotFoundError extends IDomainError {
  code = DomainErrorCode.NotFound;
  
  constructor(entity: string, id?: string | number) {
    super(`${entity} not found${id ? ` with id: ${id}` : ''}`);
  }
  
  static withEntity(
    entity: string,
    id?: string | number,
    options: { domain?: string } = {}
  ): NotFoundError {
    const error = new NotFoundError(entity, id);
    error.domain = options.domain;
    return error;
  }
}
```

#### Aggregate-Specific Errors
```typescript
export class AggregateError extends IDomainError {
  static invalidArguments(message: string): AggregateError {
    const error = new AggregateError(message);
    error.code = DomainErrorCode.InvalidParameter;
    return error;
  }
  
  static versionConflict(
    aggregateId: any,
    aggregateType: string,
    expectedVersion: number,
    actualVersion: number
  ): AggregateError {
    const error = new AggregateError(
      `Version conflict for ${aggregateType} with id ${aggregateId}. ` +
      `Expected version ${expectedVersion}, but found ${actualVersion}`
    );
    error.code = DomainErrorCode.VersionConflict;
    error.data = { aggregateId, aggregateType, expectedVersion, actualVersion };
    return error;
  }
  
  static featureNotEnabled(feature: string): AggregateError {
    const error = new AggregateError(`Feature not enabled: ${feature}`);
    error.code = DomainErrorCode.InvalidState;
    error.data = { feature };
    return error;
  }
}
```

### Advanced Examples

#### Custom Domain Errors
```typescript
// Order domain errors
export class OrderError extends IDomainError {
  static emptyOrder(): OrderError {
    const error = new OrderError('Order must contain at least one item');
    error.code = DomainErrorCode.InvalidState;
    error.domain = 'order';
    return error;
  }
  
  static invalidStatus(currentStatus: string, targetStatus: string): OrderError {
    const error = new OrderError(
      `Cannot transition from ${currentStatus} to ${targetStatus}`
    );
    error.code = DomainErrorCode.InvalidOperation;
    error.domain = 'order';
    error.data = { currentStatus, targetStatus };
    return error;
  }
  
  static insufficientStock(productId: string, requested: number, available: number): OrderError {
    const error = new OrderError(
      `Insufficient stock for product ${productId}. Requested: ${requested}, Available: ${available}`
    );
    error.code = DomainErrorCode.InvalidOperation;
    error.domain = 'order';
    error.data = { productId, requested, available };
    return error;
  }
}

// Usage in domain logic
class Order {
  addItem(productId: string, quantity: number, availableStock: number): void {
    if (quantity > availableStock) {
      throw OrderError.insufficientStock(productId, quantity, availableStock);
    }
    // Add item logic
  }
  
  ship(): void {
    if (this.status !== OrderStatus.PAID) {
      throw OrderError.invalidStatus(this.status, OrderStatus.SHIPPED);
    }
    // Ship order logic
  }
}
```

#### Error Wrapping and Context
```typescript
export class ServiceError extends IDomainError {
  code = ApplicationErrorCode.ServiceError;
  
  static wrap(
    originalError: Error,
    context: string,
    options: { domain?: string; data?: unknown } = {}
  ): ServiceError {
    const error = new ServiceError(`Service error in ${context}: ${originalError.message}`);
    error.error = originalError;
    error.domain = options.domain;
    error.data = options.data;
    return error;
  }
}

// Usage
class PaymentService {
  async processPayment(order: Order): Promise<Payment> {
    try {
      const result = await this.paymentGateway.process({
        amount: order.total,
        currency: order.currency
      });
      return Payment.fromGatewayResult(result);
    } catch (error) {
      throw ServiceError.wrap(error as Error, 'PaymentService.processPayment', {
        domain: 'payment',
        data: { orderId: order.id, amount: order.total }
      });
    }
  }
}
```

### Standalone Usage
```typescript
// Throwing domain errors
function validateEmail(email: string): void {
  if (!email) {
    throw MissingValueError.withValue('email', { domain: 'user' });
  }
  
  if (!isValidEmailFormat(email)) {
    throw InvalidParameterError.withParameter('email', 'Invalid email format', {
      domain: 'user',
      data: { providedValue: email }
    });
  }
}

// Handling specific errors
try {
  validateEmail('');
} catch (error) {
  if (error instanceof MissingValueError) {
    console.log('Missing value:', error.message);
    console.log('Domain:', error.domain);
  } else if (error instanceof InvalidParameterError) {
    console.log('Invalid parameter:', error.message);
    console.log('Data:', error.data);
  }
}

// Error recovery patterns
async function findUserWithFallback(id: string): Promise<User | null> {
  try {
    return await userRepository.findById(id);
  } catch (error) {
    if (error instanceof NotFoundError) {
      // Try alternative lookup
      return await userRepository.findByLegacyId(id);
    }
    throw error; // Re-throw unexpected errors
  }
}
```

### Integration with Other Patterns
```typescript
// With Result Pattern
class UserService {
  createUser(data: UserData): Result<User, DomainError> {
    try {
      if (!data.email) {
        return Result.fail(MissingValueError.withValue('email', { domain: 'user' }));
      }
      
      const user = User.create(data);
      return Result.ok(user);
    } catch (error) {
      if (error instanceof IDomainError) {
        return Result.fail(error);
      }
      return Result.fail(new UnknownError('User creation failed'));
    }
  }
}

// With Validation
class OrderValidator implements IValidator<Order> {
  validate(order: Order): Result<Order, ValidationErrors> {
    const errors: ValidationError[] = [];
    
    try {
      order.validate(); // May throw domain errors
    } catch (error) {
      if (error instanceof IDomainError) {
        errors.push(new ValidationError(
          error.domain || '',
          error.message,
          { code: error.code, data: error.data }
        ));
      }
    }
    
    if (errors.length > 0) {
      return Result.fail(new ValidationErrors(errors));
    }
    
    return Result.ok(order);
  }
}

// With Event Handlers
class OrderEventHandler {
  async handleOrderPlaced(event: OrderPlacedEvent): Promise<void> {
    try {
      await this.inventoryService.reserveStock(event.orderId);
    } catch (error) {
      if (error instanceof OrderError && error.code === DomainErrorCode.InvalidOperation) {
        // Handle specific domain error
        await this.notificationService.notifyStockIssue(event.orderId);
      } else {
        // Log and re-throw unexpected errors
        this.logger.error('Unexpected error in order placed handler', error);
        throw error;
      }
    }
  }
}
```

### Best Practices
1. Use specific error types for different domains
2. Always provide meaningful error messages
3. Include relevant context in error data
4. Use error codes for programmatic handling
5. Wrap external errors with domain context
6. Don't use exceptions for control flow

### Common Pitfalls
1. Throwing generic Error instead of domain errors
2. Not including enough context in errors
3. Using exceptions for expected outcomes
4. Not handling specific error types
5. Losing original error stack traces
6. Mixing error handling with business logic

---

## Repository Pattern

### What is Repository Pattern?

The Repository Pattern provides an abstraction layer for data access, encapsulating the logic required to access data sources. It acts as a collection-like interface for accessing domain objects, keeping the domain model isolated from data access concerns.

### Primary Use Cases
- Encapsulating data access logic
- Providing a clean API for aggregate persistence
- Abstracting database implementation details
- Supporting different data sources
- Managing complex querying logic

### When to Use
- When working with domain-driven design
- When you need to abstract data access
- When implementing aggregate persistence
- When you need flexibility in data storage
- For managing complex database operations

### When NOT to Use
- For simple CRUD applications
- When direct database access is sufficient
- When working with non-aggregate entities
- For read-only data access (use query objects)

### Core Components

#### IRepository Interface
```typescript
interface IRepository<T extends IAggregateRoot<any>> {
  /**
   * Find an aggregate by its identifier
   * @param id - The aggregate identifier
   * @returns The aggregate if found, null otherwise
   */
  findById?(id: any): Promise<T | null>;

  /**
   * Save an aggregate
   * This will create or update the aggregate
   * @param aggregate - The aggregate to save
   */
  save(aggregate: T): Promise<void>;

  /**
   * Delete an aggregate
   * @param aggregate - The aggregate to delete
   */
  delete?(aggregate: T): Promise<void>;
}
```

#### IExtendedRepository Interface
```typescript
interface IExtendedRepository<T extends IAggregateRoot<any>> extends IRepository<T> {
  /**
   * Check if an aggregate exists
   */
  exists(id: any): Promise<boolean>;

  /**
   * Find aggregates matching a specification
   */
  findBySpecification?(spec: any): Promise<T[]>;

  /**
   * Find a single aggregate matching a specification
   */
  findOneBySpecification?(spec: any): Promise<T | null>;
}
```

#### IBaseRepository - Event-Aware Repository Base
```typescript
/**
 * Base repository for event-sourced aggregates
 * This is the ONLY repository type that handles events
 */
abstract class IBaseRepository {
  constructor(protected readonly eventDispatcher: IEventDispatcher) {}

  async save(aggregate: AggregateRoot): Promise<void> {
    const events = aggregate.getDomainEvents();
    if (events.length === 0) return;

    // Check version for optimistic concurrency
    const currentVersion = await this.getCurrentVersion(aggregate.getId()) ?? 0;
    const initialVersion = aggregate.getInitialVersion();

    if (initialVersion !== currentVersion) {
      throw VersionError.withEntityIdAndVersions(
        aggregate.getId(),
        currentVersion,
        initialVersion,
      );
    }

    // Process events through handlers
    for (const event of events) {
      const handlerName = `handle${event.eventType}`;
      const handler = (this as any)[handlerName];
      
      if (typeof handler !== 'function') {
        throw new Error(`Missing handler ${handlerName} in repository`);
      }
      
      await handler.call(this, event.payload);
    }

    // Dispatch events after successful save
    await this.eventDispatcher.dispatchEventsForAggregate(aggregate);
  }

  abstract getCurrentVersion(id: any): Promise<number>;
}
```

### Basic Examples

#### Standard Repository (No Events)
```typescript
class OrderRepository implements IRepository<Order> {
  constructor(private readonly db: Database) {}

  async findById(id: OrderId): Promise<Order | null> {
    const data = await this.db.orders.findOne({ id: id.value });
    if (!data) return null;

    return OrderMapper.toDomain(data);
  }

  async save(order: Order): Promise<void> {
    const data = OrderMapper.toData(order);
    
    await this.db.orders.upsert({
      where: { id: order.id.value },
      data
    });
  }

  async delete(order: Order): Promise<void> {
    await this.db.orders.delete({ id: order.id.value });
  }
}
```

#### Event-Sourced Repository (Extends IBaseRepository)
```typescript
class EventSourcedAccountRepository extends IBaseRepository {
  constructor(
    private readonly db: Database,
    eventDispatcher: IEventDispatcher
  ) {
    super(eventDispatcher);
  }

  async findById(id: AccountId): Promise<Account | null> {
    const data = await this.db.accounts.findOne({ id: id.value });
    if (!data) return null;

    const account = AccountMapper.toDomain(data);
    account.setInitialVersion(data.version);
    return account;
  }

  async getCurrentVersion(id: AccountId): Promise<number> {
    const result = await this.db.accounts.findOne(
      { id: id.value },
      { select: ['version'] }
    );
    return result?.version ?? 0;
  }

  // Event handlers - called by base class save method
  async handleMoneyDeposited(payload: MoneyDepositedPayload): Promise<void> {
    await this.db.accounts.update({
      where: { id: payload.accountId },
      data: {
        balance: payload.newBalance,
        version: { increment: 1 }
      }
    });
  }

  async handleMoneyWithdrawn(payload: MoneyWithdrawnPayload): Promise<void> {
    await this.db.accounts.update({
      where: { id: payload.accountId },
      data: {
        balance: payload.newBalance,
        version: { increment: 1 }
      }
    });
  }
}
```

### Advanced Examples

#### Repository with Specifications
```typescript
class UserRepository implements IExtendedRepository<User> {
  constructor(private readonly db: Database) {}

  async findBySpecification(spec: ISpecification<User>): Promise<User[]> {
    // Simple in-memory implementation
    const allUsers = await this.db.users.findMany();
    const domainUsers = allUsers.map(UserMapper.toDomain);
    return domainUsers.filter(user => spec.isSatisfiedBy(user));
  }

  async findOneBySpecification(spec: ISpecification<User>): Promise<User | null> {
    const users = await this.findBySpecification(spec);
    return users[0] || null;
  }

  async exists(id: UserId): Promise<boolean> {
    const count = await this.db.users.count({
      where: { id: id.value }
    });
    return count > 0;
  }

  async save(user: User): Promise<void> {
    const data = UserMapper.toData(user);
    await this.db.users.upsert({
      where: { id: user.id.value },
      data
    });
  }
}
```

#### Multi-tenant Repository
```typescript
class MultiTenantProductRepository implements IRepository<Product> {
  constructor(
    private readonly db: Database,
    private readonly tenantContext: TenantContext
  ) {}

  async findById(id: ProductId): Promise<Product | null> {
    const tenantId = this.tenantContext.getCurrentTenantId();
    
    const data = await this.db.products.findOne({
      where: {
        id: id.value,
        tenantId
      }
    });

    return data ? ProductMapper.toDomain(data) : null;
  }

  async save(product: Product): Promise<void> {
    const tenantId = this.tenantContext.getCurrentTenantId();
    const data = ProductMapper.toData(product);

    await this.db.products.upsert({
      where: { id: product.id.value, tenantId },
      data: { ...data, tenantId }
    });
  }
}
```

#### Optimistic Locking Repository
```typescript
class VersionedOrderRepository implements IRepository<Order> {
  constructor(private readonly db: Database) {}

  async findById(id: OrderId): Promise<Order | null> {
    const data = await this.db.orders.findOne({ id: id.value });
    if (!data) return null;

    const order = OrderMapper.toDomain(data);
    order.setVersion(data.version);
    return order;
  }

  async save(order: Order): Promise<void> {
    const data = OrderMapper.toData(order);
    
    const result = await this.db.orders.update({
      where: { 
        id: order.id.value,
        version: order.getVersion() // Optimistic locking check
      },
      data: {
        ...data,
        version: order.getVersion() + 1
      }
    });

    if (result.count === 0) {
      throw new ConcurrencyError('Order was modified by another process');
    }
  }
}
```

### Application Layer Integration
```typescript
// Event emission happens at the application layer, not in repository
class OrderApplicationService {
  constructor(
    private readonly orderRepository: IRepository<Order>,
    private readonly eventPublisher: IEventPublisher
  ) {}

  async placeOrder(command: PlaceOrderCommand): Promise<void> {
    const order = Order.place(
      command.customerId,
      command.items
    );

    // Repository only saves data
    await this.orderRepository.save(order);

    // Event emission happens here, outside repository
    const events = order.getDomainEvents();
    await this.eventPublisher.publish(events);
    order.clearDomainEvents();
  }
}

// For event-sourced aggregates, use specialized application service
class AccountApplicationService {
  constructor(
    private readonly accountRepository: EventSourcedAccountRepository // Extends IBaseRepository
  ) {}

  async openAccount(command: OpenAccountCommand): Promise<void> {
    const account = Account.open(
      command.accountNumber,
      command.initialBalance
    );

    // Repository handles both saving and event dispatching
    // because it extends IBaseRepository
    await this.accountRepository.save(account);
  }
}
```

### Caching Repository Decorator
```typescript
class CachedRepository<T extends IAggregateRoot<any>> implements IRepository<T> {
  constructor(
    private readonly baseRepository: IRepository<T>,
    private readonly cache: ICache
  ) {}

  async findById(id: any): Promise<T | null> {
    const cacheKey = `aggregate:${id}`;
    
    // Try cache first
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return this.deserialize(cached);
    }

    // Load from base repository
    const aggregate = await this.baseRepository.findById(id);
    if (aggregate) {
      await this.cache.set(cacheKey, this.serialize(aggregate), 3600);
    }

    return aggregate;
  }

  async save(aggregate: T): Promise<void> {
    await this.baseRepository.save(aggregate);
    
    // Invalidate cache
    const cacheKey = `aggregate:${aggregate.id}`;
    await this.cache.delete(cacheKey);
  }

  private serialize(aggregate: T): string {
    // Implementation depends on your domain model
    return JSON.stringify(aggregate);
  }

  private deserialize(data: string): T {
    // Implementation depends on your domain model
    return JSON.parse(data);
  }
}
```

### Integration with Other Patterns

```typescript
// With Unit of Work Pattern
class UnitOfWork implements IUnitOfWork {
  private repositories = new Map<string, IRepository<any>>();
  private operations: Array<() => Promise<void>> = [];
  
  constructor(private readonly db: Database) {}
  
  getRepository<T extends IAggregateRoot<any>>(name: string): IRepository<T> {
    if (!this.repositories.has(name)) {
      // Create clean repository - no event handling
      const repository = this.createRepository(name);
      this.repositories.set(name, repository);
    }
    return this.repositories.get(name)!;
  }
  
  private createRepository(name: string): IRepository<any> {
    switch (name) {
      case 'orders':
        return new OrderRepository(this.db);
      case 'customers':
        return new CustomerRepository(this.db);
      default:
        throw new Error(`Unknown repository: ${name}`);
    }
  }
  
  async commit(): Promise<void> {
    // Execute all operations in a transaction
    await this.db.transaction(async () => {
      for (const operation of this.operations) {
        await operation();
      }
    });
    this.operations = [];
  }
  
  register(operation: () => Promise<void>): void {
    this.operations.push(operation);
  }
}

// With Specification Pattern
class SpecificationAwareRepository<T extends IAggregateRoot<any>> 
  implements IExtendedRepository<T> {
  
  constructor(
    private readonly db: Database,
    private readonly tableName: string,
    private readonly mapper: IMapper<T, any>
  ) {}
  
  async findBySpecification(spec: ISpecification<T>): Promise<T[]> {
    // Option 1: In-memory filtering (simple but potentially inefficient)
    const allRecords = await this.db[this.tableName].findMany();
    const domainObjects = allRecords.map(record => this.mapper.toDomain(record));
    return domainObjects.filter(obj => spec.isSatisfiedBy(obj));
  }
  
  async findBySpecificationOptimized(
    spec: ISpecification<T>,
    translator: ISpecificationTranslator
  ): Promise<T[]> {
    // Option 2: Translate specification to database query
    const query = translator.toQuery(spec);
    const records = await this.db[this.tableName].findMany(query);
    return records.map(record => this.mapper.toDomain(record));
  }
  
  async exists(id: any): Promise<boolean> {
    const count = await this.db[this.tableName].count({
      where: { id: id.value }
    });
    return count > 0;
  }
  
  async save(aggregate: T): Promise<void> {
    const data = this.mapper.toData(aggregate);
    await this.db[this.tableName].upsert({
      where: { id: aggregate.id.value },
      data
    });
  }
}

// With Mapper Pattern
interface IMapper<TDomain, TData> {
  toDomain(data: TData): TDomain;
  toData(domain: TDomain): TData;
}

class OrderMapper implements IMapper<Order, OrderData> {
  toDomain(data: OrderData): Order {
    const order = new Order(
      OrderId.fromString(data.id),
      CustomerId.fromString(data.customerId)
    );
    
    // Reconstruct order state
    data.items.forEach(item => {
      order.addItem(
        ProductId.fromString(item.productId),
        item.quantity,
        new Money(item.price, item.currency)
      );
    });
    
    if (data.status === 'SHIPPED') {
      order.markAsShipped();
    }
    
    return order;
  }
  
  toData(order: Order): OrderData {
    return {
      id: order.id.value,
      customerId: order.customerId.value,
      status: order.status,
      items: order.items.map(item => ({
        productId: item.productId.value,
        quantity: item.quantity,
        price: item.price.amount,
        currency: item.price.currency
      })),
      createdAt: order.createdAt,
      updatedAt: new Date()
    };
  }
}

// With CQRS Pattern
interface IReadRepository<T> {
  findById(id: any): Promise<T | null>;
  findAll(): Promise<T[]>;
  findBySpecification(spec: ISpecification<T>): Promise<T[]>;
}

interface IWriteRepository<T> {
  save(aggregate: T): Promise<void>;
  delete(aggregate: T): Promise<void>;
}

class OrderReadRepository implements IReadRepository<OrderReadModel> {
  constructor(private readonly db: Database) {}
  
  async findById(id: string): Promise<OrderReadModel | null> {
    const data = await this.db.orderReadModel.findOne({ id });
    return data ? this.mapToReadModel(data) : null;
  }
  
  async findAll(): Promise<OrderReadModel[]> {
    const data = await this.db.orderReadModel.findMany();
    return data.map(this.mapToReadModel);
  }
  
  private mapToReadModel(data: any): OrderReadModel {
    return {
      id: data.id,
      customerName: data.customerName,
      totalAmount: data.totalAmount,
      status: data.status,
      itemCount: data.itemCount
    };
  }
}

class OrderWriteRepository implements IWriteRepository<Order> {
  constructor(private readonly db: Database) {}
  
  async save(order: Order): Promise<void> {
    const data = OrderMapper.toData(order);
    await this.db.orders.upsert({
      where: { id: order.id.value },
      data
    });
  }
  
  async delete(order: Order): Promise<void> {
    await this.db.orders.delete({ id: order.id.value });
  }
}

// With Application Layer - Event Handling
class OrderApplicationService {
  constructor(
    private readonly orderRepository: IRepository<Order>,
    private readonly unitOfWork: IUnitOfWork,
    private readonly eventPublisher: IEventPublisher
  ) {}
  
  async createOrder(command: CreateOrderCommand): Promise<void> {
    const orderRepo = this.unitOfWork.getRepository<Order>('orders');
    const customerRepo = this.unitOfWork.getRepository<Customer>('customers');
    
    // Begin unit of work
    const customer = await customerRepo.findById(command.customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }
    
    const order = Order.create(command.customerId, command.items);
    
    // Register operations in unit of work
    this.unitOfWork.register(() => orderRepo.save(order));
    
    // Commit unit of work
    await this.unitOfWork.commit();
    
    // Publish events AFTER successful commit
    const events = order.getDomainEvents();
    await this.eventPublisher.publish(events);
    order.clearDomainEvents();
  }
}

// With Domain Services
class TransferService {
  constructor(
    private readonly unitOfWork: IUnitOfWork
  ) {}
  
  async transfer(
    fromAccountId: AccountId,
    toAccountId: AccountId,
    amount: Money
  ): Promise<void> {
    const accountRepo = this.unitOfWork.getRepository<Account>('accounts');
    
    const fromAccount = await accountRepo.findById(fromAccountId);
    const toAccount = await accountRepo.findById(toAccountId);
    
    if (!fromAccount || !toAccount) {
      throw new Error('Account not found');
    }
    
    // Domain logic
    fromAccount.withdraw(amount);
    toAccount.deposit(amount);
    
    // Save through unit of work
    this.unitOfWork.register(() => accountRepo.save(fromAccount));
    this.unitOfWork.register(() => accountRepo.save(toAccount));
    
    await this.unitOfWork.commit();
  }
}

// Factory Pattern for Repository Creation
class RepositoryFactory {
  constructor(
    private readonly db: Database,
    private readonly cache?: ICache
  ) {}
  
  createOrderRepository(): IRepository<Order> {
    const baseRepo = new OrderRepository(this.db);
    
    if (this.cache) {
      return new CachedRepository(baseRepo, this.cache);
    }
    
    return baseRepo;
  }
  
  createEventSourcedAccountRepository(
    eventDispatcher: IEventDispatcher
  ): EventSourcedAccountRepository {
    return new EventSourcedAccountRepository(this.db, eventDispatcher);
  }
  
  createWithLogging<T extends IAggregateRoot<any>>(
    repository: IRepository<T>,
    logger: ILogger
  ): IRepository<T> {
    return new LoggingRepositoryDecorator(repository, logger);
  }
}

// With Query Objects
interface IQuery<TResult> {
  execute(): Promise<TResult>;
}

class FindActiveOrdersQuery implements IQuery<Order[]> {
  constructor(
    private readonly repository: IExtendedRepository<Order>,
    private readonly customerId?: CustomerId
  ) {}
  
  async execute(): Promise<Order[]> {
    let spec: ISpecification<Order> = new ActiveOrderSpecification();
    
    if (this.customerId) {
      spec = spec.and(new OrderByCustomerSpecification(this.customerId));
    }
    
    return this.repository.findBySpecification(spec);
  }
}

// Integration Example with multiple patterns
class OrderManagementService {
  constructor(
    private readonly repositoryFactory: RepositoryFactory,
    private readonly unitOfWork: IUnitOfWork,
    private readonly eventPublisher: IEventPublisher,
    private readonly logger: ILogger
  ) {}
  
  async processOrder(orderId: OrderId): Promise<void> {
    // Create repository with logging
    const orderRepo = this.repositoryFactory.createWithLogging(
      this.unitOfWork.getRepository<Order>('orders'),
      this.logger
    );
    
    const order = await orderRepo.findById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }
    
    // Process order (domain logic)
    order.process();
    
    // Save through repository
    this.unitOfWork.register(() => orderRepo.save(order));
    await this.unitOfWork.commit();
    
    // Handle events at application layer
    const events = order.getDomainEvents();
    await this.eventPublisher.publish(events);
    order.clearDomainEvents();
  }
}
```

### Best Practices
1. Keep repositories focused on data access only
2. Use IBaseRepository only for event-sourcing scenarios
3. Implement repository interfaces, not concrete classes
4. Keep repositories clean - only database dependency
5. Handle event emission at application layer for standard repositories
6. Use specifications for complex queries
7. Consider caching as a decorator pattern

### Common Pitfalls
1. Putting event handling in standard repositories
2. Adding business logic to repositories
3. Creating generic repositories for all entities
4. Mixing query and command responsibilities
5. Having too many dependencies in repositories
6. Not separating data access from event handling
7. Forgetting optimistic concurrency control

---

## Unit of Work Pattern

### What is Unit of Work Pattern?

The Unit of Work pattern maintains a list of objects affected by a business transaction and coordinates the writing out of changes and the resolution of concurrency problems. It tracks changes made during a business transaction and ensures all operations either complete successfully or fail entirely, maintaining data consistency.

### Primary Use Cases
- Managing transaction boundaries
- Coordinating multiple repository operations
- Ensuring data consistency across aggregates
- Deferring event publication until successful commit
- Handling concurrency conflicts
- Batching database operations

### When to Use
- When operations span multiple aggregates
- When you need ACID transactions
- When coordinating complex business transactions
- When implementing domain events
- For maintaining consistency in write operations

### When NOT to Use
- For simple, single-aggregate operations
- In read-only scenarios
- When eventual consistency is acceptable
- For simple CRUD applications
- When transactions are handled elsewhere

### Core Components

#### IUnitOfWork Interface
```typescript
interface IUnitOfWork {
  /**
   * Begins a new transaction
   */
  begin(): Promise<void>;

  /**
   * Commits the transaction and publishes events
   */
  commit(): Promise<void>;

  /**
   * Rolls back the transaction, discarding changes
   */
  rollback(): Promise<void>;

  /**
   * Gets a repository participating in this transaction
   */
  getRepository<T extends IRepository<any>>(name: string): T;

  /**
   * Registers a repository with this Unit of Work
   */
  registerRepository<T extends IRepository<any>>(
    name: string,
    repository: T,
  ): void;

  /**
   * Gets the event bus for deferred event publication
   */
  getEventBus(): IEventBus;
}
```

### Basic Examples

#### Simple Unit of Work Implementation
```typescript
class SimpleUnitOfWork implements IUnitOfWork {
  private repositories = new Map<string, IRepository<any>>();
  private transaction?: DatabaseTransaction;
  private isInTransaction = false;
  private collectedEvents: IDomainEvent[] = [];
  
  constructor(
    private readonly db: Database,
    private readonly eventBus: IEventBus
  ) {}
  
  async begin(): Promise<void> {
    if (this.isInTransaction) {
      throw new Error('Transaction already in progress');
    }
    
    this.transaction = await this.db.beginTransaction();
    this.isInTransaction = true;
    this.collectedEvents = [];
  }
  
  async commit(): Promise<void> {
    if (!this.isInTransaction || !this.transaction) {
      throw new Error('No transaction in progress');
    }
    
    try {
      await this.transaction.commit();
      
      // Publish events after successful commit
      for (const event of this.collectedEvents) {
        await this.eventBus.publish(event);
      }
      
      this.cleanup();
    } catch (error) {
      await this.rollback();
      throw error;
    }
  }
  
  async rollback(): Promise<void> {
    if (!this.isInTransaction || !this.transaction) {
      throw new Error('No transaction in progress');
    }
    
    await this.transaction.rollback();
    this.cleanup();
  }
  
  getRepository<T extends IRepository<any>>(name: string): T {
    const repository = this.repositories.get(name);
    if (!repository) {
      throw new Error(`Repository ${name} not registered`);
    }
    return repository as T;
  }
  
  registerRepository<T extends IRepository<any>>(
    name: string,
    repository: T
  ): void {
    this.repositories.set(name, repository);
  }
  
  getEventBus(): IEventBus {
    // Return a wrapper that collects events instead of publishing immediately
    return {
      publish: (event: IDomainEvent) => {
        this.collectedEvents.push(event);
        return Promise.resolve();
      }
    } as IEventBus;
  }
  
  private cleanup(): void {
    this.isInTransaction = false;
    this.transaction = undefined;
    this.collectedEvents = [];
  }
}
```

#### Transaction-Aware Repository Wrapper
```typescript
class UnitOfWorkRepository<T extends IAggregateRoot<any>> 
  implements IRepository<T> {
  
  constructor(
    private readonly baseRepository: IRepository<T>,
    private readonly unitOfWork: IUnitOfWork,
    private readonly transaction: DatabaseTransaction
  ) {}
  
  async findById(id: any): Promise<T | null> {
    // Use transaction context for queries
    return this.baseRepository.findById(id);
  }
  
  async save(aggregate: T): Promise<void> {
    // Save within transaction
    await this.baseRepository.save(aggregate);
    
    // Collect domain events
    const events = aggregate.getDomainEvents();
    const eventBus = this.unitOfWork.getEventBus();
    
    for (const event of events) {
      await eventBus.publish(event);
    }
    
    aggregate.clearDomainEvents();
  }
  
  async delete(aggregate: T): Promise<void> {
    if (this.baseRepository.delete) {
      await this.baseRepository.delete(aggregate);
    }
  }
}
```

### Advanced Examples

#### Unit of Work with Identity Map
```typescript
class AdvancedUnitOfWork implements IUnitOfWork {
  private repositories = new Map<string, IRepository<any>>();
  private identityMap = new Map<string, any>();
  private dirtyObjects = new Set<any>();
  private removedObjects = new Set<any>();
  private transaction?: DatabaseTransaction;
  private isInTransaction = false;
  private collectedEvents: IDomainEvent[] = [];
  
  constructor(
    private readonly db: Database,
    private readonly eventBus: IEventBus
  ) {}
  
  async begin(): Promise<void> {
    if (this.isInTransaction) {
      throw new Error('Transaction already in progress');
    }
    
    this.transaction = await this.db.beginTransaction();
    this.isInTransaction = true;
    this.clear();
  }
  
  async commit(): Promise<void> {
    if (!this.isInTransaction) {
      throw new Error('No transaction in progress');
    }
    
    try {
      // Save dirty objects
      for (const obj of this.dirtyObjects) {
        const repository = this.findRepositoryFor(obj);
        await repository.save(obj);
      }
      
      // Delete removed objects
      for (const obj of this.removedObjects) {
        const repository = this.findRepositoryFor(obj);
        if (repository.delete) {
          await repository.delete(obj);
        }
      }
      
      await this.transaction!.commit();
      
      // Publish events after successful commit
      for (const event of this.collectedEvents) {
        await this.eventBus.publish(event);
      }
      
      this.clear();
    } catch (error) {
      await this.rollback();
      throw error;
    }
  }
  
  async rollback(): Promise<void> {
    if (!this.isInTransaction) {
      throw new Error('No transaction in progress');
    }
    
    await this.transaction!.rollback();
    this.clear();
  }
  
  registerClean(entity: any): void {
    const key = this.getIdentityKey(entity);
    this.identityMap.set(key, entity);
  }
  
  registerDirty(entity: any): void {
    const key = this.getIdentityKey(entity);
    if (!this.removedObjects.has(entity)) {
      this.dirtyObjects.add(entity);
      this.identityMap.set(key, entity);
    }
  }
  
  registerRemoved(entity: any): void {
    const key = this.getIdentityKey(entity);
    this.identityMap.delete(key);
    this.dirtyObjects.delete(entity);
    this.removedObjects.add(entity);
  }
  
  getFromIdentityMap(entityType: string, id: any): any | null {
    const key = `${entityType}:${id}`;
    return this.identityMap.get(key) || null;
  }
  
  private getIdentityKey(entity: any): string {
    return `${entity.constructor.name}:${entity.id}`;
  }
  
  private findRepositoryFor(entity: any): IRepository<any> {
    const entityType = entity.constructor.name.toLowerCase();
    const repository = this.repositories.get(entityType);
    if (!repository) {
      throw new Error(`No repository registered for ${entityType}`);
    }
    return repository;
  }
  
  private clear(): void {
    this.identityMap.clear();
    this.dirtyObjects.clear();
    this.removedObjects.clear();
    this.collectedEvents = [];
    this.isInTransaction = false;
    this.transaction = undefined;
  }
}
```

#### Unit of Work with Nested Transactions
```typescript
class NestedTransactionUnitOfWork implements IUnitOfWork {
  private transactionStack: DatabaseTransaction[] = [];
  private repositories = new Map<string, IRepository<any>>();
  private eventsByTransaction = new Map<DatabaseTransaction, IDomainEvent[]>();
  
  constructor(
    private readonly db: Database,
    private readonly eventBus: IEventBus
  ) {}
  
  async begin(): Promise<void> {
    const transaction = await this.db.beginTransaction();
    this.transactionStack.push(transaction);
    this.eventsByTransaction.set(transaction, []);
  }
  
  async commit(): Promise<void> {
    if (this.transactionStack.length === 0) {
      throw new Error('No transaction in progress');
    }
    
    const transaction = this.transactionStack.pop()!;
    const events = this.eventsByTransaction.get(transaction) || [];
    
    try {
      await transaction.commit();
      
      // Only publish events if this was the outermost transaction
      if (this.transactionStack.length === 0) {
        for (const event of events) {
          await this.eventBus.publish(event);
        }
      } else {
        // Move events to parent transaction
        const parentTransaction = this.transactionStack[this.transactionStack.length - 1];
        const parentEvents = this.eventsByTransaction.get(parentTransaction) || [];
        parentEvents.push(...events);
        this.eventsByTransaction.set(parentTransaction, parentEvents);
      }
      
      this.eventsByTransaction.delete(transaction);
    } catch (error) {
      await this.rollback();
      throw error;
    }
  }
  
  async rollback(): Promise<void> {
    if (this.transactionStack.length === 0) {
      throw new Error('No transaction in progress');
    }
    
    const transaction = this.transactionStack.pop()!;
    await transaction.rollback();
    this.eventsByTransaction.delete(transaction);
  }
  
  getCurrentTransaction(): DatabaseTransaction | null {
    return this.transactionStack[this.transactionStack.length - 1] || null;
  }
  
  getEventBus(): IEventBus {
    return {
      publish: (event: IDomainEvent) => {
        const currentTransaction = this.getCurrentTransaction();
        if (!currentTransaction) {
          throw new Error('No transaction in progress');
        }
        
        const events = this.eventsByTransaction.get(currentTransaction) || [];
        events.push(event);
        this.eventsByTransaction.set(currentTransaction, events);
        
        return Promise.resolve();
      }
    } as IEventBus;
  }
}
```

### Standalone Usage
```typescript
// Basic usage in application service
class OrderApplicationService {
  constructor(
    private readonly unitOfWork: IUnitOfWork,
    private readonly orderRepository: IRepository<Order>,
    private readonly customerRepository: IRepository<Customer>
  ) {
    // Register repositories with unit of work
    unitOfWork.registerRepository('orders', orderRepository);
    unitOfWork.registerRepository('customers', customerRepository);
  }
  
  async placeOrder(customerId: CustomerId, items: OrderItem[]): Promise<void> {
    await this.unitOfWork.begin();
    
    try {
      // Get repositories from unit of work
      const orderRepo = this.unitOfWork.getRepository<IRepository<Order>>('orders');
      const customerRepo = this.unitOfWork.getRepository<IRepository<Customer>>('customers');
      
      // Load customer
      const customer = await customerRepo.findById(customerId);
      if (!customer) {
        throw new Error('Customer not found');
      }
      
      // Create and save order
      const order = Order.create(customerId, items);
      await orderRepo.save(order);
      
      // Update customer
      customer.incrementOrderCount();
      await customerRepo.save(customer);
      
      // Commit transaction - events will be published automatically
      await this.unitOfWork.commit();
    } catch (error) {
      await this.unitOfWork.rollback();
      throw error;
    }
  }
}

// Manual event collection
class TransferService {
  constructor(
    private readonly unitOfWork: IUnitOfWork,
    private readonly accountRepository: IRepository<Account>
  ) {
    unitOfWork.registerRepository('accounts', accountRepository);
  }
  
  async transfer(
    fromAccountId: AccountId,
    toAccountId: AccountId,
    amount: Money
  ): Promise<void> {
    await this.unitOfWork.begin();
    
    try {
      const accountRepo = this.unitOfWork.getRepository<IRepository<Account>>('accounts');
      
      const fromAccount = await accountRepo.findById(fromAccountId);
      const toAccount = await accountRepo.findById(toAccountId);
      
      if (!fromAccount || !toAccount) {
        throw new Error('Account not found');
      }
      
      // Perform transfer
      fromAccount.withdraw(amount);
      toAccount.deposit(amount);
      
      // Save accounts
      await accountRepo.save(fromAccount);
      await accountRepo.save(toAccount);
      
      // Events are automatically collected by unit of work
      await this.unitOfWork.commit();
    } catch (error) {
      await this.unitOfWork.rollback();
      throw error;
    }
  }
}
```

### Integration with Other Patterns

```typescript

// With Domain Services
class OrderFulfillmentService {
  constructor(
    private readonly unitOfWork: IUnitOfWork,
    private readonly inventoryService: IInventoryService
  ) {}
  
  async fulfillOrder(orderId: OrderId): Promise<void> {
    await this.unitOfWork.begin();
    
    try {
      const orderRepo = this.unitOfWork.getRepository<IRepository<Order>>('orders');
      const order = await orderRepo.findById(orderId);
      
      if (!order) {
        throw new Error('Order not found');
      }
      
      // Check inventory for all items
      for (const item of order.getItems()) {
        const available = await this.inventoryService.checkAvailability(
          item.productId,
          item.quantity
        );
        
        if (!available) {
          throw new Error(`Insufficient inventory for ${item.productId}`);
        }
      }
      
      // Mark order as fulfilled
      order.markAsFulfilled();
      await orderRepo.save(order);
      
      // Reserve inventory
      for (const item of order.getItems()) {
        await this.inventoryService.reserve(
          item.productId,
          item.quantity,
          orderId
        );
      }
      
      await this.unitOfWork.commit();
    } catch (error) {
      await this.unitOfWork.rollback();
      throw error;
    }
  }
}

// With Command Pattern
interface ICommand {
  execute(unitOfWork: IUnitOfWork): Promise<void>;
}

class PlaceOrderCommand implements ICommand {
  constructor(
    private readonly customerId: CustomerId,
    private readonly items: OrderItem[]
  ) {}
  
  async execute(unitOfWork: IUnitOfWork): Promise<void> {
    const orderRepo = unitOfWork.getRepository<IRepository<Order>>('orders');
    const customerRepo = unitOfWork.getRepository<IRepository<Customer>>('customers');
    
    const customer = await customerRepo.findById(this.customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }
    
    const order = Order.create(this.customerId, this.items);
    await orderRepo.save(order);
  }
}

class CommandExecutor {
  constructor(private readonly unitOfWork: IUnitOfWork) {}
  
  async execute(command: ICommand): Promise<void> {
    await this.unitOfWork.begin();
    
    try {
      await command.execute(this.unitOfWork);
      await this.unitOfWork.commit();
    } catch (error) {
      await this.unitOfWork.rollback();
      throw error;
    }
  }
}

// With Event Sourcing
class EventSourcedUnitOfWork implements IUnitOfWork {
  private eventStore: IEventStore;
  private appendedEvents: IExtendedDomainEvent[] = [];
  private repositories = new Map<string, IRepository<any>>();
  
  constructor(
    eventStore: IEventStore,
    private readonly eventBus: IEventBus
  ) {
    this.eventStore = eventStore;
  }
  
  async begin(): Promise<void> {
    this.appendedEvents = [];
  }
  
  async commit(): Promise<void> {
    // Save all appended events
    await this.eventStore.append(this.appendedEvents);
    
    // Publish events after successful commit
    for (const event of this.appendedEvents) {
      await this.eventBus.publish(event);
    }
    
    this.appendedEvents = [];
  }
  
  async rollback(): Promise<void> {
    this.appendedEvents = [];
  }
  
  getEventBus(): IEventBus {
    // Return a wrapper that collects events for event store
    return {
      publish: (event: IDomainEvent) => {
        this.appendedEvents.push(event as IExtendedDomainEvent);
        return Promise.resolve();
      }
    } as IEventBus;
  }
}
```

### Best Practices
1. Always use try-catch-finally or try-catch with rollback
2. Register repositories at application startup
3. Keep unit of work scope as small as possible
4. Don't nest unit of work unless explicitly supported
5. Clear identity maps after transaction completion
6. Ensure events are published only after successful commit
7. Use dependency injection for unit of work

### Common Pitfalls
1. Forgetting to call begin() before operations
2. Not handling rollback on errors
3. Mixing unit of work with repository concerns
4. Creating long-running transactions
5. Not clearing state between transactions
6. Publishing events before commit
7. Ignoring concurrency issues

---

## Outbox Pattern

### What is Outbox Pattern?

The Outbox Pattern ensures reliable message publishing in distributed systems by storing messages in a database table (outbox) as part of the same transaction that updates business data. Messages are then published asynchronously from the outbox, guaranteeing at-least-once delivery even in case of failures.

### Primary Use Cases
- Ensuring reliable event publishing
- Maintaining consistency between database state and published events
- Implementing transactional messaging
- Handling message delivery failures gracefully
- Decoupling message publishing from business logic
- Supporting message prioritization and scheduling

### When to Use
- When you need guaranteed message delivery
- In microservices architectures
- When publishing events must be atomic with database changes
- For handling distributed transactions
- When network failures are a concern

### When NOT to Use
- In simple monolithic applications
- When eventual consistency is not acceptable
- When messages don't need durability guarantees
- For high-frequency, low-value messages
- When latency is critical

### Core Components

#### IOutboxMessage Interface
```typescript
interface IOutboxMessage<T = any> {
  /** Unique identifier for the message */
  id: string;
  
  /** Type of message */
  messageType: string;
  
  /** Message payload */
  payload: T;
  
  /** Additional metadata */
  metadata: Record<string, any>;
  
  /** Processing status */
  status: MessageStatus;
  
  /** Processing attempts count */
  attempts: number;
  
  /** When the message was created */
  createdAt: Date;
  
  /** When to process the message (for delayed processing) */
  processAfter?: Date;
  
  /** Priority level */
  priority?: MessagePriority;
  
  /** Last error message (if any) */
  lastError?: string;
}
```

#### IOutboxRepository Abstract Class
```typescript
abstract class IOutboxRepository {
  abstract saveMessage<T = any>(message: IOutboxMessage<T>): Promise<string>;
  abstract saveBatch<T = any>(messages: IOutboxMessage<T>[]): Promise<string[]>;
  abstract getUnprocessedMessages(
    limit?: number,
    priorityOrder?: MessagePriority[]
  ): Promise<IOutboxMessage[]>;
  abstract updateStatus(
    id: string,
    status: MessageStatus,
    error?: Error
  ): Promise<void>;
  abstract incrementAttempt(id: string): Promise<number>;
}
```

### Basic Examples

#### Simple Outbox Implementation
```typescript
class OutboxService {
  constructor(
    private readonly outboxRepository: IOutboxRepository,
    private readonly messagePublisher: IMessagePublisher
  ) {}
  
  async publishMessage<T>(
    messageType: string,
    payload: T,
    metadata?: Record<string, any>
  ): Promise<void> {
    // Create outbox message
    const message = OutboxMessageFactory.createMessage(
      messageType,
      payload,
      { metadata }
    );
    
    // Save to outbox
    await this.outboxRepository.saveMessage(message);
  }
  
  async processOutbox(): Promise<void> {
    // Get unprocessed messages
    const messages = await this.outboxRepository.getUnprocessedMessages(10);
    
    for (const message of messages) {
      try {
        // Update status to processing
        await this.outboxRepository.updateStatus(
          message.id,
          MessageStatus.PROCESSING
        );
        
        // Publish message
        await this.messagePublisher.publish(
          message.messageType,
          message.payload,
          message.metadata
        );
        
        // Mark as processed
        await this.outboxRepository.updateStatus(
          message.id,
          MessageStatus.PROCESSED
        );
      } catch (error) {
        // Handle failure
        await this.handleFailure(message, error);
      }
    }
  }
  
  private async handleFailure(
    message: IOutboxMessage,
    error: Error
  ): Promise<void> {
    const attempts = await this.outboxRepository.incrementAttempt(message.id);
    
    if (attempts >= 3) {
      // Mark as failed after max attempts
      await this.outboxRepository.updateStatus(
        message.id,
        MessageStatus.FAILED,
        error
      );
    } else {
      // Return to pending for retry
      await this.outboxRepository.updateStatus(
        message.id,
        MessageStatus.PENDING,
        error
      );
    }
  }
}
```

#### Integration with Domain Events
```typescript
class DomainEventOutboxHandler implements IEventHandler<IDomainEvent> {
  constructor(
    private readonly outboxRepository: IOutboxRepository,
    private readonly transaction: ITransaction
  ) {}
  
  async handle(event: IDomainEvent): Promise<void> {
    // Save domain event to outbox within same transaction
    const outboxMessage = OutboxMessageFactory.createFromIntegrationEvent(
      event,
      {
        metadata: {
          aggregateId: event.metadata?.aggregateId,
          aggregateType: event.metadata?.aggregateType,
          correlationId: event.metadata?.correlationId,
        }
      }
    );
    
    await this.outboxRepository.saveMessage(outboxMessage);
  }
}
```

### Advanced Examples

#### Outbox with Priority and Scheduling
```typescript
class PriorityOutboxProcessor {
  constructor(
    private readonly outboxRepository: IOutboxRepository,
    private readonly messageHandlers: Map<string, IOutboxMessageHandler>
  ) {}
  
  async processMessages(): Promise<void> {
    // Process messages by priority
    const priorityOrder = [
      MessagePriority.CRITICAL,
      MessagePriority.HIGH,
      MessagePriority.NORMAL,
      MessagePriority.LOW
    ];
    
    const messages = await this.outboxRepository.getUnprocessedMessages(
      20,
      priorityOrder
    );
    
    // Process messages
    for (const message of messages) {
      // Skip if scheduled for later
      if (message.processAfter && message.processAfter > new Date()) {
        continue;
      }
      
      await this.processMessage(message);
    }
  }
  
  private async processMessage(message: IOutboxMessage): Promise<void> {
    const handler = this.messageHandlers.get(message.messageType);
    
    if (!handler) {
      throw new Error(`No handler for message type: ${message.messageType}`);
    }
    
    try {
      await this.outboxRepository.updateStatus(
        message.id,
        MessageStatus.PROCESSING
      );
      
      await handler.handle(message);
      
      await this.outboxRepository.updateStatus(
        message.id,
        MessageStatus.PROCESSED
      );
    } catch (error) {
      await this.handleProcessingError(message, error);
    }
  }
  
  private async handleProcessingError(
    message: IOutboxMessage,
    error: Error
  ): Promise<void> {
    const attempts = await this.outboxRepository.incrementAttempt(message.id);
    
    if (attempts >= this.getMaxAttempts(message.priority)) {
      await this.outboxRepository.updateStatus(
        message.id,
        MessageStatus.FAILED,
        error
      );
    } else {
      // Schedule retry with exponential backoff
      const delayMs = Math.pow(2, attempts) * 1000;
      const processAfter = new Date(Date.now() + delayMs);
      
      await this.outboxRepository.scheduleMessage(message, processAfter);
    }
  }
  
  private getMaxAttempts(priority?: MessagePriority): number {
    switch (priority) {
      case MessagePriority.CRITICAL:
        return 10;
      case MessagePriority.HIGH:
        return 5;
      default:
        return 3;
    }
  }
}
```

### Standalone Usage
```typescript
// Basic usage
const outboxService = new OutboxService(outboxRepository, messagePublisher);

// Publish message through outbox
await outboxService.publishMessage(
  'OrderCreated',
  { orderId: '123', total: 100 },
  { source: 'order-service' }
);

// Process outbox (typically in a background job)
setInterval(async () => {
  await outboxService.processOutbox();
}, 5000);

// Scheduled message
const delayedMessage = OutboxMessageFactory.createDelayedMessage(
  'SendReminderEmail',
  { userId: '456', templateId: 'payment-reminder' },
  24 * 60 * 60 * 1000, // 24 hours
  { priority: MessagePriority.LOW }
);

await outboxRepository.saveMessage(delayedMessage);

// High priority message
const urgentMessage = OutboxMessageFactory.createHighPriorityMessage(
  'CriticalAlert',
  { severity: 'high', message: 'System overload' }
);

await outboxRepository.saveMessage(urgentMessage);
```

### Integration with Other Patterns

```typescript
// With Unit of Work Pattern
class OutboxUnitOfWork implements IUnitOfWork {
  private outboxMessages: IOutboxMessage[] = [];
  private repositories = new Map<string, IRepository<any>>();
  
  constructor(
    private readonly db: Database,
    private readonly outboxRepository: IOutboxRepository
  ) {}
  
  async commit(): Promise<void> {
    await this.db.transaction(async (tx) => {
      // Commit all repository changes
      for (const [name, repo] of this.repositories) {
        await repo.commit(tx);
      }
      
      // Save outbox messages in same transaction
      if (this.outboxMessages.length > 0) {
        await this.outboxRepository.saveBatch(this.outboxMessages);
      }
    });
    
    this.cleanup();
  }
  
  addOutboxMessage(message: IOutboxMessage): void {
    this.outboxMessages.push(message);
  }
  
  private cleanup(): void {
    this.outboxMessages = [];
    this.repositories.clear();
  }
}

// With Event Sourcing
class EventSourcedOutboxHandler {
  constructor(
    private readonly eventStore: IEventStore,
    private readonly outboxRepository: IOutboxRepository
  ) {}
  
  async handleAggregateEvents(
    aggregateId: string,
    events: IDomainEvent[]
  ): Promise<void> {
    await this.eventStore.transaction(async (tx) => {
      // Save events to event store
      await this.eventStore.appendEvents(aggregateId, events, tx);
      
      // Save integration events to outbox
      const outboxMessages = events
        .filter(event => this.shouldPublishExternally(event))
        .map(event => this.createOutboxMessage(event));
      
      if (outboxMessages.length > 0) {
        await this.outboxRepository.saveBatch(outboxMessages);
      }
    });
  }
  
  private shouldPublishExternally(event: IDomainEvent): boolean {
    // Logic to determine if event should be published externally
    return event.metadata?.publishExternal === true;
  }
  
  private createOutboxMessage(event: IDomainEvent): IOutboxMessage {
    return OutboxMessageFactory.createFromIntegrationEvent(event, {
      priority: this.determinePriority(event),
      metadata: {
        boundedContext: 'order-management',
        version: event.metadata?.eventVersion || 1
      }
    });
  }
  
  private determinePriority(event: IDomainEvent): MessagePriority {
    if (event.eventType.includes('Critical')) {
      return MessagePriority.HIGH;
    }
    return MessagePriority.NORMAL;
  }
}
```

### Best Practices
1. Always save outbox messages in the same transaction as business data
2. Process outbox asynchronously in background jobs
3. Implement proper retry logic with exponential backoff
4. Use message priorities for critical messages
5. Monitor outbox table size and clean up old messages
6. Include correlation IDs for tracing
7. Design idempotent message handlers

### Common Pitfalls
1. Not using transactions when saving to outbox
2. Processing messages synchronously
3. Ignoring failed messages
4. Not implementing proper retry logic
5. Allowing outbox table to grow indefinitely
6. Missing message deduplication
7. Forgetting to handle processing timeouts

---

## Result Pattern

### What is Result Pattern?

The Result Pattern provides a type-safe way to handle operations that can succeed or fail without using exceptions. It encapsulates both successful values and errors in a single object, enabling a more functional approach to error handling.

### Primary Use Cases
- Replacing exceptions for expected failures
- Making error handling explicit in function signatures
- Chaining operations that might fail
- Avoiding try-catch blocks for control flow
- Providing type-safe error handling

### When to Use
- When failures are expected and part of normal flow
- In domain operations that can fail
- When you want explicit error handling
- For composing operations that might fail
- In functional programming style

### When NOT to Use
- For truly exceptional circumstances
- When exceptions are more appropriate
- In performance-critical paths (adds overhead)
- When simple null/undefined checks suffice

### Core Components

#### Result Class
```typescript
class Result<TValue, TError = Error> {
  private constructor(
    private readonly _isSuccess: boolean,
    private readonly _value?: TValue,
    private readonly _error?: TError
  ) {}

  get isSuccess(): boolean { return this._isSuccess; }
  get isFailure(): boolean { return !this._isSuccess; }
  get value(): TValue { /* throws if failure */ }
  get error(): TError { /* throws if success */ }

  static ok<TValue, TError = Error>(value?: TValue): Result<TValue, TError>;
  static fail<TValue, TError = Error>(error: TError): Result<TValue, TError>;
  
  map<TNewValue>(fn: (value: TValue) => TNewValue): Result<TNewValue, TError>;
  flatMap<TNewValue>(fn: (value: TValue) => Result<TNewValue, TError>): Result<TNewValue, TError>;
  match<TResult>(
    onSuccess: (value: TValue) => TResult,
    onFailure: (error: TError) => TResult
  ): TResult;
}
```

### Basic Examples

#### Domain Operation with Result
```typescript
class User {
  changeEmail(newEmail: string): Result<void, ValidationError> {
    // Validate email format
    if (!this.isValidEmail(newEmail)) {
      return Result.fail(new ValidationError('Invalid email format'));
    }
    
    // Check if email is already taken
    if (this.isEmailTaken(newEmail)) {
      return Result.fail(new ValidationError('Email already in use'));
    }
    
    this.email = newEmail;
    return Result.ok();
  }
  
  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}

// Usage
const result = user.changeEmail('new@example.com');
if (result.isFailure) {
  console.error(result.error.message);
} else {
  console.log('Email changed successfully');
}
```

#### Chaining Operations
```typescript
class OrderService {
  placeOrder(orderData: OrderData): Result<Order, OrderError> {
    return this.validateOrder(orderData)
      .flatMap(validData => this.checkInventory(validData))
      .flatMap(checkedData => this.calculatePrice(checkedData))
      .map(pricedData => this.createOrder(pricedData));
  }
  
  private validateOrder(data: OrderData): Result<OrderData, OrderError> {
    if (data.items.length === 0) {
      return Result.fail(new OrderError('Order must have items'));
    }
    return Result.ok(data);
  }
  
  private checkInventory(data: OrderData): Result<OrderData, OrderError> {
    for (const item of data.items) {
      if (!this.hasStock(item.productId, item.quantity)) {
        return Result.fail(new OrderError(`Insufficient stock for ${item.productId}`));
      }
    }
    return Result.ok(data);
  }
}
```

### Advanced Examples

#### Async Operations with Result
```typescript
class PaymentService {
  async processPayment(paymentData: PaymentData): Promise<Result<PaymentReceipt, PaymentError>> {
    // Validate payment data
    const validationResult = this.validatePaymentData(paymentData);
    if (validationResult.isFailure) {
      return Result.fail(validationResult.error);
    }
    
    // Process with payment gateway
    return Result.tryAsync(async () => {
      const response = await this.paymentGateway.process(paymentData);
      return new PaymentReceipt(response.transactionId, response.amount);
    });
  }
  
  private validatePaymentData(data: PaymentData): Result<void, PaymentError> {
    if (data.amount <= 0) {
      return Result.fail(new PaymentError('Invalid amount'));
    }
    
    if (!this.isValidCard(data.cardNumber)) {
      return Result.fail(new PaymentError('Invalid card number'));
    }
    
    return Result.ok();
  }
}

// Usage with async/await
const paymentResult = await paymentService.processPayment(paymentData);

paymentResult.match(
  receipt => console.log(`Payment successful: ${receipt.transactionId}`),
  error => console.error(`Payment failed: ${error.message}`)
);
```

### Integration with Other Patterns

```typescript
// With Repository Pattern
class UserRepository {
  async findByEmail(email: string): Promise<Result<User, RepositoryError>> {
    try {
      const userData = await this.db.users.findOne({ email });
      
      if (!userData) {
        return Result.fail(new RepositoryError('User not found'));
      }
      
      const user = UserMapper.toDomain(userData);
      return Result.ok(user);
    } catch (error) {
      return Result.fail(new RepositoryError('Database error', error));
    }
  }
}

// With Domain Services
class TransferService {
  async transfer(
    fromAccountId: string,
    toAccountId: string,
    amount: Money
  ): Promise<Result<TransferReceipt, TransferError>> {
    // Load accounts
    const fromResult = await this.accountRepo.findById(fromAccountId);
    const toResult = await this.accountRepo.findById(toAccountId);
    
    // Chain operations using flatMap
    return fromResult
      .flatMap(fromAccount => 
        toResult.flatMap(toAccount => 
          this.executeTransfer(fromAccount, toAccount, amount)
        )
      );
  }
  
  private executeTransfer(
    from: Account,
    to: Account,
    amount: Money
  ): Result<TransferReceipt, TransferError> {
    // Validate transfer
    if (from.balance.isLessThan(amount)) {
      return Result.fail(new TransferError('Insufficient funds'));
    }
    
    // Execute transfer
    from.withdraw(amount);
    to.deposit(amount);
    
    return Result.ok(new TransferReceipt(from.id, to.id, amount));
  }
}
```

### Best Practices
1. Use Result for expected failures, exceptions for unexpected ones
2. Provide meaningful error types, not just strings
3. Chain operations using map and flatMap
4. Use match for exhaustive handling
5. Keep error types specific to the domain
6. Consider async variants for Promise-based operations

### Common Pitfalls
1. Overusing Result where simple null checks would suffice
2. Not handling both success and failure cases
3. Accessing value without checking isSuccess
4. Using generic Error type instead of specific error types
5. Nesting Results unnecessarily

---

## Utilities

### What are Utilities?

Utilities in DomainTS are helper functions and classes that provide common functionality across the library, including UUID generation, value checking, validation, and safe error handling for tests.

### Primary Use Cases
- Generating unique identifiers (UUIDs)
- Checking if values are empty/truthy/falsy
- Validating different ID formats
- Deep equality comparisons
- Safe error handling in tests

### When to Use
- When you need UUID generation
- For complex empty/truthy checks
- When validating identifiers
- For deep object comparisons
- When writing tests that expect errors

### When NOT to Use
- For simple JavaScript truthiness checks
- When performance is critical (deep equality)
- In production code for error handling (safeRun is for tests only)

### Core Components

#### LibUtils Class
```typescript
class LibUtils {
  // UUID operations
  static getUUID(type?: 'v4'): string;
  static isValidUUID(value: string): boolean;
  
  // Value checking
  static isEmpty(input: unknown): boolean;
  static hasValue(input: unknown): boolean;
  static isNotEmpty(input: unknown): boolean;
  static isTruthy(input: unknown): boolean;
  static isFalsy(input: unknown): boolean;
  
  // ID validation
  static isValidInteger(value: number): boolean;
  static isValidBigInt(value: string): boolean;
  static isValidTextId(value: string): boolean;
  static normalizeIdToString(value: string | number | bigint): string;
  
  // Utilities
  static deepEqual(obj1: unknown, obj2: unknown): boolean;
  static sleep(ms: number): Promise<void>;
}
```

#### safeRun Function (Test Utility)
```typescript
// Synchronous version
function safeRun<E extends Error, T>(
  fn: () => T
): readonly [E | undefined, T | undefined];

// Asynchronous version
function safeRun<E extends Error, T>(
  fn: () => Promise<T>
): Promise<readonly [E | undefined, T | undefined]>;
```

### Basic Examples

#### Using LibUtils
```typescript
// UUID generation
const id = LibUtils.getUUID(); // generates v4 UUID
const isValid = LibUtils.isValidUUID(id); // true

// Value checking with special cases handling
console.log(LibUtils.isEmpty(null)); // true
console.log(LibUtils.isEmpty('')); // true
console.log(LibUtils.isEmpty([])); // true
console.log(LibUtils.isEmpty(new Map())); // true
console.log(LibUtils.isEmpty(0)); // true
console.log(LibUtils.isEmpty(false)); // true

// But handles special cases:
console.log(LibUtils.isEmpty(Number.MAX_SAFE_INTEGER)); // false
console.log(LibUtils.isEmpty(new Map([['key', 'value']]))); // false

// ID validation
console.log(LibUtils.isValidInteger(42)); // true
console.log(LibUtils.isValidInteger(-1)); // false
console.log(LibUtils.isValidBigInt('123456789012345678901234567890')); // true
console.log(LibUtils.isValidTextId('user-123_abc')); // true
console.log(LibUtils.isValidTextId('user@123')); // false

// Deep equality
const obj1 = { a: 1, b: { c: 2 } };
const obj2 = { a: 1, b: { c: 2 } };
console.log(LibUtils.deepEqual(obj1, obj2)); // true

// Sleep utility
await LibUtils.sleep(1000); // Wait for 1 second
```

#### Using safeRun in Tests
```typescript
// Testing error cases
describe('EventBus', () => {
  it('should throw error when no handler registered', async () => {
    const [error] = await safeRun(() => 
      eventBus.publish(new TestEvent())
    );
    
    expect(error).toBeInstanceOf(Error);
    expect(error?.message).toBe('No handler registered');
  });
  
  it('should handle successful operations', async () => {
    const [error, result] = await safeRun(() => 
      repository.findById('123')
    );
    
    expect(error).toBeUndefined();
    expect(result).toBeDefined();
  });
});

// Synchronous version
it('should validate input', () => {
  const [error, result] = safeRun(() => 
    validator.validate(invalidData)
  );
  
  expect(error).toBeInstanceOf(ValidationError);
  expect(result).toBeUndefined();
});
```

### Integration with Other Patterns

```typescript
// With Value Objects
class UserId extends ValueObject<string> {
  constructor(value: string) {
    super(value);
    
    if (!LibUtils.isValidUUID(value) && !LibUtils.isValidTextId(value)) {
      throw new Error('Invalid user ID format');
    }
  }
  
  static generate(): UserId {
    return new UserId(LibUtils.getUUID());
  }
}

// With Repositories
class InMemoryRepository<T extends Entity> implements IRepository<T> {
  private store = new Map<string, T>();
  
  async findById(id: EntityId): Promise<T | null> {
    const normalizedId = LibUtils.normalizeIdToString(id.value);
    return this.store.get(normalizedId) || null;
  }
  
  async save(entity: T): Promise<void> {
    const normalizedId = LibUtils.normalizeIdToString(entity.id.value);
    this.store.set(normalizedId, entity);
  }
  
  async exists(id: EntityId): Promise<boolean> {
    const normalizedId = LibUtils.normalizeIdToString(id.value);
    return this.store.has(normalizedId);
  }
}

// Testing Domain Services
describe('TransferService', () => {
  it('should handle insufficient funds error', async () => {
    const [error] = await safeRun(() =>
      transferService.transfer(
        accountId1,
        accountId2,
        new Money(1000)
      )
    );
    
    expect(error).toBeInstanceOf(InsufficientFundsError);
  });
});
```

### Best Practices
1. Use LibUtils.isEmpty() for complex empty checks
2. Prefer LibUtils.getUUID() over direct uuid library usage
3. Use safeRun only in tests, not production code
4. Consider performance implications of deepEqual for large objects
5. Use specific validation methods for different ID types

### Common Pitfalls
1. Using safeRun in production code instead of proper error handling
2. Relying on deepEqual for large object comparisons
3. Not understanding the special cases in isEmpty/isTruthy
4. Using generic ID validation when specific format is required

---
