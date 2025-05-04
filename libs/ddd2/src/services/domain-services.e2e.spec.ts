/**
 * Domain Services - Testy End-to-End
 * 
 * Ten plik zawiera testy end-to-end dla modułu serwisów domenowych.
 * W przeciwieństwie do testów jednostkowych, te testy używają rzeczywistych implementacji
 * wszystkich komponentów, bez mocków, symulując rzeczywisty przepływ biznesowy.
 */

import { describe, it, expect } from 'vitest';

import { 
  IRepository,
  IEventBus,
  IDomainEvent,
  IAggregateRoot,
  AggregateRoot,
  EntityId,
  EventBusBuilder,
  IUnitOfWork
} from '../core';

import { LibUtils, safeRun } from '../utils';
import { DomainServiceContainer } from './domain-service-container';
import { ServiceRegistryBuilder } from './service-registry-builder';
import { DomainService } from './domain-service.decorator';
import { EventAwareDomainService, UnitOfWorkAwareDomainService } from './base-domain-service';
import { IAsyncDomainService } from './domain-service.interface';


// #############################################################################
// # IMPLEMENTACJE DOMENY
// #############################################################################

// Event domenowy
interface IDomainEventMetadata {
  readonly eventId: string;
  readonly occurredOn: Date;
  readonly version: number;
}

// Events
class DomainEventBase implements IDomainEvent, IDomainEventMetadata {
  readonly eventId: string;
  readonly occurredOn: Date;
  readonly version: number;
  readonly eventType: string;
  
  constructor() {
    this.eventId = LibUtils.getUUID();
    this.occurredOn = new Date();
    this.version = 1;
  }
}

class ProductCreatedEvent extends DomainEventBase {
  readonly eventType = ProductCreatedEvent.name;
  
  constructor(
    public readonly productId: string,
    public readonly name: string,
    public readonly price: number
  ) {
    super();
  }
}

class CustomerRegisteredEvent extends DomainEventBase {
  readonly eventType = CustomerRegisteredEvent.name;
  
  constructor(
    public readonly customerId: string,
    public readonly email: string
  ) {
    super();
  }
}

class OrderCreatedEvent extends DomainEventBase {
  readonly eventType = OrderCreatedEvent.name;
  
  constructor(
    public readonly orderId: string,
    public readonly customerId: string,
    public readonly items: Array<{productId: string, quantity: number}>
  ) {
    super();
  }
}

class OrderConfirmedEvent extends DomainEventBase {
  readonly eventType = OrderConfirmedEvent.name;
  
  constructor(
    public readonly orderId: string,
    public readonly customerId: string
  ) {
    super();
  }
}

class OrderShippedEvent extends DomainEventBase {
  readonly eventType = OrderShippedEvent.name;
  
  constructor(
    public readonly orderId: string,
    public readonly customerId: string,
    public readonly shippingCode: string
  ) {
    super();
  }
}

class CustomerNotifiedEvent extends DomainEventBase {
  readonly eventType = CustomerNotifiedEvent.name;
  
  constructor(
    public readonly customerId: string,
    public readonly message: string
  ) {
    super();
  }
}

class Product extends AggregateRoot {
  private _name: string;
  private _price: number;
  private _inStock: number;
  
  private constructor(id: EntityId, name: string, price: number, inStock: number = 0) {
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
    super({id});
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
  Cancelled = 'cancelled'
}

class Order extends AggregateRoot {
  private _customerId: EntityId;
  private _items: OrderItem[] = [];
  private _status: OrderStatus = OrderStatus.Created;
  private _shippingCode?: string;
  
  private constructor(id: EntityId, customerId: EntityId) {
    super({id});
    this._customerId = customerId;
  }
  
  static create(id: EntityId, customerId: EntityId): Order {
    const order = new Order(id, customerId);
    order.apply(new OrderCreatedEvent(id.toString(), customerId.toString(), []));
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
    return this._items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }
  
