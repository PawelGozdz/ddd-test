# Utility Functions in DomainTS - LLM-Optimized Guide

## Document Metadata

- **Pattern Name**: Result Pattern
- **Category**: Core Utilities
- **Module Name**: Utils (LibUtils, Result Pattern & SafeRun)
- **Purpose**: Common utility functions and safe execution patterns
- **Library**: DomainTS
- **Language**: TypeScript
- **Version**: 1.0.0

## Pattern Overview

### What is the Result Pattern?

The Result Pattern is a functional programming approach to error handling that represents the outcome of an operation as either a success with a value or a failure with an error. Instead of throwing exceptions, operations return a Result object that explicitly represents both possibilities.

**Core Concept**:

```typescript
// Result pattern answers: "Did this operation succeed or fail?"
const result = doSomething();
if (result.isSuccess) {
  console.log(result.value); // Access success value
} else {
  console.log(result.error); // Access error information
}
```

### Primary Use Cases

1. **Safe Operation Execution**: Execute operations without throwing exceptions
2. **Explicit Error Handling**: Make error cases visible in the type system
3. **Composable Operations**: Chain operations that might fail
4. **Async Error Handling**: Handle errors in Promise-based code elegantly
5. **Domain Operation Results**: Return results from domain services and repositories

### Key Benefits

- **Type Safety**: Errors are part of the type signature
- **No Exceptions**: Avoid try-catch blocks for business logic
- **Composability**: Chain operations with map, flatMap
- **Explicit Flow**: Success and failure paths are clear
- **Better Testing**: Easier to test both success and failure cases

## Core Components

### 1. Result Class

**Purpose**: Encapsulate success or failure outcomes

```typescript
class Result<TValue, TError = Error> {
  // Check result status
  get isSuccess(): boolean;
  get isFailure(): boolean;
  
  // Access values (throw if accessed incorrectly)
  get value(): TValue;
  get error(): TError;
  
  // Create results
  static ok<TValue, TError = Error>(value?: TValue): Result<TValue, TError>;
  static fail<TValue, TError = Error>(error: TError): Result<TValue, TError>;
  
  // Transform results
  map<TNewValue>(fn: (value: TValue) => TNewValue): Result<TNewValue, TError>;
  flatMap<TNewValue>(fn: (value: TValue) => Result<TNewValue, TError>): Result<TNewValue, TError>;
  
  // Pattern matching
  match<TResult>(
    onSuccess: (value: TValue) => TResult,
    onFailure: (error: TError) => TResult
  ): TResult;
}
```

## Basic Usage Examples

### 1. Creating Results

```typescript
// Success result
const successResult = Result.ok<number>(42);
console.log(successResult.isSuccess); // true
console.log(successResult.value); // 42

// Failure result
const failureResult = Result.fail<number>(new Error("Something went wrong"));
console.log(failureResult.isFailure); // true
console.log(failureResult.error.message); // "Something went wrong"

// Success with no value (void operations)
const voidSuccess = Result.ok<void>();
```

### 2. Safe Function Execution

```typescript
// Wrap potentially failing operations
function divide(a: number, b: number): Result<number, Error> {
  if (b === 0) {
    return Result.fail(new Error("Division by zero"));
  }
  return Result.ok(a / b);
}

// Use the function
const result = divide(10, 2);
if (result.isSuccess) {
  console.log(`Result: ${result.value}`); // Result: 5
} else {
  console.log(`Error: ${result.error.message}`);
}

// Using Result.try for existing code
const parseResult = Result.try(() => JSON.parse('{"name": "John"}'));
if (parseResult.isSuccess) {
  console.log(parseResult.value.name); // John
}
```

### 3. Transforming Results

```typescript
// Map: Transform success values
const numberResult = Result.ok(5);
const doubledResult = numberResult.map(x => x * 2);
console.log(doubledResult.value); // 10

// Map on failure passes through the error
const errorResult = Result.fail<number>(new Error("Failed"));
const mappedError = errorResult.map(x => x * 2);
console.log(mappedError.isFailure); // true

// FlatMap: Chain operations that return Results
function getUserById(id: string): Result<User, Error> {
  // Implementation
}

function getUserOrders(user: User): Result<Order[], Error> {
  // Implementation
}

const ordersResult = getUserById("123")
  .flatMap(user => getUserOrders(user));
```

