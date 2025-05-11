# Unit of Work in DomainTS - LLM-Optimized Guide

## Document Metadata

- **Pattern Name**: Unit of Work
- **Category**: Domain-Driven Design (DDD) Pattern
- **Purpose**: Manage transaction boundaries and coordinate domain changes
- **Library**: DomainTS
- **Language**: TypeScript
- **Version**: 1.0.0

## Pattern Overview

### What is Unit of Work?

Unit of Work is a pattern that maintains a list of objects affected by a business transaction and coordinates the writing out of changes and the resolution of concurrency problems. It ensures all operations within a transaction either complete successfully or fail entirely.

**Core Concept**:
```typescript
// Start transaction
await unitOfWork.begin();

try {
  // Get repositories within transaction context
  const orderRepo = unitOfWork.getRepository<IOrderRepository>('orders');
  const inventoryRepo = unitOfWork.getRepository<IInventoryRepository>('inventory');
  
  // Make changes
  await orderRepo.save(order);
  await inventoryRepo.updateStock(productId, quantity);
  
  // Commit transaction and publish events
  await unitOfWork.commit();
} catch (error) {
  // Rollback on error
  await unitOfWork.rollback();
  throw error;
}
```

## Core Components

### IUnitOfWork Interface

Complete interface for Unit of Work pattern:

```typescript
interface IUnitOfWork {
  // Transaction control
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  
  // Repository management
  getRepository<T extends IRepository<any>>(name: string): T;
  registerRepository<T extends IRepository<any>>(name: string, repository: T): void;
  
  // Event coordination
  getEventBus(): IEventBus;
}
```

## Key Features

### 1. Transaction Management

Controls transaction boundaries:

```typescript
// Begin transaction before operations
await unitOfWork.begin();

// Commit on success
await unitOfWork.commit();

// Rollback on failure
await unitOfWork.rollback();
```

### 2. Repository Context

Provides repositories within transaction context:

```typescript
// Register repositories
unitOfWork.registerRepository('orders', orderRepository);
unitOfWork.registerRepository('customers', customerRepository);

// Get repositories for transactional operations
const orderRepo = unitOfWork.getRepository<IOrderRepository>('orders');
```

### 3. Event Publishing Coordination

Events are published only after successful commit:

```typescript
// Events collected during transaction
order.placeOrder(); // Creates domain events

// Events published after commit
await unitOfWork.commit(); // Events dispatched here
```

## Usage Patterns

### Basic Transaction Flow

```typescript
class OrderService {
  constructor(private readonly unitOfWork: IUnitOfWork) {}
  
  async processOrder(orderId: string): Promise<void> {
    await this.unitOfWork.begin();
    
    try {
      const orderRepo = this.unitOfWork.getRepository<IOrderRepository>('orders');
      const paymentRepo = this.unitOfWork.getRepository<IPaymentRepository>('payments');
      
      const order = await orderRepo.findById(orderId);
      const payment = await paymentRepo.processPayment(order);
      
      order.confirmPayment(payment.id);
      await orderRepo.save(order);
      
      await this.unitOfWork.commit();
    } catch (error) {
      await this.unitOfWork.rollback();
      throw new Error(`Order processing failed: ${error.message}`);
    }
  }
}
```

### Cross-Aggregate Operations

```typescript
class TransferService {
  constructor(private readonly unitOfWork: IUnitOfWork) {}
  
  async transferItems(fromOrderId: string, toOrderId: string, itemId: string): Promise<void> {
    await this.unitOfWork.begin();
    
    try {
      const orderRepo = this.unitOfWork.getRepository<IOrderRepository>('orders');
      
      const fromOrder = await orderRepo.findById(fromOrderId);
      const toOrder = await orderRepo.findById(toOrderId);
      
      // Cross-aggregate operation
      const item = fromOrder.removeItem(itemId);
      toOrder.addItem(item);
      
      // Save both aggregates in same transaction
      await orderRepo.save(fromOrder);
      await orderRepo.save(toOrder);
      
      await this.unitOfWork.commit();
    } catch (error) {
      await this.unitOfWork.rollback();
      throw error;
    }
  }
}
```

### Event Coordination

```typescript
class OrderPlacementService {
  constructor(private readonly unitOfWork: IUnitOfWork) {}
  
  async placeOrder(orderData: OrderData): Promise<void> {
    await this.unitOfWork.begin();
    
    try {
      const orderRepo = this.unitOfWork.getRepository<IOrderRepository>('orders');
      const inventoryRepo = this.unitOfWork.getRepository<IInventoryRepository>('inventory');
      
      // Create order (generates OrderPlacedEvent)
      const order = Order.create(orderData);
      await orderRepo.save(order);
      
      // Update inventory
      for (const item of order.items) {
        await inventoryRepo.reserveStock(item.productId, item.quantity);
      }
      
      // Events are published only after successful commit
      await this.unitOfWork.commit();
      // OrderPlacedEvent is now published to event bus
      
    } catch (error) {
      await this.unitOfWork.rollback();
      // No events are published on rollback
      throw error;
    }
  }
}
```

## Integration with DomainTS

Unit of Work integrates with:

- **Repositories**: Manages repository access within transactions
- **Aggregates**: Coordinates changes across multiple aggregates
- **Domain Events**: Ensures events are published after successful commit
- **Event Bus**: Provides access to event publishing mechanism

### Repository Integration

The base repository class handles event coordination, so concrete repositories don't need to manage the event bus directly:

```typescript
// Base repository handles event publishing (handled internally by framework)
abstract class BaseRepository<T extends IAggregateRoot> implements IRepository<T> {
  // Event bus is managed internally, not exposed to derived classes
  
  abstract findById(id: any): Promise<T | null>;
  abstract save(aggregate: T): Promise<void>;
}

// Concrete repository focuses on persistence logic only
class OrderRepository extends BaseRepository<Order> {
  constructor(private readonly db: DatabaseConnection) {
    super();
  }
  
  async findById(id: string): Promise<Order | null> {
    const data = await this.db.orders.findOne({ id });
    return data ? OrderMapper.toDomain(data) : null;
  }
  
  async save(order: Order): Promise<void> {
    // Just handle persistence
    await this.db.orders.save(OrderMapper.toPersistence(order));
    
    // Event handling is done by the base class automatically
    // No need to manually publish events or call commit()
  }
}
```

The Unit of Work coordinates with the base repository class to ensure events are published after successful transaction commit.

## Best Practices

### 1. Keep Transactions Short

```typescript
// Good - focused transaction
async updateOrderStatus(orderId: string, status: OrderStatus) {
  await this.unitOfWork.begin();
  try {
    const orderRepo = this.unitOfWork.getRepository<IOrderRepository>('orders');
    const order = await orderRepo.findById(orderId);
    order.updateStatus(status);
    await orderRepo.save(order);
    await this.unitOfWork.commit();
  } catch (error) {
    await this.unitOfWork.rollback();
    throw error;
  }
}

// Bad - transaction doing too much
async processEntireWorkflow(orderId: string) {
  await this.unitOfWork.begin();
  // ... many operations across multiple aggregates
}
```

### 2. Handle Errors Properly

```typescript
async executeTransaction<T>(operation: () => Promise<T>): Promise<T> {
  await this.unitOfWork.begin();
  
  try {
    const result = await operation();
    await this.unitOfWork.commit();
    return result;
  } catch (error) {
    await this.unitOfWork.rollback();
    
    // Log error details
    logger.error('Transaction failed', {
      error: error.message,
      stack: error.stack
    });
    
    throw error;
  }
}
```

### 3. Don't Nest Transactions

```typescript
// Bad - nested transactions
async outerOperation() {
  await this.unitOfWork.begin();
  await this.innerOperation(); // This also calls begin()
  await this.unitOfWork.commit();
}

// Good - use single transaction
async combinedOperation() {
  await this.unitOfWork.begin();
  // All operations in single transaction
  await this.unitOfWork.commit();
}
```

### 4. Register Repositories Early

```typescript
// Register all repositories during app initialization
const unitOfWork = new UnitOfWork(eventBus);
unitOfWork.registerRepository('orders', orderRepository);
unitOfWork.registerRepository('customers', customerRepository);
unitOfWork.registerRepository('payments', paymentRepository);

// Use in services
class DomainService {
  constructor(private readonly unitOfWork: IUnitOfWork) {}
  
  async operation() {
    // Repositories already registered
    const orderRepo = this.unitOfWork.getRepository<IOrderRepository>('orders');
  }
}
```

## Example: E-commerce Transaction

```typescript
class CheckoutService {
  constructor(private readonly unitOfWork: IUnitOfWork) {}
  
  async checkout(cartId: string, paymentInfo: PaymentInfo): Promise<Order> {
    await this.unitOfWork.begin();
    
    try {
      // Get repositories
      const cartRepo = this.unitOfWork.getRepository<ICartRepository>('carts');
      const orderRepo = this.unitOfWork.getRepository<IOrderRepository>('orders');
      const inventoryRepo = this.unitOfWork.getRepository<IInventoryRepository>('inventory');
      const paymentRepo = this.unitOfWork.getRepository<IPaymentRepository>('payments');
      
      // Load cart
      const cart = await cartRepo.findById(cartId);
      if (!cart) {
        throw new Error('Cart not found');
      }
      
      // Create order from cart
      const order = Order.createFromCart(cart);
      
      // Reserve inventory
      for (const item of order.items) {
        const reserved = await inventoryRepo.reserveStock(
          item.productId, 
          item.quantity
        );
        if (!reserved) {
          throw new Error(`Insufficient stock for ${item.productId}`);
        }
      }
      
      // Process payment
      const payment = await paymentRepo.processPayment(
        order.totalAmount,
        paymentInfo
      );
      
      // Update order with payment
      order.confirmPayment(payment.id);
      
      // Save order
      await orderRepo.save(order);
      
      // Clear cart
      cart.clear();
      await cartRepo.save(cart);
      
      // Commit transaction - this will:
      // 1. Persist all changes to database
      // 2. Publish all domain events
      await this.unitOfWork.commit();
      
      return order;
      
    } catch (error) {
      // Rollback on any error
      await this.unitOfWork.rollback();
      
      // Handle specific errors
      if (error.message.includes('Insufficient stock')) {
        throw new InsufficientStockError(error.message);
      }
      if (error.message.includes('Payment failed')) {
        throw new PaymentFailedError(error.message);
      }
      
      throw error;
    }
  }
}
```

## Common Pitfalls and Solutions

1. **Forgetting to Rollback**
   - Always use try-catch-finally pattern
   - Consider creating a transaction helper method

2. **Long-Running Transactions**
   - Keep transactions focused and short
   - Move non-transactional operations outside transaction

3. **Event Publishing Issues**
   - Events should only be published after commit
   - The framework handles this automatically through base repository

4. **Repository Registration**
   - Register all repositories before use
   - Consider dependency injection for setup

## Conclusion

Unit of Work in DomainTS provides:

- **Transaction Management**: Atomic operations across aggregates
- **Consistency Guarantee**: All-or-nothing persistence
- **Event Coordination**: Publish events after successful commit
- **Repository Context**: Transactional access to repositories
- **Clean Architecture**: Separation of concerns

The pattern ensures data consistency while coordinating complex domain operations involving multiple aggregates and domain events. The framework handles event publication automatically through the base repository class, allowing concrete repositories to focus purely on persistence logic.