  addItem(productId: EntityId, quantity: number, price: number): void {
    if (this._status !== OrderStatus.Created) {
      throw new Error('Cannot add items to an order that is not in Created status');
    }
    
    if (quantity <= 0) {
      throw new Error('Quantity must be positive');
    }
    
    const existingItem = this._items.find(item => item.productId.equals(productId));
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      this._items.push({ productId, quantity, price });
    }
  }
  
  ship(shippingCode: string): void {
    if (this._status !== OrderStatus.Confirmed) {
      throw new Error('Cannot ship an order that is not in Confirmed status');
    }
    
    this._status = OrderStatus.Shipped;
    this._shippingCode = shippingCode;
    
    // Zmiana: dodaj customerId do zdarzenia
    this.apply(new OrderShippedEvent(
      this.getId().toString(), 
      this._customerId.toString(),  // Dodaj ID klienta
      shippingCode
    ));
  }
  
  // Podobnie w metodzie confirm()
  confirm(): void {
    // Istniejąca implementacja...
      if (this._status !== OrderStatus.Created) {
      throw new Error('Cannot confirm an order that is not in Created status');
    }
    
    if (this._items.length === 0) {
      throw new Error('Cannot confirm an empty order');
    }
    
    this._status = OrderStatus.Confirmed;
    this.apply(new OrderConfirmedEvent(this.getId().toString(), this._customerId.toString()));
  }
  
  markAsDelivered(): void {
    if (this._status !== OrderStatus.Shipped) {
      throw new Error('Cannot mark as delivered an order that is not in Shipped status');
    }
    
    this._status = OrderStatus.Delivered;
  }
  
  cancel(): void {
    if (this._status !== OrderStatus.Created && this._status !== OrderStatus.Confirmed) {
      throw new Error('Cannot cancel an order that is not in Created or Confirmed status');
    }
    
    this._status = OrderStatus.Cancelled;
  }
}