### 4. Pattern Matching

```typescript
const result = divide(10, 0);

// Using match for different outcomes
const message = result.match(
  value => `Success: ${value}`,
  error => `Error: ${error.message}`
);
console.log(message); // "Error: Division by zero"

// More complex matching
const httpStatus = result.match(
  value => ({ status: 200, data: value }),
  error => ({ status: 400, error: error.message })
);
```

### 5. Side Effects with Tap

```typescript
const result = divide(10, 2)
  .tap(value => console.log(`Calculated: ${value}`))
  .tapError(error => console.error(`Error occurred: ${error.message}`))
  .map(value => value * 2);

// tap and tapError don't change the result, only perform side effects
```

## Advanced Usage Patterns

### 1. Async Operations

```typescript
// Async function returning Result
async function fetchUser(id: string): Promise<Result<User, Error>> {
  try {
    const response = await fetch(`/api/users/${id}`);
    if (!response.ok) {
      return Result.fail(new Error(`HTTP ${response.status}`));
    }
    const user = await response.json();
    return Result.ok(user);
  } catch (error) {
    return Result.fail(error instanceof Error ? error : new Error(String(error)));
  }
}

// Using Result.tryAsync
const userResult = await Result.tryAsync(async () => {
  const response = await fetch('/api/user');
  return response.json();
});

// Async transformations
const processedResult = await userResult
  .mapAsync(async user => {
    const profile = await fetchProfile(user.id);
    return { ...user, profile };
  });
```

### 2. Custom Error Types

```typescript
// Define domain-specific errors
class ValidationError {
  constructor(
    public readonly field: string,
    public readonly message: string
  ) {}
}

class NotFoundError {
  constructor(
    public readonly resource: string,
    public readonly id: string
  ) {}
}

// Use with Result
function validateUser(data: any): Result<User, ValidationError> {
  if (!data.email) {
    return Result.fail(new ValidationError('email', 'Email is required'));
  }
  // More validation...
  return Result.ok(new User(data));
}

function findUser(id: string): Result<User, NotFoundError> {
  const user = userRepository.find(id);
  if (!user) {
    return Result.fail(new NotFoundError('User', id));
  }
  return Result.ok(user);
}
```

### 3. Combining Multiple Results

```typescript
// Helper function to combine results
function combineResults<T, E>(
  results: Result<T, E>[]
): Result<T[], E> {
  const values: T[] = [];
  
  for (const result of results) {
    if (result.isFailure) {
      return Result.fail(result.error);
    }
    values.push(result.value);
  }
  
  return Result.ok(values);
}

// Usage
const userResults = [
  getUserById("1"),
  getUserById("2"),
  getUserById("3")
];

const allUsersResult = combineResults(userResults);
```

### 4. Railway-Oriented Programming

```typescript
// Chain of operations that might fail
class OrderService {
  processOrder(orderId: string): Result<Order, Error> {
    return this.findOrder(orderId)
      .flatMap(order => this.validateOrder(order))
      .flatMap(order => this.checkInventory(order))
      .flatMap(order => this.processPayment(order))
      .flatMap(order => this.shipOrder(order))
      .tap(order => this.sendConfirmationEmail(order));
  }
  
  private findOrder(id: string): Result<Order, Error> {
    // Implementation
  }
  
  private validateOrder(order: Order): Result<Order, Error> {
    // Implementation
  }
  
  // Other methods...
}
```

## Integration with DomainTS Patterns

### 1. With Validation

