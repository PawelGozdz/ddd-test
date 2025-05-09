/**
 * Domain Services - Testy End-to-End (Refaktoryzacja)
 *
 * Ten plik zawiera testy end-to-end dla modułu serwisów domenowych.
 * W przeciwieństwie do testów jednostkowych, te testy używają rzeczywistych implementacji
 * wszystkich komponentów, bez mocków, symulując rzeczywisty przepływ biznesowy.
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  IRepository,
  IEventBus,
  IDomainEvent,
  IAggregateRoot,
  AggregateRoot,
  EntityId,
  EventBusBuilder,
  IUnitOfWork,
} from '../core';

import { safeRun } from '../utils';
import { DomainServiceContainer } from './domain-service-container';
import { ServiceRegistryBuilder } from './service-registry-builder';
import { DomainService } from './domain-service.decorator';
import {
  EventAwareDomainService,
  IBaseDomainService,
  UnitOfWorkAwareDomainService,
} from './base-domain-service';
import { IAsyncDomainService } from './domain-service.interface';
import { ServiceCircularError } from './service.errors';

// #############################################################################
// # IMPLEMENTACJE DOMENY
// #############################################################################

// Events
class DomainEventBase implements IDomainEvent {
  readonly eventId: string;
  readonly occurredOn: Date;
  readonly version: number;
  readonly eventType: string;

  constructor() {
    this.eventId = crypto.randomUUID();
    this.occurredOn = new Date();
    this.version = 1;
  }
}

class ProductCreatedEvent extends DomainEventBase {
  readonly eventType = ProductCreatedEvent.name;

  constructor(
    public readonly productId: string,
    public readonly name: string,
    public readonly price: number,
  ) {
    super();
  }
}

class CustomerRegisteredEvent extends DomainEventBase {
  readonly eventType = CustomerRegisteredEvent.name;

  constructor(
    public readonly customerId: string,
    public readonly email: string,
  ) {
    super();
  }
}

class OrderCreatedEvent extends DomainEventBase {
  readonly eventType = OrderCreatedEvent.name;

  constructor(
    public readonly orderId: string,
    public readonly customerId: string,
    public readonly items: Array<{ productId: string; quantity: number }>,
  ) {
    super();
  }
}

class OrderConfirmedEvent extends DomainEventBase {
  readonly eventType = OrderConfirmedEvent.name;

  constructor(
    public readonly orderId: string,
    public readonly customerId: string,
  ) {
    super();
  }
}

class OrderShippedEvent extends DomainEventBase {
  readonly eventType = OrderShippedEvent.name;

  constructor(
    public readonly orderId: string,
    public readonly customerId: string,
    public readonly shippingCode: string,
  ) {
    super();
  }
}

class CustomerNotifiedEvent extends DomainEventBase {
  readonly eventType = CustomerNotifiedEvent.name;

  constructor(
    public readonly customerId: string,
    public readonly message: string,
  ) {
    super();
  }
}

// Agregaty
class Product extends AggregateRoot {
  private _name: string;
  private _price: number;
  private _inStock: number;

  private constructor(
    id: EntityId,
    name: string,
    price: number,
    inStock: number = 0,
  ) {
    super({ id, version: 0 });
    this._name = name;
    this._price = price;
    this._inStock = inStock;
  }

  static create(id: EntityId, name: string, price: number): Product {
    const product = new Product(id, name, price);
    product.apply(new ProductCreatedEvent(id.toString(), name, price));
    return product;
  }

  get name(): string {
    return this._name;
  }

  get price(): number {
    return this._price;
  }

  get inStock(): number {
    return this._inStock;
  }

  addStock(quantity: number): void {
    if (quantity <= 0) {
      throw new Error('Quantity must be positive');
    }
    this._inStock += quantity;
  }

  removeFromStock(quantity: number): void {
    if (quantity <= 0) {
      throw new Error('Quantity must be positive');
    }

    if (quantity > this._inStock) {
      throw new Error('Not enough items in stock');
    }

    this._inStock -= quantity;
  }
}

class Customer extends AggregateRoot {
  private _email: string;
  private _name: string;

  private constructor(id: EntityId, email: string, name: string) {
    super({ id });
    this._email = email;
    this._name = name;
  }

  static register(id: EntityId, email: string, name: string): Customer {
    const customer = new Customer(id, email, name);
    customer.apply(new CustomerRegisteredEvent(id.toString(), email));
    return customer;
  }

  get email(): string {
    return this._email;
  }

  get name(): string {
    return this._name;
  }
}

interface OrderItem {
  productId: EntityId;
  quantity: number;
  price: number;
}

enum OrderStatus {
  Created = 'created',
  Confirmed = 'confirmed',
  Shipped = 'shipped',
  Delivered = 'delivered',
  Cancelled = 'cancelled',
}

class Order extends AggregateRoot {
  private _customerId: EntityId;
  private _items: OrderItem[] = [];
  private _status: OrderStatus = OrderStatus.Created;
  private _shippingCode?: string;

  private constructor(id: EntityId, customerId: EntityId) {
    super({ id });
    this._customerId = customerId;
  }

  static create(id: EntityId, customerId: EntityId): Order {
    const order = new Order(id, customerId);
    order.apply(
      new OrderCreatedEvent(id.toString(), customerId.toString(), []),
    );
    return order;
  }

  get customerId(): EntityId {
    return this._customerId;
  }

  get items(): OrderItem[] {
    return [...this._items];
  }

  get status(): OrderStatus {
    return this._status;
  }

  get shippingCode(): string | undefined {
    return this._shippingCode;
  }

  get totalAmount(): number {
    return this._items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
  }

  addItem(productId: EntityId, quantity: number, price: number): void {
    if (this._status !== OrderStatus.Created) {
      throw new Error(
        'Cannot add items to an order that is not in Created status',
      );
    }

    if (quantity <= 0) {
      throw new Error('Quantity must be positive');
    }

    const existingItem = this._items.find((item) =>
      item.productId.equals(productId),
    );
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      this._items.push({ productId, quantity, price });
    }
  }

  confirm(): void {
    if (this._status !== OrderStatus.Created) {
      throw new Error('Cannot confirm an order that is not in Created status');
    }

    if (this._items.length === 0) {
      throw new Error('Cannot confirm an empty order');
    }

    this._status = OrderStatus.Confirmed;
    this.apply(
      new OrderConfirmedEvent(
        this.getId().toString(),
        this._customerId.toString(),
      ),
    );
  }

  ship(shippingCode: string): void {
    if (this._status !== OrderStatus.Confirmed) {
      throw new Error('Cannot ship an order that is not in Confirmed status');
    }

    this._status = OrderStatus.Shipped;
    this._shippingCode = shippingCode;
    this.apply(
      new OrderShippedEvent(
        this.getId().toString(),
        this._customerId.toString(),
        shippingCode,
      ),
    );
  }

  markAsDelivered(): void {
    if (this._status !== OrderStatus.Shipped) {
      throw new Error(
        'Cannot mark as delivered an order that is not in Shipped status',
      );
    }

    this._status = OrderStatus.Delivered;
  }

  cancel(): void {
    if (
      this._status !== OrderStatus.Created &&
      this._status !== OrderStatus.Confirmed
    ) {
      throw new Error(
        'Cannot cancel an order that is not in Created or Confirmed status',
      );
    }

    this._status = OrderStatus.Cancelled;
  }
}

// Implementacja InMemoryRepository
class InMemoryRepository<T extends IAggregateRoot<any>>
  implements IRepository<T>
{
  protected items: Map<string, T> = new Map();

  async findById(id: any): Promise<T | null> {
    const key = id.toString();
    return this.items.get(key) || null;
  }

  async save(aggregate: T): Promise<void> {
    const key = aggregate.getId().toString();
    this.items.set(key, aggregate);
  }

  async delete(aggregate: T): Promise<void> {
    const key = aggregate.getId().toString();
    this.items.delete(key);
  }

  async findAll(): Promise<T[]> {
    return Array.from(this.items.values());
  }
}

// Implementacje repozytoriów
class ProductRepository extends InMemoryRepository<Product> {}
class CustomerRepository extends InMemoryRepository<Customer> {}
class OrderRepository extends InMemoryRepository<Order> {}

// Implementacja UnitOfWork
class InMemoryUnitOfWork implements IUnitOfWork {
  private eventBus: IEventBus;
  private repositories: Map<string, IRepository<any>> = new Map();
  private isTransactionActive = false;
  private pendingEvents: IDomainEvent[] = [];

  constructor(eventBus: IEventBus) {
    this.eventBus = eventBus;
  }

  async begin(): Promise<void> {
    if (this.isTransactionActive) {
      throw new Error('Transaction already active');
    }
    this.isTransactionActive = true;
    this.pendingEvents = [];
  }

  async commit(): Promise<void> {
    if (!this.isTransactionActive) {
      throw new Error('No active transaction');
    }

    // Publikuj wszystkie zdarzenia
    this.pendingEvents.forEach((event) => {
      this.eventBus.publish(event);
    });

    this.pendingEvents = [];
    this.isTransactionActive = false;
  }

  async rollback(): Promise<void> {
    if (!this.isTransactionActive) {
      throw new Error('No active transaction');
    }

    this.pendingEvents = [];
    this.isTransactionActive = false;
  }

  getRepository<T extends IRepository<any>>(name: string): T {
    const repo = this.repositories.get(name);
    if (!repo) {
      throw new Error(`Repository '${name}' not registered`);
    }
    return repo as T;
  }

  registerRepository<T extends IRepository<any>>(
    name: string,
    repository: T,
  ): void {
    this.repositories.set(name, repository);
  }

  getEventBus(): IEventBus {
    return this.eventBus;
  }

  collectEvents(aggregate: IAggregateRoot<any>): void {
    const events = aggregate.getDomainEvents();
    this.pendingEvents.push(...events);
    aggregate.commit();
  }
}

// #############################################################################
// # IMPLEMENTACJE SERWISÓW DOMENOWYCH
// #############################################################################

@DomainService('product-service')
class ProductService extends UnitOfWorkAwareDomainService {
  constructor() {
    super('product-service');
  }

  async createProduct(name: string, price: number): Promise<Product> {
    if (!this.unitOfWork) {
      throw new Error('Unit of Work not set');
    }

    const productRepo =
      this.unitOfWork.getRepository<ProductRepository>('productRepository');

    return this.executeInTransaction(async () => {
      const productId = EntityId.createWithRandomUUID();
      const product = Product.create(productId, name, price);

      await productRepo.save(product);
      this.collectEvents(product);

      return product;
    });
  }

  async addProductStock(
    productId: EntityId,
    quantity: number,
  ): Promise<Product> {
    if (!this.unitOfWork) {
      throw new Error('Unit of Work not set');
    }

    const productRepo =
      this.unitOfWork.getRepository<ProductRepository>('productRepository');

    return this.executeInTransaction(async () => {
      const product = await productRepo.findById(productId);
      if (!product) {
        throw new Error(`Product with ID ${productId.toString()} not found`);
      }

      product.addStock(quantity);
      await productRepo.save(product);
      this.collectEvents(product);

      return product;
    });
  }

  async getAllProducts(): Promise<Product[]> {
    if (!this.unitOfWork) {
      throw new Error('Unit of Work not set');
    }

    const productRepo =
      this.unitOfWork.getRepository<ProductRepository>('productRepository');
    return productRepo.findAll();
  }

  private collectEvents(aggregate: IAggregateRoot<any>): void {
    (this.unitOfWork as InMemoryUnitOfWork).collectEvents(aggregate);
  }
}

@DomainService('customer-service')
class CustomerService extends UnitOfWorkAwareDomainService {
  constructor() {
    super('customer-service');
  }

  async registerCustomer(email: string, name: string): Promise<Customer> {
    if (!this.unitOfWork) {
      throw new Error('Unit of Work not set');
    }

    const customerRepo =
      this.unitOfWork.getRepository<CustomerRepository>('customerRepository');

    return this.executeInTransaction(async () => {
      const customerId = EntityId.createWithRandomUUID();
      const customer = Customer.register(customerId, email, name);

      await customerRepo.save(customer);
      this.collectEvents(customer);

      return customer;
    });
  }

  private collectEvents(aggregate: IAggregateRoot<any>): void {
    (this.unitOfWork as InMemoryUnitOfWork).collectEvents(aggregate);
  }
}

@DomainService('order-service')
class OrderService extends UnitOfWorkAwareDomainService {
  constructor() {
    super('order-service');
  }

  async createOrder(customerId: EntityId): Promise<Order> {
    if (!this.unitOfWork) {
      throw new Error('Unit of Work not set');
    }

    const orderRepo =
      this.unitOfWork.getRepository<OrderRepository>('orderRepository');
    const customerRepo =
      this.unitOfWork.getRepository<CustomerRepository>('customerRepository');

    return this.executeInTransaction(async () => {
      const customer = await customerRepo.findById(customerId);
      if (!customer) {
        throw new Error(`Customer with ID ${customerId.toString()} not found`);
      }

      const orderId = EntityId.createWithRandomUUID();
      const order = Order.create(orderId, customerId);

      await orderRepo.save(order);
      this.collectEvents(order);

      return order;
    });
  }

  async addOrderItem(
    orderId: EntityId,
    productId: EntityId,
    quantity: number,
  ): Promise<Order> {
    if (!this.unitOfWork) {
      throw new Error('Unit of Work not set');
    }

    const orderRepo =
      this.unitOfWork.getRepository<OrderRepository>('orderRepository');
    const productRepo =
      this.unitOfWork.getRepository<ProductRepository>('productRepository');

    return this.executeInTransaction(async () => {
      const order = await orderRepo.findById(orderId);
      if (!order) {
        throw new Error(`Order with ID ${orderId.toString()} not found`);
      }

      const product = await productRepo.findById(productId);
      if (!product) {
        throw new Error(`Product with ID ${productId.toString()} not found`);
      }

      if (product.inStock < quantity) {
        throw new Error(`Not enough ${product.name} in stock`);
      }

      order.addItem(productId, quantity, product.price);
      product.removeFromStock(quantity);

      await orderRepo.save(order);
      await productRepo.save(product);

      this.collectEvents(order);
      this.collectEvents(product);

      return order;
    });
  }

  async confirmOrder(orderId: EntityId): Promise<Order> {
    if (!this.unitOfWork) {
      throw new Error('Unit of Work not set');
    }

    const orderRepo =
      this.unitOfWork.getRepository<OrderRepository>('orderRepository');

    return this.executeInTransaction(async () => {
      const order = await orderRepo.findById(orderId);
      if (!order) {
        throw new Error(`Order with ID ${orderId.toString()} not found`);
      }
      order.confirm();
      await orderRepo.save(order);
      this.collectEvents(order);
      return order;
    });
  }

  async shipOrder(orderId: EntityId): Promise<Order> {
    if (!this.unitOfWork) {
      throw new Error('Unit of Work not set');
    }

    const orderRepo =
      this.unitOfWork.getRepository<OrderRepository>('orderRepository');

    return this.executeInTransaction(async () => {
      const order = await orderRepo.findById(orderId);
      if (!order) {
        throw new Error(`Order with ID ${orderId.toString()} not found`);
      }

      const shippingCode = `SHP-${Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, '0')}`;
      order.ship(shippingCode);
      await orderRepo.save(order);
      this.collectEvents(order);

      return order;
    });
  }

  private collectEvents(aggregate: IAggregateRoot<any>): void {
    (this.unitOfWork as InMemoryUnitOfWork).collectEvents(aggregate);
  }
}

@DomainService('notification-service')
class NotificationService
  extends EventAwareDomainService
  implements IAsyncDomainService
{
  private sentNotifications: CustomerNotifiedEvent[] = [];

  constructor() {
    super('notification-service');
  }

  async initialize(): Promise<void> {
    if (!this.eventBus) {
      throw new Error('Event bus not set');
    }

    this.eventBus.subscribe<OrderConfirmedEvent>(OrderConfirmedEvent, (event) =>
      this.handleOrderConfirmedEvent(event),
    );

    this.eventBus.subscribe<OrderShippedEvent>(OrderShippedEvent, (event) =>
      this.handleOrderShippedEvent(event),
    );
  }

  private handleOrderConfirmedEvent(event: OrderConfirmedEvent): void {
    const message = `Order ${event.orderId} has been confirmed`;
    this.notifyCustomer(new EntityId(event.customerId, 'uuid'), message);
  }

  private handleOrderShippedEvent(event: OrderShippedEvent): void {
    const message = `Order ${event.orderId} has been shipped with tracking code: ${event.shippingCode}`;
    this.notifyCustomer(new EntityId(event.customerId, 'uuid'), message);
  }

  notifyCustomer(customerId: EntityId, message: string): void {
    if (!this.eventBus) {
      throw new Error('Event bus not set');
    }

    const notificationEvent = new CustomerNotifiedEvent(
      customerId.toString(),
      message,
    );
    this.sentNotifications.push(notificationEvent);
    this.publishEvent(notificationEvent);
  }

  getSentNotifications(): CustomerNotifiedEvent[] {
    return [...this.sentNotifications];
  }
}

// #############################################################################
// # TESTY END-TO-END
// #############################################################################

describe('Domain Services - End-to-End Tests', () => {
  let eventBus: IEventBus;
  let unitOfWork: InMemoryUnitOfWork;
  let container: DomainServiceContainer;

  let productService: ProductService;
  let customerService: CustomerService;
  let orderService: OrderService;
  let notificationService: NotificationService;

  beforeEach(async () => {
    // Arrange: Inicjalizacja infrastruktury
    eventBus = EventBusBuilder.create().build();
    unitOfWork = new InMemoryUnitOfWork(eventBus);

    // Arrange: Inicjalizacja repozytoriów
    const productRepo = new ProductRepository();
    const customerRepo = new CustomerRepository();
    const orderRepo = new OrderRepository();

    unitOfWork.registerRepository('productRepository', productRepo);
    unitOfWork.registerRepository('customerRepository', customerRepo);
    unitOfWork.registerRepository('orderRepository', orderRepo);

    // Arrange: Inicjalizacja kontenera serwisów
    container = new DomainServiceContainer(
      undefined,
      eventBus,
      () => unitOfWork,
    );

    // Arrange: Rejestracja serwisów
    container.registerFactory('product-service', () => new ProductService());
    container.registerFactory('customer-service', () => new CustomerService());
    container.registerFactory('order-service', () => new OrderService());
    container.registerFactory(
      'notification-service',
      () => new NotificationService(),
    );

    // Arrange: Inicjalizacja serwisów
    await container.initializeServices();

    productService = container.getService<ProductService>('product-service')!;
    customerService =
      container.getService<CustomerService>('customer-service')!;
    orderService = container.getService<OrderService>('order-service')!;
    notificationService = container.getService<NotificationService>(
      'notification-service',
    )!;
  });

  describe('Full Business Flow', () => {
    it('should handle complete order process from product creation to shipment', async () => {
      // Arrange
      const productName1 = 'Laptop Pro X1';
      const productPrice1 = 2499.99;
      const productStock1 = 10;

      const productName2 = 'Wireless Mouse';
      const productPrice2 = 59.99;
      const productStock2 = 50;

      const customerEmail = 'john.doe@example.com';
      const customerName = 'John Doe';

      const orderQuantity1 = 1;
      const orderQuantity2 = 2;

      // Act: Create products
      const laptop = await productService.createProduct(
        productName1,
        productPrice1,
      );
      const mouse = await productService.createProduct(
        productName2,
        productPrice2,
      );

      // Act: Add stock to products
      await productService.addProductStock(laptop.getId(), productStock1);
      await productService.addProductStock(mouse.getId(), productStock2);

      // Act: Register customer
      const customer = await customerService.registerCustomer(
        customerEmail,
        customerName,
      );

      // Act: Create order
      const order = await orderService.createOrder(customer.getId());

      // Act: Add items to order
      await orderService.addOrderItem(
        order.getId(),
        laptop.getId(),
        orderQuantity1,
      );
      await orderService.addOrderItem(
        order.getId(),
        mouse.getId(),
        orderQuantity2,
      );

      // Act: Confirm order
      const confirmedOrder = await orderService.confirmOrder(order.getId());
      const confirmedOrderStatus = confirmedOrder.status;

      // Act: Ship order
      const shippedOrder = await orderService.shipOrder(order.getId());

      // Act: Get updated products
      const allProducts = await productService.getAllProducts();
      const updatedLaptop = allProducts.find((p) =>
        p.getId().equals(laptop.getId()),
      )!;
      const updatedMouse = allProducts.find((p) =>
        p.getId().equals(mouse.getId()),
      )!;

      // Assert: Product stock changes
      expect(updatedLaptop.inStock).toBe(productStock1 - orderQuantity1); // 9
      expect(updatedMouse.inStock).toBe(productStock2 - orderQuantity2); // 48

      // Assert: Order status
      expect(confirmedOrderStatus).toBe(OrderStatus.Confirmed);
      expect(shippedOrder.status).toBe(OrderStatus.Shipped);
      expect(shippedOrder.shippingCode).toBeDefined();
      expect(shippedOrder.shippingCode?.startsWith('SHP-')).toBe(true);

      // Assert: Order total amount
      const expectedTotal =
        productPrice1 * orderQuantity1 + productPrice2 * orderQuantity2;
      expect(shippedOrder.totalAmount).toBe(expectedTotal);

      // Assert: Notifications
      const notifications = notificationService.getSentNotifications();
      expect(notifications.length).toBe(2);

      const confirmationNotification = notifications[0];
      expect(confirmationNotification.customerId).toBe(
        customer.getId().toString(),
      );
      expect(confirmationNotification.message).toContain('has been confirmed');
      expect(confirmationNotification.message).toContain(
        order.getId().toString(),
      );

      const shippingNotification = notifications[1];
      expect(shippingNotification.customerId).toBe(customer.getId().toString());
      expect(shippingNotification.message).toContain('has been shipped');
      expect(shippingNotification.message).toContain(
        shippedOrder.shippingCode!,
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle insufficient product stock', async () => {
      // Arrange
      const productName = 'Limited Edition Watch';
      const productPrice = 1299.99;
      const initialStock = 1;
      const requestedQuantity = 2;

      const customerEmail = 'jane.smith@example.com';
      const customerName = 'Jane Smith';

      // Act: Create product with limited stock
      const watch = await productService.createProduct(
        productName,
        productPrice,
      );
      await productService.addProductStock(watch.getId(), initialStock);

      // Act: Register customer
      const customer = await customerService.registerCustomer(
        customerEmail,
        customerName,
      );

      // Act: Create order
      const order = await orderService.createOrder(customer.getId());

      // Act & Assert: Try to add more items than available
      const [error] = await safeRun(() =>
        orderService.addOrderItem(
          order.getId(),
          watch.getId(),
          requestedQuantity,
        ),
      );

      expect(error.message).toBe(`Not enough ${productName} in stock`);

      // Assert: Product stock remains unchanged
      const allProducts = await productService.getAllProducts();
      const unchangedWatch = allProducts.find((p) =>
        p.getId().equals(watch.getId()),
      )!;
      expect(unchangedWatch.inStock).toBe(initialStock);
    });

    it('should not allow confirming empty orders', async () => {
      // Arrange
      const customerEmail = 'empty@order.com';
      const customerName = 'Empty Order';

      // Act: Register customer and create empty order
      const customer = await customerService.registerCustomer(
        customerEmail,
        customerName,
      );
      const order = await orderService.createOrder(customer.getId());

      // Act & Assert: Try to confirm empty order
      const [error] = await safeRun(() =>
        orderService.confirmOrder(order.getId()),
      );

      expect(error.message).toBe('Cannot confirm an empty order');

      // Assert: Order status remains 'Created'
      const unchangedOrder = (await productService.getAllProducts()) as any[]; // Get from service for test coverage
      expect(order.status).toBe(OrderStatus.Created);
    });

    it('should not allow shipping non-confirmed orders', async () => {
      // Arrange
      const productName = 'Gaming Console';
      const productPrice = 499.99;
      const productStock = 5;

      const customerEmail = 'gamer@test.com';
      const customerName = 'Pro Gamer';

      // Act: Create product and customer
      const console = await productService.createProduct(
        productName,
        productPrice,
      );
      await productService.addProductStock(console.getId(), productStock);
      const customer = await customerService.registerCustomer(
        customerEmail,
        customerName,
      );

      // Act: Create order with item but don't confirm
      const order = await orderService.createOrder(customer.getId());
      await orderService.addOrderItem(order.getId(), console.getId(), 1);

      // Act & Assert: Try to ship non-confirmed order
      const [error] = await safeRun(() =>
        orderService.shipOrder(order.getId()),
      );

      expect(error.message).toBe(
        'Cannot ship an order that is not in Confirmed status',
      );

      // Assert: Order remains in 'Created' status
      expect(order.status).toBe(OrderStatus.Created);
      expect(order.shippingCode).toBeUndefined();
    });
  });

  describe('Service Registry Builder', () => {
    it('should configure services using fluent API', async () => {
      // Arrange
      const productRepo = new ProductRepository();
      const customerRepo = new CustomerRepository();
      const orderRepo = new OrderRepository();

      unitOfWork.registerRepository('productRepository', productRepo);
      unitOfWork.registerRepository('customerRepository', customerRepo);
      unitOfWork.registerRepository('orderRepository', orderRepo);

      // Act: Configure services using builder
      const registryBuilder = new ServiceRegistryBuilder()
        .withEventBus(eventBus)
        .withUnitOfWork(unitOfWork);

      const productServiceB = await registryBuilder
        .service('product-service', () => new ProductService())
        .buildAndRegister();

      const customerServiceB = await registryBuilder
        .service('customer-service', () => new CustomerService())
        .buildAndRegister();

      const orderServiceB = await registryBuilder
        .service('order-service', () => new OrderService())
        .buildAndRegister();

      const notificationServiceB = await registryBuilder
        .service('notification-service', () => new NotificationService())
        .withAsyncInitialization()
        .buildAndRegister();

      // Act: Execute business flow
      const laptop = await productServiceB.createProduct('Test Laptop', 999.99);
      await productServiceB.addProductStock(laptop.getId(), 3);

      const customer = await customerServiceB.registerCustomer(
        'test@builder.com',
        'Builder Test',
      );
      const order = await orderServiceB.createOrder(customer.getId());
      await orderServiceB.addOrderItem(order.getId(), laptop.getId(), 1);
      await orderServiceB.confirmOrder(order.getId());
      await orderServiceB.shipOrder(order.getId());

      // Assert: Services are properly configured
      expect(productServiceB['eventBus']).toBeDefined();
      expect(productServiceB['unitOfWork']).toBeDefined();

      expect(customerServiceB['eventBus']).toBeDefined();
      expect(customerServiceB['unitOfWork']).toBeDefined();

      expect(orderServiceB['eventBus']).toBeDefined();
      expect(orderServiceB['unitOfWork']).toBeDefined();

      expect(notificationServiceB['eventBus']).toBeDefined();

      // Assert: Notifications received
      const notifications = notificationServiceB.getSentNotifications();
      expect(notifications.length).toBe(2);

      // Assert: Notification content
      expect(notifications[0].message).toContain('has been confirmed');
      expect(notifications[1].message).toContain('has been shipped');
      expect(notifications[1].message).toContain('tracking code');
    });
  });

  describe('Service Container Dependencies', () => {
    it('should properly resolve service dependencies', async () => {
      // Arrange
      const complexRegistry = new ServiceRegistryBuilder();
      const complexContainer = new DomainServiceContainer(
        complexRegistry.build(),
        eventBus,
        () => unitOfWork,
      );

      // Arrange: Register services with dependencies
      complexContainer.registerFactory(
        'infrastructure',
        () => new InfrastructureService(),
      );
      complexContainer.registerFactory(
        'domain-validation',
        () => new DomainValidationService(),
        ['infrastructure'],
      );
      complexContainer.registerFactory(
        'order-processor',
        () => new OrderProcessingService(),
        ['domain-validation', 'infrastructure'],
      );

      // Act: Initialize services
      await complexContainer.initializeServices();

      // Assert: Services are properly initialized
      const infrastructureService =
        complexContainer.getService('infrastructure');
      const validationService =
        complexContainer.getService('domain-validation');
      const processorService = complexContainer.getService('order-processor');

      expect(infrastructureService).toBeDefined();
      expect(validationService).toBeDefined();
      expect(processorService).toBeDefined();
    });

    it('should detect circular dependencies', async () => {
      // Arrange
      const circularContainer = new DomainServiceContainer();

      // Act & Assert: Register services with circular dependencies
      circularContainer.registerFactory('service-a', () => new ServiceA(), [
        'service-b',
      ]);
      circularContainer.registerFactory('service-b', () => new ServiceB(), [
        'service-c',
      ]);
      circularContainer.registerFactory('service-c', () => new ServiceC(), [
        'service-a',
      ]);

      const [error] = await safeRun(() =>
        circularContainer.initializeServices(),
      );

      expect(error).toBeInstanceOf(ServiceCircularError);
    });
  });

  // describe('Transactional Consistency', () => {
  //   it('should maintain transactional consistency across multiple aggregates', async () => {
  //     // Arrange
  //     const accountBalance = 1000;
  //     const transferAmount = 300;

  //     // Create two account aggregates (simulated for test)
  //     const sourceAccountId = EntityId.createWithRandomUUID();
  //     const targetAccountId = EntityId.createWithRandomUUID();

  //     // Create a transfer service that spans multiple aggregates
  //     class TransferService extends UnitOfWorkAwareDomainService {
  //       constructor() {
  //         super('transfer-service');
  //       }

  //       async transfer(sourceId: EntityId, targetId: EntityId, amount: number): Promise<void> {
  //         return this.executeInTransaction(async () => {
  //           // In a real scenario, we would fetch and update accounts
  //           // Here we simulate the operation
  //           if (sourceId.equals(targetId)) {
  //             throw new Error('Cannot transfer to the same account');
  //           }

  //           // Simulate transfer completion
  //           const event = new TransferCompletedEvent(sourceId.toString(), targetId.toString(), amount);
  //           this.publishEvent(event);
  //         });
  //       }
  //     }

  //     // Act: Register and use transfer service
  //     container.registerFactory('transfer-service', () => new TransferService());
  //     container.initializeServices();

  //     const transferService = container.getService<TransferService>('transfer-service')!;
  //     await transferService.transfer(sourceAccountId, targetAccountId, transferAmount);

  //     // Assert: Transaction completed successfully
  //     // In a real test, we would verify account balances
  //     expect(true).toBe(true);
  //   });
  // });

  describe('Event Subscription and Publishing', () => {
    it('should handle event subscription and publishing properly', async () => {
      // Arrange
      const receivedEvents: IDomainEvent[] = [];

      class EventLogger {
        logEvent(event: IDomainEvent): void {
          receivedEvents.push(event);
        }
      }

      const eventLogger = new EventLogger();

      // Subscribe to specific events
      eventBus.subscribe(ProductCreatedEvent, (event) =>
        eventLogger.logEvent(event),
      );
      eventBus.subscribe(CustomerRegisteredEvent, (event) =>
        eventLogger.logEvent(event),
      );
      eventBus.subscribe(OrderCreatedEvent, (event) =>
        eventLogger.logEvent(event),
      );

      // Act: Execute operations that generate events
      const product = await productService.createProduct(
        'Event Test Product',
        199.99,
      );
      const customer = await customerService.registerCustomer(
        'event@test.com',
        'Event Tester',
      );
      const order = await orderService.createOrder(customer.getId());

      // Assert: Events were published and received
      expect(receivedEvents.length).toBe(3);

      const productEvent = receivedEvents[0] as ProductCreatedEvent;
      expect(productEvent.eventType).toBe(ProductCreatedEvent.name);
      expect(productEvent.productId).toBe(product.getId().toString());
      expect(productEvent.name).toBe('Event Test Product');
      expect(productEvent.price).toBe(199.99);

      const customerEvent = receivedEvents[1] as CustomerRegisteredEvent;
      expect(customerEvent.eventType).toBe(CustomerRegisteredEvent.name);
      expect(customerEvent.customerId).toBe(customer.getId().toString());
      expect(customerEvent.email).toBe('event@test.com');

      const orderEvent = receivedEvents[2] as OrderCreatedEvent;
      expect(orderEvent.eventType).toBe(OrderCreatedEvent.name);
      expect(orderEvent.orderId).toBe(order.getId().toString());
      expect(orderEvent.customerId).toBe(customer.getId().toString());
      expect(orderEvent.items).toHaveLength(0);
    });
  });

  // describe('Complex Scenarios', () => {
  // it('should handle concurrent order processing', async () => {
  //   // Arrange
  //   const productName = 'Popular Gadget';
  //   const productPrice = 299.99;
  //   const initialStock = 5;
  //   const customersCount = 10;

  //   // Create product and add stock (this is OK as separate transactions)
  //   const product = await productService.createProduct(productName, productPrice);
  //   await productService.addProductStock(product.getId(), initialStock);

  //   // Create multiple customers (this is OK as separate transactions)
  //   const customers = await Promise.all(
  //     Array.from({ length: customersCount }).map((_, i) =>
  //       customerService.registerCustomer(`customer${i}@test.com`, `Customer ${i}`)
  //     )
  //   );

  //   // Create orders for each customer (this is OK as separate transactions)
  //   const orders = await Promise.all(
  //     customers.map(customer => orderService.createOrder(customer.getId()))
  //   );

  //   // Act: Try to add product to each order concurrently
  //   // Each addOrderItem creates its own transaction - this is the concurrent part
  //   const results = await Promise.allSettled(
  //     orders.map(order => orderService.addOrderItem(order.getId(), product.getId(), 1))
  //   );

  //   // Assert: Only 5 orders should succeed
  //   const successfulOrders = results.filter(r => r.status === 'fulfilled');
  //   const failedOrders = results.filter(r => r.status === 'rejected') as PromiseRejectedResult[];

  //   expect(successfulOrders.length).toBe(initialStock);
  //   expect(failedOrders.length).toBe(customersCount - initialStock);

  //   // Assert: All failures are due to insufficient stock
  //   failedOrders.forEach(result => {
  //     expect(result.reason.message).toContain('Not enough');
  //   });

  //   // Assert: Product stock is depleted
  //   const allProducts = await productService.getAllProducts();
  //   const updatedProduct = allProducts.find(p => p.getId().equals(product.getId()))!;
  //   expect(updatedProduct.inStock).toBe(0);
  // });

  //   it('should handle concurrent stock updates', async () => {
  //     // Arrange
  //     const productName = 'Test Product';
  //     const productPrice = 99.99;
  //     const concurrentAdds = 10;
  //     const stockPerAdd = 2;

  //     const product = await productService.createProduct(productName, productPrice);

  //     // Act: Try to add stock concurrently
  //     const results = await Promise.allSettled(
  //       Array.from({ length: concurrentAdds }).map(() =>
  //         productService.addProductStock(product.getId(), stockPerAdd)
  //       )
  //     );

  //     // Assert: All operations should succeed
  //     const successfulOps = results.filter(r => r.status === 'fulfilled');
  //     expect(successfulOps.length).toBe(concurrentAdds);

  //     // Assert: Final stock should be correct (10 * 2 = 20)
  //     const allProducts = await productService.getAllProducts();
  //     const updatedProduct = allProducts.find(p => p.getId().equals(product.getId()))!;
  //     expect(updatedProduct.inStock).toBe(concurrentAdds * stockPerAdd);
  //   });
  // });

  // describe('Transactional Boundaries', () => {
  //   it('should understand that each service method is a separate transaction', async () => {
  //     // Arrange
  //     const productId = EntityId.createWithRandomUUID();
  //     let transactionCount = 0;

  //     // Create a mock UnitOfWork to count transactions
  //     const mockUnitOfWork = {
  //       ...unitOfWork,
  //       begin: async () => {
  //         transactionCount++;
  //         await unitOfWork.begin();
  //       }
  //     };

  //     // Temporarily replace the UnitOfWork
  //     // @ts-ignore
  //     productService['unitOfWork'] = mockUnitOfWork;

  //     // Act: Execute multiple operations
  //     await productService.createProduct('Test', 100);
  //     await productService.addProductStock(productId, 5);

  //     // Assert: Each operation should create its own transaction
  //     expect(transactionCount).toBe(2);
  //   });
  // });

  // Updated Unit of Work implementation to better handle transactions
  class ImprovedInMemoryUnitOfWork implements IUnitOfWork {
    private eventBus: IEventBus;
    private repositories: Map<string, IRepository<any>> = new Map();
    private transactionDepth = 0; // Support nested transactions
    private pendingEvents: IDomainEvent[] = [];

    constructor(eventBus: IEventBus) {
      this.eventBus = eventBus;
    }

    async begin(): Promise<void> {
      this.transactionDepth++;
      if (this.transactionDepth === 1) {
        this.pendingEvents = [];
      }
    }

    async commit(): Promise<void> {
      this.transactionDepth--;
      if (this.transactionDepth === 0) {
        // Only publish events when exiting the outermost transaction
        this.pendingEvents.forEach((event) => {
          this.eventBus.publish(event);
        });
        this.pendingEvents = [];
      }
    }

    async rollback(): Promise<void> {
      this.transactionDepth--;
      if (this.transactionDepth === 0) {
        this.pendingEvents = [];
      }
    }

    getRepository<T extends IRepository<any>>(name: string): T {
      const repo = this.repositories.get(name);
      if (!repo) {
        throw new Error(`Repository '${name}' not registered`);
      }
      return repo as T;
    }

    registerRepository<T extends IRepository<any>>(
      name: string,
      repository: T,
    ): void {
      this.repositories.set(name, repository);
    }

    getEventBus(): IEventBus {
      return this.eventBus;
    }

    collectEvents(aggregate: IAggregateRoot<any>): void {
      const events = aggregate.getDomainEvents();
      this.pendingEvents.push(...events);
      aggregate.commit();
    }
  }

  // Test showing different transaction patterns
  // describe('Transaction Patterns', () => {
  //   it('should show different ways to handle transactions', async () => {
  //     // Pattern 1: Individual transaction per operation (current approach)
  //     const createProduct = async () => {
  //       return productService.createProduct('Product 1', 100);
  //     };

  //     const addStock = async (product: Product) => {
  //       return productService.addProductStock(product.getId(), 10);
  //     };

  //     // Pattern 2: Multiple operations in one transaction (if needed)
  //     const createProductWithStock = async () => {
  //       const unitOfWork = new ImprovedInMemoryUnitOfWork(eventBus);

  //       // Temporarily replace the UnitOfWork
  //       const originalUoW = productService['unitOfWork'];
  //       productService['unitOfWork'] = unitOfWork;

  //       try {
  //         console.log('Starting transaction...');
  //         await unitOfWork.begin();

  //         console.log('Creating product...');
  //         const product = await productService.createProduct('Product 2', 100);
  //         console.log('Adding stock...');
  //         await productService.addProductStock(product.getId(), 10);

  //         console.log('Commit...');
  //         await unitOfWork.commit();
  //         console.log('After Commit...');
  //         return product;
  //       } catch (error) {
  //         console.log('ROLLBACK...', error);
  //         await unitOfWork.rollback();
  //         throw error;
  //       } finally {
  //         console.log('FINALLY...');
  //         productService['unitOfWork'] = originalUoW;
  //       }
  //     };

  //     // Execute both patterns
  //     const product1 = await createProduct();
  //     await addStock(product1);

  //     const product2 = await createProductWithStock();

  //     // Verify results
  //     expect(product1).toBeDefined();
  //     expect(product2).toBeDefined();
  //   });
  // });
});

// #############################################################################
// # HELPER CLASSES FOR TESTS
// #############################################################################

class InfrastructureService extends IBaseDomainService {
  constructor() {
    super('infrastructure');
  }
}

class DomainValidationService extends IBaseDomainService {
  constructor() {
    super('domain-validation');
  }
}

class OrderProcessingService extends IBaseDomainService {
  constructor() {
    super('order-processor');
  }
}

class ServiceA extends IBaseDomainService {
  constructor() {
    super('service-a');
  }
}

class ServiceB extends IBaseDomainService {
  constructor() {
    super('service-b');
  }
}

class ServiceC extends IBaseDomainService {
  constructor() {
    super('service-c');
  }
}

class TransferCompletedEvent extends DomainEventBase {
  readonly eventType = TransferCompletedEvent.name;

  constructor(
    public readonly sourceAccountId: string,
    public readonly targetAccountId: string,
    public readonly amount: number,
  ) {
    super();
  }
}