// Implementacja InMemoryRepository
class InMemoryRepository<T extends IAggregateRoot<any>> implements IRepository<T> {
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
    this.pendingEvents.forEach(event => {
      console.log(`Publishing event: ${event.eventType}`);
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
  
  registerRepository<T extends IRepository<any>>(name: string, repository: T): void {
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
    
    const productRepo = this.unitOfWork.getRepository<ProductRepository>('productRepository');
    
    return this.executeInTransaction(async () => {
      const productId = EntityId.createWithRandomUUID();
      const product = Product.create(productId, name, price);
      
      await productRepo.save(product);
      this.collectEvents(product);
      
      return product;
    });
  }
  
  async addProductStock(productId: EntityId, quantity: number): Promise<Product> {
    if (!this.unitOfWork) {
      throw new Error('Unit of Work not set');
    }
    
    const productRepo = this.unitOfWork.getRepository<ProductRepository>('productRepository');
    
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
    
    const productRepo = this.unitOfWork.getRepository<ProductRepository>('productRepository');
    return productRepo.findAll();
  }
  
  private collectEvents(aggregate: IAggregateRoot<any>): void {
    // Zakładamy, że unitOfWork ma metodę collectEvents
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
    
    const customerRepo = this.unitOfWork.getRepository<CustomerRepository>('customerRepository');
    
    return this.executeInTransaction(async () => {
      const customerId = EntityId.createWithRandomUUID();
      const customer = Customer.register(customerId, email, name);
      
      await customerRepo.save(customer);
      this.collectEvents(customer);
      
      return customer;
    });
  }
  
  async getCustomerById(customerId: EntityId): Promise<Customer | null> {
    if (!this.unitOfWork) {
      throw new Error('Unit of Work not set');
    }
    
    const customerRepo = this.unitOfWork.getRepository<CustomerRepository>('customerRepository');
    return customerRepo.findById(customerId);
  }
  
  async getAllCustomers(): Promise<Customer[]> {
    if (!this.unitOfWork) {
      throw new Error('Unit of Work not set');
    }
    
    const customerRepo = this.unitOfWork.getRepository<CustomerRepository>('customerRepository');
    return customerRepo.findAll();
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
    
    const orderRepo = this.unitOfWork.getRepository<OrderRepository>('orderRepository');
    const customerRepo = this.unitOfWork.getRepository<CustomerRepository>('customerRepository');
    
    return this.executeInTransaction(async () => {
      // Sprawdź czy klient istnieje
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
  
  async addOrderItem(orderId: EntityId, productId: EntityId, quantity: number): Promise<Order> {
    if (!this.unitOfWork) {
      throw new Error('Unit of Work not set');
    }
    
    const orderRepo = this.unitOfWork.getRepository<OrderRepository>('orderRepository');
    const productRepo = this.unitOfWork.getRepository<ProductRepository>('productRepository');
    
    return this.executeInTransaction(async () => {
      const order = await orderRepo.findById(orderId);
      if (!order) {
        throw new Error(`Order with ID ${orderId.toString()} not found`);
      }
      
      const product = await productRepo.findById(productId);
      if (!product) {
        throw new Error(`Product with ID ${productId.toString()} not found`);
      }
      
      // Sprawdź dostępność produktu
      if (product.inStock < quantity) {
        throw new Error(`Not enough ${product.name} in stock. Requested: ${quantity}, Available: ${product.inStock}`);
      }
      
      // Dodaj produkt do zamówienia
      order.addItem(productId, quantity, product.price);
      
      // Zmniejsz stan magazynowy
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
    
    const orderRepo = this.unitOfWork.getRepository<OrderRepository>('orderRepository');
    
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
    
    const orderRepo = this.unitOfWork.getRepository<OrderRepository>('orderRepository');
    
    return this.executeInTransaction(async () => {
      const order = await orderRepo.findById(orderId);
      if (!order) {
        throw new Error(`Order with ID ${orderId.toString()} not found`);
      }
      
      // Generowanie kodu wysyłki - w prawdziwej aplikacji byłoby bardziej zaawansowane
      const shippingCode = `SHP-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      
      order.ship(shippingCode);
      await orderRepo.save(order);
      this.collectEvents(order);
      
      return order;
    });
  }
  
  async getOrderById(orderId: EntityId): Promise<Order | null> {
    if (!this.unitOfWork) {
      throw new Error('Unit of Work not set');
    }
    
    const orderRepo = this.unitOfWork.getRepository<OrderRepository>('orderRepository');
    return orderRepo.findById(orderId);
  }
  
  async getAllOrders(): Promise<Order[]> {
    if (!this.unitOfWork) {
      throw new Error('Unit of Work not set');
    }
    
    const orderRepo = this.unitOfWork.getRepository<OrderRepository>('orderRepository');
    return orderRepo.findAll();
  }
  
  private collectEvents(aggregate: IAggregateRoot<any>): void {
    (this.unitOfWork as InMemoryUnitOfWork).collectEvents(aggregate);
  }
}

@DomainService('notification-service')
class NotificationService extends EventAwareDomainService implements IAsyncDomainService {
  private sentNotifications: CustomerNotifiedEvent[] = [];
  
  constructor() {
    super('notification-service');
  }
  
  async initialize(): Promise<void> {
    console.log('Notification service initialized');
    
    if (!this.eventBus) {
      throw new Error('Event bus not set');
    }
    
    // Użyj funkcji strzałkowych zamiast bindowania - to zachowa kontekst "this"
    this.eventBus.subscribe<OrderConfirmedEvent>(
      OrderConfirmedEvent, 
      (event: OrderConfirmedEvent) => this.handleOrderConfirmedEvent(event)
    );
    this.eventBus.subscribe<OrderShippedEvent>(
      OrderShippedEvent, 
      (event: OrderShippedEvent) => this.handleOrderShippedEvent(event)
    );

    console.log(this.eventBus)
    
    // Dodaj potwierdzenie inicjalizacji
    console.log('Event subscriptions set up successfully');
  }
  
  private handleOrderConfirmedEvent(event: OrderConfirmedEvent): void {
    this.notifyCustomer(
      new EntityId(event.customerId, 'uuid'),
      `Zamówienie #${event.orderId} zostało potwierdzone.`
    );
  }
  
  private async handleOrderShippedEvent(event: OrderShippedEvent): Promise<void> {
    this.notifyCustomer(
      new EntityId(event.customerId, 'uuid'),
      `Zamówienie #${event.orderId} zostało wysłane. Kod przesyłki: ${event.shippingCode}`
    );
  }
  
  notifyCustomer(customerId: EntityId, message: string): void {
    if (!this.eventBus) {
      throw new Error('Event bus not set');
    }
    
    // Publikuj zdarzenie o wysłanej notyfikacji
    const notificationEvent = new CustomerNotifiedEvent(
      customerId.toString(),
      message
    );

    // Najpierw dodaj do lokalnej tablicy, POTEM publikuj
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
    // Inicjalizacja infrastruktury
    eventBus = EventBusBuilder.create().build();
    unitOfWork = new InMemoryUnitOfWork(eventBus);
    
    // Inicjalizacja repozytoriów
    const productRepo = new ProductRepository();
    const customerRepo = new CustomerRepository();
    const orderRepo = new OrderRepository();
    
    unitOfWork.registerRepository('productRepository', productRepo);
    unitOfWork.registerRepository('customerRepository', customerRepo);
    unitOfWork.registerRepository('orderRepository', orderRepo);
    
    // Inicjalizacja kontenera serwisów
    container = new DomainServiceContainer(
      undefined, // Użyj domyślnego rejestru
      eventBus,
      () => unitOfWork
    );
    
    // Rejestracja serwisów
    container.registerFactory('product-service', () => new ProductService());
    container.registerFactory('customer-service', () => new CustomerService());
    container.registerFactory('order-service', () => new OrderService());
    container.registerFactory('notification-service', () => new NotificationService());
    
    // Inicjalizacja serwisów
    container.initializeServices();
    
    // Pobranie zainicjalizowanych serwisów
    productService = container.getService<ProductService>('product-service')!;
    customerService = container.getService<CustomerService>('customer-service')!;
    orderService = container.getService<OrderService>('order-service')!;
    notificationService = container.getService<NotificationService>('notification-service')!;
  });

  describe('Pełny przepływ biznesowy', () => {
    it('powinien obsłużyć kompletny scenariusz od utworzenia produktu do wysyłki zamówienia', async () => {
      // 1. Utwórz produkty
      const laptop = await productService.createProduct('Laptop', 3500);
      const phone = await productService.createProduct('Phone', 1200);
      
      // 2. Dodaj stan magazynowy
      await productService.addProductStock(laptop.getId(), 10);
      await productService.addProductStock(phone.getId(), 20);
      
      // 3. Zarejestruj klienta
      const customer = await customerService.registerCustomer('jan.kowalski@example.com', 'Jan Kowalski');
      
      // 4. Utwórz zamówienie
      const order = await orderService.createOrder(customer.getId());
      
      // 5. Dodaj produkty do zamówienia
      await orderService.addOrderItem(order.getId(), laptop.getId(), 1);
      await orderService.addOrderItem(order.getId(), phone.getId(), 2);
      
      // 6. Potwierdź zamówienie
      const _confirmedOrder = await orderService.confirmOrder(order.getId());
      
      // 7. Wyślij zamówienie
      const shippedOrder = await orderService.shipOrder(order.getId());

      // Dodaj opóźnienie dla propagacji zdarzeń
      await LibUtils.sleep(100);
      
      // 8. Pobierz produkty po operacjach
      const updatedLaptop = await productService.getAllProducts().then(
        products => products.find(p => p.getId().equals(laptop.getId()))
      );
      
      const updatedPhone = await productService.getAllProducts().then(
        products => products.find(p => p.getId().equals(phone.getId()))
      );
      
      // Weryfikacje
      
      // Sprawdź stan produktów
      expect(updatedLaptop?.inStock).toBe(9); // 10 - 1
      expect(updatedPhone?.inStock).toBe(18); // 20 - 2
      
      // Sprawdź status zamówienia
      expect(shippedOrder.status).toBe(OrderStatus.Shipped);
      expect(shippedOrder.shippingCode).toBeDefined();
      
      // Sprawdź powiadomienia
      const notifications = notificationService.getSentNotifications();

      expect(notifications.length).toBeGreaterThanOrEqual(2);
      
      // Powinny być co najmniej 2 powiadomienia: jedno o potwierdzeniu zamówienia, drugie o wysyłce
      const confirmationNotification = notifications.find(
        n => n.message.includes('potwierdzone')
      );
      const shippingNotification = notifications.find(
        n => n.message.includes('wysłane')
      );
      
      expect(confirmationNotification).toBeDefined();
      expect(shippingNotification).toBeDefined();
      
      if (shippingNotification) {
        expect(shippingNotification.message).toContain(shippedOrder.shippingCode!);
      }
    });
  });
  
  describe('Obsługa błędów', () => {
    it('powinien obsłużyć brak produktu na stanie', async () => {
      // 1. Utwórz produkt z małym stanem
      const watch = await productService.createProduct('Smart Watch', 800);
      await productService.addProductStock(watch.getId(), 1);
      
      // 2. Zarejestruj klienta
      const customer = await customerService.registerCustomer('adam.nowak@example.com', 'Adam Nowak');
      
      // 3. Utwórz zamówienie
      const order = await orderService.createOrder(customer.getId());
      
      // 4. Dodaj produkt do zamówienia - za dużo
      const [error] = await safeRun(() => orderService.addOrderItem(order.getId(), watch.getId(), 2));
      
      expect(error.message).toContain('Not enough Smart Watch in stock.');
      // Sprawdź, czy stan produktu nie zmienił się
      const updatedWatch = await productService.getAllProducts().then(
        products => products.find(p => p.getId().equals(watch.getId()))
      );
      
      expect(updatedWatch?.inStock).toBe(1); // Powinno pozostać 1
    });
    
    it('powinien obsłużyć próbę potwierdzenia pustego zamówienia', async () => {
      // 1. Zarejestruj klienta
      const customer = await customerService.registerCustomer('test@example.com', 'Test User');
      
      // 2. Utwórz zamówienie
      const order = await orderService.createOrder(customer.getId());
      
      // 3. Próba potwierdzenia pustego zamówienia
      try {
        await orderService.confirmOrder(order.getId());
        fail('Powinna zostać zgłoszona wyjątek o pustym zamówieniu');
      } catch (error) {
        expect((error as Error).message).toContain('empty order');
      }
      
      // Sprawdź, czy status zamówienia nie zmienił się
      const updatedOrder = await orderService.getOrderById(order.getId());
      expect(updatedOrder?.status).toBe(OrderStatus.Created);
    });
  });
  
  describe('Użycie ServiceRegistryBuilder', () => {
    it('powinien skonfigurować serwisy przy użyciu buildera', async () => {
     
      // Inicjalizacja repozytoriów
      const productRepo = new ProductRepository();
      const customerRepo = new CustomerRepository();
      const orderRepo = new OrderRepository();
      
      unitOfWork.registerRepository('productRepository', productRepo);
      unitOfWork.registerRepository('customerRepository', customerRepo);
      unitOfWork.registerRepository('orderRepository', orderRepo);
      
      // Użyj ServiceRegistryBuilder
      const registryBuilder = new ServiceRegistryBuilder()
        .withEventBus(eventBus)
        .withUnitOfWork(unitOfWork);
      
      // Zbuduj serwisy
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
      
      // Sprawdź czy serwisy działają poprawnie
      const laptop = await productServiceB.createProduct('Laptop', 3500);
      await productServiceB.addProductStock(laptop.getId(), 5);
      
      const customer = await customerServiceB.registerCustomer('test-builder@example.com', 'Test Builder');
      
      const order = await orderServiceB.createOrder(customer.getId());
      await orderServiceB.addOrderItem(order.getId(), laptop.getId(), 1);
      await orderServiceB.confirmOrder(order.getId());

      console.log('ORDER', order)
      
      expect(notificationServiceB['eventBus']).toBeDefined();
      
      // Teraz sprawdź powiadomienia
      const notifications = notificationServiceB.getSentNotifications();
      expect(notifications.length).toBe(1);
    });
  });
});