```typescript
class UserValidator implements IValidator<User> {
  validate(user: User): Result<User, ValidationErrors> {
    const errors: ValidationError[] = [];
    
    if (!user.email) {
      errors.push(new ValidationError('email', 'Email is required'));
    }
    
    if (user.age < 18) {
      errors.push(new ValidationError('age', 'Must be 18 or older'));
    }
    
    if (errors.length > 0) {
      return Result.fail(new ValidationErrors(errors));
    }
    
    return Result.ok(user);
  }
}
```

### 2. With Domain Services

```typescript
class AccountService extends DomainService {
  createAccount(data: CreateAccountDto): Result<Account, Error> {
    // Validate input
    const validationResult = this.validator.validate(data);
    if (validationResult.isFailure) {
      return Result.fail(validationResult.error);
    }
    
    // Check if email already exists
    const existingAccount = this.accountRepository.findByEmail(data.email);
    if (existingAccount) {
      return Result.fail(new Error('Email already in use'));
    }
    
    // Create account
    const account = Account.create(data);
    this.accountRepository.save(account);
    
    return Result.ok(account);
  }
}
```

### 3. With Specifications

```typescript
class OrderSpecificationService {
  canShipOrder(order: Order): Result<boolean, Error> {
    const spec = new OrderReadyToShipSpecification();
    
    if (!spec.isSatisfiedBy(order)) {
      const reason = spec.explainFailure(order);
      return Result.fail(new Error(reason || 'Order cannot be shipped'));
    }
    
    return Result.ok(true);
  }
}
```

## Best Practices

### 1. Always Handle Both Cases

```typescript
// Bad - ignoring error case
const result = someOperation();
console.log(result.value); // Might throw!

// Good - handle both cases
const result = someOperation();
if (result.isSuccess) {
  console.log(result.value);
} else {
  console.log(`Error: ${result.error.message}`);
}

// Better - use pattern matching
const output = result.match(
  value => `Success: ${value}`,
  error => `Error: ${error.message}`
);
```

### 2. Use Specific Error Types

```typescript
// Bad - generic errors
return Result.fail(new Error('Something went wrong'));

// Good - specific error types
class InvalidOrderError extends Error {
  constructor(public readonly orderId: string, reason: string) {
    super(`Order ${orderId} is invalid: ${reason}`);
  }
}

return Result.fail(new InvalidOrderError(order.id, 'No items in order'));
```

### 3. Chain Operations Properly

```typescript
// Bad - nested if statements
const userResult = getUser(id);
if (userResult.isSuccess) {
  const orderResult = getOrders(userResult.value);
  if (orderResult.isSuccess) {
    // Process orders
  }
}

// Good - use flatMap
const ordersResult = getUser(id)
  .flatMap(user => getOrders(user));
```

### 4. Don't Mix Exceptions and Results

```typescript
// Bad - throwing inside Result operations
function processData(data: string): Result<ProcessedData, Error> {
  if (!data) {
    throw new Error('No data'); // Don't throw!
  }
  return Result.ok(process(data));
}

// Good - return Result consistently
function processData(data: string): Result<ProcessedData, Error> {
  if (!data) {
    return Result.fail(new Error('No data'));
  }
  return Result.ok(process(data));
}
```

### 5. Use Result.try for Third-Party Code

```typescript
// When working with code that might throw
const result = Result.try(() => {
  // Third-party code that might throw
  return thirdPartyLibrary.doSomething();
});

// For async third-party code
const asyncResult = await Result.tryAsync(async () => {
  return await thirdPartyApi.fetchData();
});
```

## Testing with Result

```typescript
describe('OrderService', () => {
  it('should successfully process valid order', () => {
    const service = new OrderService();
    const result = service.processOrder(validOrder);
    
    expect(result.isSuccess).toBe(true);
    expect(result.value.status).toBe('processed');
  });
  
  it('should fail for invalid order', () => {
    const service = new OrderService();
    const result = service.processOrder(invalidOrder);
    
    expect(result.isFailure).toBe(true);
    expect(result.error.message).toContain('Invalid order');
  });
  
  it('should chain operations correctly', () => {
    const result = Result.ok(5)
      .map(x => x * 2)
      .flatMap(x => x > 5 ? Result.ok(x) : Result.fail(new Error('Too small')));
    
    expect(result.isSuccess).toBe(true);
    expect(result.value).toBe(10);
  });
});
```

## Performance Considerations

### 1. Avoid Creating Unnecessary Results

```typescript
// Bad - creating intermediate Results
function processItems(items: Item[]): Result<Item[], Error> {
  const results = items.map(item => Result.ok(processItem(item)));
  return combineResults(results);
}

// Good - create Result at the end
function processItems(items: Item[]): Result<Item[], Error> {
  try {
    const processed = items.map(item => processItem(item));
    return Result.ok(processed);
  } catch (error) {
    return Result.fail(error instanceof Error ? error : new Error(String(error)));
  }
}
```

### 2. Lazy Evaluation

```typescript
// Results are evaluated immediately
const result = expensiveOperation()
  .map(value => anotherExpensiveOperation(value));

// Consider lazy evaluation for expensive operations
class LazyResult<T, E> {
  constructor(private computation: () => Result<T, E>) {}
  
  evaluate(): Result<T, E> {
    return this.computation();
  }
}
```

## Conclusion

The Result Pattern in DomainTS provides:

- **Explicit Error Handling**: Errors are part of the type system
- **Functional Composition**: Chain operations elegantly
- **Type Safety**: Compiler ensures error handling
- **Better Testing**: Easy to test both success and failure
- **Domain Integration**: Works seamlessly with other DomainTS patterns

The Result pattern transforms error handling from an afterthought into a first-class citizen in your domain model, making your code more reliable and maintainable.

## Module Overview

The Utils module provides essential utility functions used throughout DomainTS, including UUID generation, value checking, deep comparison, and safe function execution. These utilities form the foundation for many higher-level patterns in the library.

## Part 1: LibUtils

### What is LibUtils?

LibUtils is a collection of static utility methods providing common functionality needed across domain implementations, such as identifier generation, value validation, and object comparison.

### Core Features

1. **UUID Generation**: Create unique identifiers
2. **Value Checking**: Determine if values are empty, truthy, or falsy
3. **Validation**: Check if values are valid UUIDs, integers, or custom IDs
4. **Deep Comparison**: Compare objects recursively
5. **Async Utilities**: Helper functions for async operations

### LibUtils Methods

#### 1. UUID Generation

```typescript
// Generate a UUID v4
const id = LibUtils.getUUID(); // Returns UUID v4 by default
const idV4 = LibUtils.getUUID('v4'); // Explicit v4

// Validate UUID
const isValid = LibUtils.isValidUUID('550e8400-e29b-41d4-a716-446655440000');
console.log(isValid); // true

// Example in domain entity
class OrderId {
  private readonly value: string;
  
  constructor(value?: string) {
    this.value = value || LibUtils.getUUID();
    if (!LibUtils.isValidUUID(this.value)) {
      throw new Error('Invalid order ID');
    }
  }
}
```

#### 2. Value Checking

```typescript
// Check if value is empty
console.log(LibUtils.isEmpty(null)); // true
console.log(LibUtils.isEmpty(undefined)); // true
console.log(LibUtils.isEmpty('')); // true
console.log(LibUtils.isEmpty([])); // true
console.log(LibUtils.isEmpty({})); // true
console.log(LibUtils.isEmpty(0)); // true
console.log(LibUtils.isEmpty(false)); // true

// Special cases
console.log(LibUtils.isEmpty(new Date())); // false (valid date)
console.log(LibUtils.isEmpty(Number.MAX_SAFE_INTEGER)); // false
console.log(LibUtils.isEmpty(new Map([['key', 'value']]))); // false

// hasValue is the opposite of isEmpty
console.log(LibUtils.hasValue('text')); // true
console.log(LibUtils.hasValue(42)); // true
console.log(LibUtils.hasValue(null)); // false

// Truthy/Falsy checking with special handling
console.log(LibUtils.isTruthy(1)); // true
console.log(LibUtils.isTruthy('text')); // true
console.log(LibUtils.isTruthy([])); // false (empty array)
console.log(LibUtils.isTruthy(new Set([1]))); // true (non-empty set)
```

#### 3. Validation Functions

```typescript
// Integer validation
console.log(LibUtils.isValidInteger(42)); // true
console.log(LibUtils.isValidInteger(3.14)); // false
console.log(LibUtils.isValidInteger(-1)); // false (must be >= 0)

// BigInt validation
console.log(LibUtils.isValidBigInt('12345678901234567890')); // true
console.log(LibUtils.isValidBigInt('12.34')); // false
console.log(LibUtils.isValidBigInt('abc')); // false

// Text ID validation (alphanumeric with - and _)
console.log(LibUtils.isValidTextId('user-123')); // true
console.log(LibUtils.isValidTextId('order_456')); // true
console.log(LibUtils.isValidTextId('invalid@id')); // false

// ID normalization
const stringId = LibUtils.normalizeIdToString(123); // "123"
const bigIntId = LibUtils.normalizeIdToString(BigInt(456)); // "456"
const alreadyString = LibUtils.normalizeIdToString('789'); // "789"
```

#### 4. Deep Equality Comparison

```typescript
// Compare complex objects
const obj1 = {
  name: 'John',
  age: 30,
  address: {
    city: 'New York',
    country: 'USA'
  },
  hobbies: ['reading', 'gaming']
};

const obj2 = {
  name: 'John',
  age: 30,
  address: {
    city: 'New York',
    country: 'USA'
  },
  hobbies: ['reading', 'gaming']
};

console.log(LibUtils.deepEqual(obj1, obj2)); // true

// Handles circular references
const circular1: any = { name: 'test' };
circular1.self = circular1;

const circular2: any = { name: 'test' };
circular2.self = circular2;

console.log(LibUtils.deepEqual(circular1, circular2)); // true
```

#### 5. Async Utilities

```typescript
// Sleep utility for delays
async function processWithDelay() {
  console.log('Starting...');
  await LibUtils.sleep(1000); // Wait 1 second
  console.log('Continued after delay');
}

// Useful in retry logic
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i < maxRetries - 1) {
        await LibUtils.sleep(delay);
      } else {
        throw error;
      }
    }
  }
  throw new Error('Should not reach here');
}
```

### LibUtils Usage Examples

#### Example 1: Entity Base Class

```typescript
abstract class Entity<T> {
  public readonly id: string;
  
  constructor(id?: string) {
    this.id = id || LibUtils.getUUID();
    if (!LibUtils.isValidUUID(this.id)) {
      throw new Error('Invalid entity ID');
    }
  }
  
  equals(other: Entity<T>): boolean {
    if (!other) return false;
    return this.id === other.id;
  }
  
  abstract toPlainObject(): T;
  
  deepEquals(other: Entity<T>): boolean {
    return LibUtils.deepEqual(
      this.toPlainObject(),
      other.toPlainObject()
    );
  }
}
```

#### Example 2: Value Object Base Class

```typescript
abstract class ValueObject<T> {
  abstract toPlainObject(): T;
  
  equals(other: ValueObject<T>): boolean {
    if (!other) return false;
    return LibUtils.deepEqual(
      this.toPlainObject(),
      other.toPlainObject()
    );
  }
  
  protected isEmpty(value: any): boolean {
    return LibUtils.isEmpty(value);
  }
  
  protected hasValue(value: any): boolean {
    return LibUtils.hasValue(value);
  }
}

// Usage
class Email extends ValueObject<{ value: string }> {
  constructor(private readonly value: string) {
    super();
    if (this.isEmpty(value)) {
      throw new Error('Email cannot be empty');
    }
  }
  
  toPlainObject() {
    return { value: this.value };
  }
}
```

#### Example 3: Repository Implementation

```typescript
class InMemoryRepository<T extends Entity<any>> {
  private items: Map<string, T> = new Map();
  
  async save(entity: T): Promise<void> {
    if (!LibUtils.isValidUUID(entity.id)) {
      throw new Error('Invalid entity ID');
    }
    this.items.set(entity.id, entity);
  }
  
  async findById(id: string): Promise<T | null> {
    // Normalize different ID types
    const normalizedId = LibUtils.normalizeIdToString(id);
    return this.items.get(normalizedId) || null;
  }
  
  async findAll(): Promise<T[]> {
    return Array.from(this.items.values());
  }
  
  async exists(id: string): Promise<boolean> {
    const normalizedId = LibUtils.normalizeIdToString(id);
    return this.items.has(normalizedId);
  }
}
```

## Part 2: SafeRun

### What is SafeRun?

SafeRun is a utility function that executes other functions safely, catching any errors and returning them in a tuple format. It's particularly useful for testing and scenarios where you want to handle errors without try-catch blocks.

### SafeRun Features

1. **Synchronous execution**: Handle sync functions safely
2. **Asynchronous execution**: Handle async functions safely
3. **Type-safe error handling**: Maintain type information for errors
4. **Tuple return pattern**: Return [error, result] tuples

### SafeRun Usage

#### Basic Usage

```typescript
// Synchronous function
const [error, result] = safeRun(() => {
  return JSON.parse('{"name": "John"}');
});

if (error) {
  console.log('Parsing failed:', error.message);
} else {
  console.log('Parsed successfully:', result);
}

// Asynchronous function
const [asyncError, asyncResult] = await safeRun(async () => {
  const response = await fetch('/api/data');
  return response.json();
});

if (asyncError) {
  console.log('Fetch failed:', asyncError.message);
} else {
  console.log('Data fetched:', asyncResult);
}
```

#### Advanced Examples

```typescript
// Example 1: Testing helper
class TestHelper {
  static async runTest<T>(
    testFn: () => T | Promise<T>
  ): Promise<{ success: boolean; result?: T; error?: Error }> {
    const [error, result] = await safeRun(testFn);
    
    return {
      success: !error,
      result,
      error
    };
  }
}

// Usage in tests
describe('OrderService', () => {
  it('should handle errors gracefully', async () => {
    const service = new OrderService();
    const { success, error } = await TestHelper.runTest(
      () => service.processOrder(invalidOrder)
    );
    
    expect(success).toBe(false);
    expect(error?.message).toContain('Invalid order');
  });
});

// Example 2: Batch operations with error collection
async function processBatch<T>(
  items: T[],
  processor: (item: T) => Promise<void>
): Promise<{ succeeded: T[]; failed: Array<{ item: T; error: Error }> }> {
  const succeeded: T[] = [];
  const failed: Array<{ item: T; error: Error }> = [];
  
  for (const item of items) {
    const [error] = await safeRun(() => processor(item));
    
    if (error) {
      failed.push({ item, error });
    } else {
      succeeded.push(item);
    }
  }
  
  return { succeeded, failed };
}

// Example 3: Graceful degradation
class DataService {
  async getData(): Promise<Data> {
    // Try primary source
    const [primaryError, primaryData] = await safeRun(
      () => this.fetchFromPrimary()
    );
    
    if (!primaryError) {
      return primaryData!;
    }
    
    // Fallback to secondary source
    const [secondaryError, secondaryData] = await safeRun(
      () => this.fetchFromSecondary()
    );
    
    if (!secondaryError) {
      return secondaryData!;
    }
    
    // Use cached data as last resort
    const [cacheError, cachedData] = safeRun(
      () => this.getFromCache()
    );
    
    if (!cacheError) {
      return cachedData!;
    }
    
    throw new Error('All data sources failed');
  }
}
```

#### Integration with Domain Patterns

```typescript
// Example 1: Safe domain event handling
class EventBus {
  async publishSafely(event: DomainEvent): Promise<void> {
    const handlers = this.getHandlersFor(event);
    
    for (const handler of handlers) {
      const [error] = await safeRun(() => handler.handle(event));
      
      if (error) {
        this.logger.error(`Handler ${handler.name} failed:`, error);
        // Continue with other handlers
      }
    }
  }
}

// Example 2: Safe specification checking
class SafeSpecificationService {
  checkSpecifications<T>(
    entity: T,
    specs: ISpecification<T>[]
  ): { 
    satisfied: ISpecification<T>[]; 
    failed: ISpecification<T>[]; 
    errors: Array<{ spec: ISpecification<T>; error: Error }> 
  } {
    const satisfied: ISpecification<T>[] = [];
    const failed: ISpecification<T>[] = [];
    const errors: Array<{ spec: ISpecification<T>; error: Error }> = [];
    
    for (const spec of specs) {
      const [error, result] = safeRun(() => spec.isSatisfiedBy(entity));
      
      if (error) {
        errors.push({ spec, error });
      } else if (result) {
        satisfied.push(spec);
      } else {
        failed.push(spec);
      }
    }
    
    return { satisfied, failed, errors };
  }
}

// Example 3: Safe repository operations
class SafeRepository<T extends Entity<any>> {
  constructor(private readonly inner: Repository<T>) {}
  
  async safeSave(entity: T): Promise<Result<void, Error>> {
    const [error] = await safeRun(() => this.inner.save(entity));
    
    if (error) {
      return Result.fail(error);
    }
    
    return Result.ok();
  }
  
  async safeFindById(id: string): Promise<Result<T | null, Error>> {
    const [error, result] = await safeRun(() => this.inner.findById(id));
    
    if (error) {
      return Result.fail(error);
    }
    
    return Result.ok(result);
  }
}
```

### LibUtils Best Practices

1. **Use appropriate empty checks**:

```typescript
// Good - use specific method for intent
if (LibUtils.isEmpty(value)) {
  // Handle empty case
}

if (LibUtils.hasValue(value)) {
  // Handle non-empty case
}

// Avoid - don't mix different concepts
if (!LibUtils.isFalsy(value)) { // Confusing
  // Handle case
}
```

2. **Validate IDs consistently**:

```typescript
// Good - validate in constructor
class UserId {
  constructor(private readonly value: string) {
    if (!LibUtils.isValidUUID(value)) {
      throw new Error('Invalid user ID');
    }
  }
}

// Good - generate if not provided
class Order {
  constructor(id?: string) {
    this.id = id || LibUtils.getUUID();
  }
}
```

3. **Use deep equality for value objects**:

```typescript
// Good - compare by value
class Money {
  equals(other: Money): boolean {
    return LibUtils.deepEqual(
      { amount: this.amount, currency: this.currency },
      { amount: other.amount, currency: other.currency }
    );
  }
}
```

### SafeRun Best Practices

1. **Prefer specific error handling in production**:

```typescript
// Good for tests
const [error, result] = safeRun(() => someOperation());

// Better for production
try {
  const result = someOperation();
  // Handle success
} catch (error) {
  // Handle specific error types
}
```

2. **Use type-safe error handling**:

```typescript
// Good - maintain error types
const [error, result] = safeRun<ValidationError, User>(() => 
  validateUser(data)
);

if (error) {
  // error is typed as ValidationError
  console.log(error.field);
}
```

3. **Don't overuse safeRun**:

```typescript
// Bad - unnecessary for simple operations
const [error, result] = safeRun(() => user.name);

// Good - use for operations that might throw
const [error, result] = safeRun(() => JSON.parse(jsonString));

// For expecting error, `result` can be omitted
```

The Utils module in DomainTS provides:

**LibUtils**:

- **Essential Utilities**: UUID generation, validation, comparison
- **Value Checking**: Comprehensive empty/truthy/falsy detection
- **Type Safety**: Proper handling of different JavaScript types
- **Domain Support**: Foundation for entities and value objects

**SafeRun**:

- **Error Safety**: Execute functions without try-catch
- **Type Preservation**: Maintain error and result types
- **Testing Support**: Simplify test error handling
- **Graceful Degradation**: Handle failures elegantly

These utilities form the backbone of many DomainTS patterns, providing reliable, type-safe operations throughout your domain implementation.
