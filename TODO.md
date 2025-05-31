### nowy claude 4

# Plan Rozwoju Funkcjonalności dla DomainTS

## 1. Projekcje i Materialized Views

### Cel
Umożliwienie tworzenia i zarządzania specjalnymi modelami odczytu (read models) zoptymalizowanymi pod kątem konkretnych zapytań, zasilanych przez zdarzenia domenowe.

### Kluczowe Komponenty

```typescript
// Główny interfejs dla projekcji
export interface IProjection<TReadModel, TEvent = IDomainEvent> {
  // Przetwarza zdarzenie, aktualizując model odczytu
  handle(event: TEvent, readModel: TReadModel): Promise<TReadModel>;
  
  // Określa, czy projekcja jest zainteresowana danym zdarzeniem
  isInterested(event: TEvent): boolean;
}

// Menedżer projekcji - zarządza zbiorem projekcji dla danego modelu odczytu
export interface IProjectionManager<TReadModel> {
  // Dodaje projekcję do menedżera
  registerProjection<TEvent>(projection: IProjection<TReadModel, TEvent>): this;
  
  // Aktualizuje model odczytu na podstawie zdarzenia
  updateReadModel(event: IDomainEvent, readModel: TReadModel): Promise<TReadModel>;
  
  // Tworzy nowy model odczytu od zera, odtwarzając wszystkie zdarzenia
  createReadModel(eventStream: AsyncIterable<IDomainEvent>): Promise<TReadModel>;
}

// Repozytorium dla modeli odczytu
export interface IReadModelRepository<TReadModel> {
  // Zapisuje lub aktualizuje model odczytu
  save(readModel: TReadModel): Promise<void>;
  
  // Pobiera model odczytu według identyfikatora
  findById(id: string): Promise<TReadModel | null>;
  
  // Usuwa model odczytu
  delete(id: string): Promise<void>;
}

// Fabryka dla modeli odczytu
export interface IReadModelFactory<TReadModel> {
  // Tworzy pusty model odczytu
  create(): TReadModel;
}

// Dispatcher projekcji - łączy event bus z aktualizacją projekcji
export interface IProjectionDispatcher {
  // Rejestruje menedżera projekcji dla określonego typu modelu odczytu
  registerProjectionManager<TReadModel>(
    readModelType: string,
    manager: IProjectionManager<TReadModel>,
    repository: IReadModelRepository<TReadModel>,
    factory: IReadModelFactory<TReadModel>
  ): this;
  
  // Inicjalizuje subskrypcje zdarzeń
  initialize(eventBus: IEventBus): Promise<void>;
}
```

### Integracja
- **Z Event Bus**: Projekcje subskrybują się na zdarzenia za pośrednictwem EventBus
- **Z Repository**: Do przechowywania modeli odczytu
- **Z Event Store**: Do odtwarzania historii zdarzeń podczas budowania projekcji

### Przykład Użycia

```typescript
// Definicja prostego modelu odczytu
interface OrderSummaryReadModel {
  id: string;
  orderCount: number;
  totalValue: number;
  lastOrderDate: Date;
}

// Projekcja aktualizująca podsumowanie zamówień
class OrderSummaryProjection implements IProjection<OrderSummaryReadModel, OrderPlacedEvent> {
  isInterested(event: IDomainEvent): boolean {
    return event.eventType === 'OrderPlaced';
  }
  
  async handle(event: OrderPlacedEvent, readModel: OrderSummaryReadModel): Promise<OrderSummaryReadModel> {
    readModel.orderCount++;
    readModel.totalValue += event.payload.totalAmount;
    readModel.lastOrderDate = event.metadata?.timestamp || new Date();
    return readModel;
  }
}

// Użycie
const orderSummaryManager = new ProjectionManager<OrderSummaryReadModel>();
orderSummaryManager.registerProjection(new OrderSummaryProjection());

const dispatcher = new ProjectionDispatcher();
dispatcher.registerProjectionManager(
  'orderSummary',
  orderSummaryManager,
  new OrderSummaryRepository(),
  { create: () => ({ id: 'summary', orderCount: 0, totalValue: 0, lastOrderDate: new Date() }) }
);

await dispatcher.initialize(eventBus);
```

## 2. Process Manager

### Cel
Koordynacja długotrwałych procesów biznesowych, które obejmują wiele agregatów i mogą trwać przez dłuższy czas, reagując na zdarzenia domenowe i emitując komendy.

### Kluczowe Komponenty

```typescript
// Stan procesu
export interface IProcessState {
  id: string;
  processType: string;
  currentState: string;
  data: Record<string, any>;
  version: number;
  startedAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  status: ProcessStatus;
}

// Status procesu
export enum ProcessStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SUSPENDED = 'suspended'
}

// Definicja procesu z maszyną stanów
export interface IProcessDefinition<TState extends IProcessState> {
  // Typ procesu
  processType: string;
  
  // Inicjalizacja nowego procesu
  initialize(id: string, triggerEvent: IDomainEvent): TState;
  
  // Definicja stanów i przejść
  getStateDefinitions(): IProcessStateDefinition<TState>[];
  
  // Obsługa błędu procesu
  handleError(state: TState, error: Error): TState;
}

// Definicja stanu procesu
export interface IProcessStateDefinition<TState extends IProcessState> {
  // Nazwa stanu
  stateName: string;
  
  // Lista zdarzeń, które obsługuje ten stan
  interestedIn: string[] | ((event: IDomainEvent) => boolean);
  
  // Metoda obsługi zdarzenia w tym stanie
  handle(state: TState, event: IDomainEvent): Promise<IProcessTransition<TState>>;
}

// Przejście między stanami
export interface IProcessTransition<TState extends IProcessState> {
  // Nowy stan procesu
  newState: TState;
  
  // Komendy do wykonania
  commands: Command[];
  
  // Czy proces jest zakończony
  isTerminal: boolean;
}

// Manager procesów
export interface IProcessManager {
  // Rejestruje definicję procesu
  registerProcessDefinition<TState extends IProcessState>(
    definition: IProcessDefinition<TState>
  ): this;
  
  // Obsługuje zdarzenie
  handleEvent(event: IDomainEvent): Promise<void>;
  
  // Uruchamia nowy proces
  startProcess(processType: string, triggerEvent: IDomainEvent): Promise<string>;
  
  // Zawiesza proces
  suspendProcess(processId: string, reason: string): Promise<void>;
  
  // Wznawia proces
  resumeProcess(processId: string): Promise<void>;
  
  // Anuluje proces
  cancelProcess(processId: string, reason: string): Promise<void>;
}

// Repozytorium procesów
export interface IProcessRepository {
  // Zapisuje stan procesu
  save(state: IProcessState): Promise<void>;
  
  // Pobiera stan procesu
  findById(id: string): Promise<IProcessState | null>;
  
  // Pobiera procesy w danym stanie
  findByState(processType: string, state: string): Promise<IProcessState[]>;
  
  // Pobiera aktywne procesy danego typu
  findActive(processType: string): Promise<IProcessState[]>;
}
```

### Integracja
- **Z Event Bus**: Process Manager subskrybuje zdarzenia z EventBus
- **Z Command Bus**: Process Manager wysyła komendy w odpowiedzi na zdarzenia
- **Z Repository**: Do przechowywania stanu procesów
- **Z Domain Services**: Do wykonywania operacji w kontekście procesu

### Przykład Użycia

```typescript
// Definicja procesu zamówienia
class OrderProcessDefinition implements IProcessDefinition<OrderProcessState> {
  processType = 'OrderProcess';
  
  initialize(id: string, event: OrderPlacedEvent): OrderProcessState {
    return {
      id,
      processType: this.processType,
      currentState: 'PaymentPending',
      data: {
        orderId: event.payload.orderId,
        customerId: event.payload.customerId,
        amount: event.payload.amount
      },
      version: 0,
      startedAt: new Date(),
      updatedAt: new Date(),
      status: ProcessStatus.ACTIVE
    };
  }
  
  getStateDefinitions(): IProcessStateDefinition<OrderProcessState>[] {
    return [
      {
        stateName: 'PaymentPending',
        interestedIn: ['PaymentProcessed', 'PaymentFailed'],
        handle: async (state, event) => {
          if (event.eventType === 'PaymentProcessed') {
            return {
              newState: { ...state, currentState: 'ShipmentPending', updatedAt: new Date() },
              commands: [new CreateShipmentCommand(state.data.orderId)],
              isTerminal: false
            };
          } else {
            return {
              newState: { ...state, currentState: 'Failed', updatedAt: new Date(), status: ProcessStatus.FAILED },
              commands: [new CancelOrderCommand(state.data.orderId, 'Payment failed')],
              isTerminal: true
            };
          }
        }
      },
      // Inne stany...
    ];
  }
  
  handleError(state: OrderProcessState, error: Error): OrderProcessState {
    return {
      ...state,
      currentState: 'Failed',
      updatedAt: new Date(),
      status: ProcessStatus.FAILED,
      data: { ...state.data, error: error.message }
    };
  }
}

// Użycie
const processManager = new ProcessManager(new ProcessRepository(), commandBus);
processManager.registerProcessDefinition(new OrderProcessDefinition());
eventBus.subscribe('OrderPlaced', event => processManager.handleEvent(event));
```

## 3. Anti-Corruption Layer (ACL)

### Cel
Ochrona integralności modelu domeny poprzez tłumaczenie między różnymi kontekstami granicznymi (Bounded Contexts), zapobieganie "wyciekom" modelu i zapewnienie czystej integracji.

### Kluczowe Komponenty

```typescript
// Adapter dla zewnętrznego modelu
export interface IModelAdapter<TExternal, TInternal> {
  // Konwertuje model zewnętrzny na wewnętrzny
  adaptToInternal(external: TExternal): TInternal;
  
  // Konwertuje model wewnętrzny na zewnętrzny
  adaptToExternal(internal: TInternal): TExternal;
}

// Translator między kontekstami
export interface IContextTranslator<TSourceContext, TTargetContext> {
  // Tłumaczy model z kontekstu źródłowego na docelowy
  translate(sourceModel: TSourceContext): TTargetContext;
  
  // Typ źródłowego kontekstu
  sourceContextName: string;
  
  // Typ docelowego kontekstu
  targetContextName: string;
}

// Fasada dla zewnętrznego systemu
export interface IExternalSystemFacade<TCommand, TResult> {
  // Wykonuje operację na zewnętrznym systemie
  execute(command: TCommand): Promise<TResult>;
  
  // Nazwa zewnętrznego systemu
  externalSystemName: string;
}

// Rejestr ACL dla zarządzania translatorami i adapterami
export interface IACLRegistry {
  // Rejestruje translator
  registerTranslator<TSource, TTarget>(
    translator: IContextTranslator<TSource, TTarget>
  ): this;
  
  // Rejestruje adapter
  registerAdapter<TExternal, TInternal>(
    externalType: string,
    adapter: IModelAdapter<TExternal, TInternal>
  ): this;
  
  // Rejestruje fasadę
  registerFacade<TCommand, TResult>(
    facade: IExternalSystemFacade<TCommand, TResult>
  ): this;
  
  // Pobiera translator dla określonych kontekstów
  getTranslator<TSource, TTarget>(
    sourceContext: string,
    targetContext: string
  ): IContextTranslator<TSource, TTarget> | undefined;
  
  // Pobiera adapter dla określonego typu zewnętrznego
  getAdapter<TExternal, TInternal>(
    externalType: string
  ): IModelAdapter<TExternal, TInternal> | undefined;
  
  // Pobiera fasadę dla określonego zewnętrznego systemu
  getFacade<TCommand, TResult>(
    externalSystemName: string
  ): IExternalSystemFacade<TCommand, TResult> | undefined;
}

// Context Map - reprezentacja relacji między kontekstami
export interface IContextMap {
  // Dodaje kontekst do mapy
  addContext(context: IBoundedContext): this;
  
  // Dodaje relację między kontekstami
  addRelationship(relationship: IContextRelationship): this;
  
  // Pobiera wszystkie konteksty
  getContexts(): IBoundedContext[];
  
  // Pobiera wszystkie relacje
  getRelationships(): IContextRelationship[];
  
  // Pobiera kontekst po nazwie
  getContext(name: string): IBoundedContext | undefined;
  
  // Pobiera relacje dla określonego kontekstu
  getRelationshipsForContext(contextName: string): IContextRelationship[];
}
```

### Integracja
- **Z Event Bus**: Tłumaczenie zdarzeń między kontekstami
- **Z Domain Services**: Używanie fasad do integracji z zewnętrznymi systemami
- **Z Integration Events**: Tłumaczenie zdarzeń integracyjnych na zdarzenia domenowe

### Przykład Użycia

```typescript
// Adapter dla zewnętrznego modelu klienta
class CustomerAdapter implements IModelAdapter<ExternalCustomer, Customer> {
  adaptToInternal(external: ExternalCustomer): Customer {
    return new Customer(
      new CustomerId(external.id),
      new Email(external.emailAddress),
      new PersonName(external.firstName, external.lastName)
    );
  }
  
  adaptToExternal(internal: Customer): ExternalCustomer {
    return {
      id: internal.id.value,
      emailAddress: internal.email.value,
      firstName: internal.name.firstName,
      lastName: internal.name.lastName,
      // Mapowanie pozostałych pól
    };
  }
}

// Translator między kontekstami
class OrderToShippingTranslator implements IContextTranslator<Order, ShipmentRequest> {
  sourceContextName = 'OrderContext';
  targetContextName = 'ShippingContext';
  
  translate(order: Order): ShipmentRequest {
    return new ShipmentRequest(
      order.id.value,
      order.shippingAddress.toShippingFormat(),
      order.items.map(item => new ShipmentItem(
        item.productId.value,
        item.quantity,
        item.dimensions
      )),
      order.requestedShippingMethod
    );
  }
}

// Użycie ACL Registry
const aclRegistry = new ACLRegistry();

// Rejestracja adaptera
aclRegistry.registerAdapter('ExternalCustomer', new CustomerAdapter());

// Rejestracja translatora
aclRegistry.registerTranslator(new OrderToShippingTranslator());

// Używanie ACL w serwisie
class ShippingService {
  constructor(private aclRegistry: IACLRegistry) {}
  
  async createShipmentForOrder(order: Order): Promise<Shipment> {
    // Pobierz translator
    const translator = this.aclRegistry.getTranslator<Order, ShipmentRequest>(
      'OrderContext',
      'ShippingContext'
    );
    
    if (!translator) {
      throw new Error('Translator not found');
    }
    
    // Przetłumacz zamówienie na żądanie wysyłki
    const shipmentRequest = translator.translate(order);
    
    // Utwórz wysyłkę
    // ...
  }
}
```

## 4. Context Maps i Wizualizacja Relacji

### Cel
Modelowanie i wizualizacja relacji między Bounded Contexts, umożliwiające lepsze zrozumienie architektury systemu i komunikację między zespołami.

### Kluczowe Komponenty

```typescript
// Bounded Context
export interface IBoundedContext {
  // Nazwa kontekstu
  name: string;
  
  // Opis kontekstu
  description?: string;
  
  // Zespół odpowiedzialny za kontekst
  responsibleTeam?: string;
  
  // Modele domenowe w kontekście
  domainModels?: string[];
  
  // Metadata
  metadata?: Record<string, any>;
}

// Typy relacji między kontekstami
export enum ContextRelationshipType {
  PARTNERSHIP = 'partnership',
  CUSTOMER_SUPPLIER = 'customer-supplier',
  CONFORMIST = 'conformist',
  ANTICORRUPTION_LAYER = 'anticorruption-layer',
  OPEN_HOST_SERVICE = 'open-host-service',
  PUBLISHED_LANGUAGE = 'published-language',
  SEPARATE_WAYS = 'separate-ways',
  BIG_BALL_OF_MUD = 'big-ball-of-mud'
}

// Relacja między kontekstami
export interface IContextRelationship {
  // Typ relacji
  type: ContextRelationshipType;
  
  // Kontekst źródłowy
  sourceContextName: string;
  
  // Kontekst docelowy
  targetContextName: string;
  
  // Opis relacji
  description?: string;
  
  // Punkty integracji
  integrationPoints?: IIntegrationPoint[];
  
  // Metadata
  metadata?: Record<string, any>;
}

// Punkt integracji między kontekstami
export interface IIntegrationPoint {
  // Nazwa punktu integracji
  name: string;
  
  // Typ integracji
  type: 'event' | 'command' | 'query' | 'api' | 'data' | 'other';
  
  // Kierunek przepływu danych
  direction: 'upstream' | 'downstream' | 'bidirectional';
  
  // Opis integracji
  description?: string;
  
  // Szczegóły implementacji
  implementationDetails?: Record<string, any>;
}

// Map Builder dla tworzenia Context Map
export interface IContextMapBuilder {
  // Dodaje kontekst
  addContext(
    name: string,
    description?: string,
    responsibleTeam?: string,
    domainModels?: string[],
    metadata?: Record<string, any>
  ): this;
  
  // Dodaje relację partnerską
  addPartnership(
    sourceContext: string,
    targetContext: string,
    description?: string
  ): this;
  
  // Dodaje relację klient-dostawca
  addCustomerSupplier(
    customerContext: string,
    supplierContext: string,
    description?: string
  ): this;
  
  // Dodaje relację z ACL
  addAnticorruptionLayer(
    protectedContext: string,
    externalContext: string,
    description?: string
  ): this;
  
  // Dodaje punkt integracji
  addIntegrationPoint(
    sourceContext: string,
    targetContext: string,
    name: string,
    type: 'event' | 'command' | 'query' | 'api' | 'data' | 'other',
    direction: 'upstream' | 'downstream' | 'bidirectional',
    description?: string
  ): this;
  
  // Buduje Context Map
  build(): IContextMap;
}

// Renderer dla wizualizacji Context Map
export interface IContextMapRenderer {
  // Generuje wizualizację
  render(contextMap: IContextMap): IContextMapVisualization;
}

// Wizualizacja Context Map
export interface IContextMapVisualization {
  // Format wizualizacji
  format: 'svg' | 'html' | 'dot' | 'json' | 'mermaid';
  
  // Zawartość wizualizacji
  content: string;
  
  // Metadane wizualizacji
  metadata?: Record<string, any>;
}
```

### Integracja
- **Z ACL**: Informacje o warstwach ACL między kontekstami
- **Z Event Bus**: Punkty integracji oparte na zdarzeniach
- **Z Domain Services**: Punkty integracji oparte na usługach

### Przykład Użycia

```typescript
// Tworzenie Context Map
const contextMapBuilder = new ContextMapBuilder();

// Dodawanie kontekstów
contextMapBuilder
  .addContext(
    'OrderContext',
    'Zarządzanie zamówieniami i procesem zakupowym',
    'Order Team',
    ['Order', 'OrderItem', 'Customer']
  )
  .addContext(
    'ShippingContext',
    'Zarządzanie wysyłką i dostawą',
    'Logistics Team',
    ['Shipment', 'Package', 'DeliveryRoute']
  )
  .addContext(
    'PaymentContext',
    'Przetwarzanie płatności',
    'Payment Team',
    ['Payment', 'PaymentMethod', 'Transaction']
  );

// Dodawanie relacji
contextMapBuilder
  .addCustomerSupplier('OrderContext', 'ShippingContext', 'Order jest klientem Shipping')
  .addAnticorruptionLayer('OrderContext', 'PaymentContext', 'ACL chroni model Order przed Payment')
  .addPartnership('ShippingContext', 'PaymentContext', 'Współpraca w zarządzaniu COD');

// Dodawanie punktów integracji
contextMapBuilder
  .addIntegrationPoint(
    'OrderContext', 
    'ShippingContext',
    'OrderShipped',
    'event',
    'downstream',
    'Zdarzenie informujące o wysłaniu zamówienia'
  )
  .addIntegrationPoint(
    'OrderContext',
    'PaymentContext',
    'ProcessPayment',
    'command',
    'downstream',
    'Żądanie przetworzenia płatności'
  );

// Budowanie mapy
const contextMap = contextMapBuilder.build();

// Renderowanie wizualizacji
const renderer = new MermaidContextMapRenderer();
const visualization = renderer.render(contextMap);

console.log(visualization.content);
// Wynik: diagram Mermaid reprezentujący relacje między kontekstami
```

## 5. Metryki Przepływu Zdarzeń

### Cel
Śledzenie i analizowanie przepływu zdarzeń w systemie, umożliwiające monitorowanie wydajności, diagnozowanie problemów i optymalizację.

### Kluczowe Komponenty

```typescript
// Typ metryki
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  SUMMARY = 'summary'
}

// Wymiary metryki
export interface MetricDimensions {
  // Nazwa wymiaru i jego wartość
  [key: string]: string | number | boolean;
}

// Pojedyncza metryka
export interface IMetric {
  // Nazwa metryki
  name: string;
  
  // Typ metryki
  type: MetricType;
  
  // Opis metryki
  description?: string;
  
  // Jednostka miary
  unit?: string;
}

// Próbka metryki
export interface IMetricSample {
  // Nazwa metryki
  metricName: string;
  
  // Wartość próbki
  value: number;
  
  // Wymiary (tagi) próbki
  dimensions?: MetricDimensions;
  
  // Czas próbkowania
  timestamp: Date;
}

// Kolektor metryk
export interface IMetricsCollector {
  // Zwiększa licznik
  incrementCounter(name: string, value?: number, dimensions?: MetricDimensions): void;
  
  // Ustawia wartość metryki gauge
  setGauge(name: string, value: number, dimensions?: MetricDimensions): void;
  
  // Rejestruje wartość w histogramie
  recordHistogram(name: string, value: number, dimensions?: MetricDimensions): void;
  
  // Rejestruje wartość w summary
  recordSummary(name: string, value: number, dimensions?: MetricDimensions): void;
  
  // Rejestruje czas wykonania funkcji
  time<T>(name: string, fn: () => Promise<T>, dimensions?: MetricDimensions): Promise<T>;
  
  // Pobiera wszystkie próbki metryk
  getSamples(): IMetricSample[];
}

// Reporter metryk
export interface IMetricsReporter {
  // Raportuje metryki do zewnętrznego systemu
  report(samples: IMetricSample[]): Promise<void>;
}

// Event Bus Metrics Middleware
export interface IEventBusMetricsMiddleware {
  // Tworzy middleware dla Event Bus
  createMiddleware(): EventBusMiddleware;
}

// Tracker przepływu zdarzeń
export interface IEventFlowTracker {
  // Śledzi przepływ zdarzenia
  trackEvent(event: IDomainEvent): void;
  
  // Rozpoczyna śledzenie zdarzenia
  startTracking(event: IDomainEvent): string;
  
  // Kończy śledzenie zdarzenia
  endTracking(trackingId: string): void;
  
  // Rejestruje obsługę zdarzenia
  trackEventHandling(
    eventType: string,
    handlerName: string,
    durationMs: number,
    success: boolean,
    error?: Error
  ): void;
  
  // Pobiera metryki przepływu
  getMetrics(): IMetricSample[];
}
```

### Integracja
- **Z Event Bus**: Middleware dla zbierania metryk
- **Z Event Handler**: Mierzenie czasu obsługi zdarzeń
- **Z Domain Services**: Mierzenie czasu wykonania operacji
- **Z External Systems**: Raportowanie metryk do systemów monitorowania

### Przykład Użycia

```typescript
// Tworzenie kolektora metryk
const metricsCollector = new MetricsCollector();

// Tworzenie Event Bus Metrics Middleware
const metricsMiddleware = new EventBusMetricsMiddleware(metricsCollector);

// Dodawanie middleware do Event Bus
eventBus.use(metricsMiddleware.createMiddleware());

// Konfiguracja metryk
metricsCollector.registerMetric({
  name: 'events_processed_total',
  type: MetricType.COUNTER,
  description: 'Total number of events processed'
});

metricsCollector.registerMetric({
  name: 'event_processing_duration_ms',
  type: MetricType.HISTOGRAM,
  description: 'Event processing duration in milliseconds'
});

// Używanie tracker'a przepływu zdarzeń
const flowTracker = new EventFlowTracker(metricsCollector);

// Niestandardowy event handler z metrykami
class MetricAwareEventHandler implements IEventHandler<OrderPlacedEvent> {
  constructor(private flowTracker: IEventFlowTracker) {}
  
  async handle(event: OrderPlacedEvent): Promise<void> {
    const start = Date.now();
    let success = false;
    
    try {
      // Obsługa zdarzenia
      // ...
      
      success = true;
    } finally {
      const duration = Date.now() - start;
      this.flowTracker.trackEventHandling(
        event.eventType,
        'OrderPlacedEventHandler',
        duration,
        success
      );
    }
  }
}

// Konfiguracja reportera metryk
const prometheusReporter = new PrometheusMetricsReporter('http://prometheus:9090');

// Raportowanie metryk co 10 sekund
setInterval(async () => {
  const samples = metricsCollector.getSamples();
  await prometheusReporter.report(samples);
}, 10000);
```

## 6. Mechanizmy Resilience

### Cel
Zapewnienie odporności systemu na awarie, przeciążenia i inne problemy, umożliwiając mu działanie w trudnych warunkach i automatyczne przywracanie się do normalnego stanu.

### Kluczowe Komponenty

```typescript
// Polityka ponawiania
export interface IRetryPolicy {
  // Sprawdza, czy operacja powinna być ponowiona
  shouldRetry(attemptNumber: number, error: Error): boolean;
  
  // Oblicza opóźnienie przed kolejną próbą
  getDelay(attemptNumber: number): number;
  
  // Maksymalna liczba prób
  maxAttempts: number;
}

// Builder dla polityki ponawiania
export interface IRetryPolicyBuilder {
  // Ustawia maksymalną liczbę prób
  withMaxAttempts(maxAttempts: number): this;
  
  // Ustawia stałe opóźnienie
  withFixedDelay(delayMs: number): this;
  
  // Ustawia wykładnicze opóźnienie
  withExponentialBackoff(
    initialDelayMs: number,
    maxDelayMs: number,
    factor?: number
  ): this;
  
  // Dodaje jitter do opóźnienia
  withJitter(jitterFactor: number): this;
  
  // Ustawia typy błędów, które powinny być ponawiane
  retryOn(...errorTypes: (new (...args: any[]) => Error)[]): this;
  
  // Ustawia predykat dla błędów, które powinny być ponawiane
  retryIf(predicate: (error: Error) => boolean): this;
  
  // Buduje politykę ponawiania
  build(): IRetryPolicy;
}

// Circuit Breaker
export interface ICircuitBreaker {
  // Wykonuje operację przez circuit breaker
  execute<T>(operation: () => Promise<T>): Promise<T>;
  
  // Aktualny stan circuit breaker'a
  getState(): CircuitBreakerState;
  
  // Ręcznie otwiera circuit breaker
  open(): void;
  
  // Ręcznie zamyka circuit breaker
  close(): void;
  
  // Ręcznie przełącza circuit breaker w stan półotwarty
  halfOpen(): void;
  
  // Metadane circuit breaker'a
  getMetadata(): CircuitBreakerMetadata;
}

// Stan circuit breaker'a
export enum CircuitBreakerState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half-open'
}

// Metadane circuit breaker'a
export interface CircuitBreakerMetadata {
  failureCount: number;
  successCount: number;
  lastFailure?: {
    timestamp: Date;
    error: Error;
  };
  lastSuccess?: {
    timestamp: Date;
  };
  totalAttempts: number;
}

// Builder dla circuit breaker'a
export interface ICircuitBreakerBuilder {
  // Ustawia próg błędów
  withFailureThreshold(threshold: number): this;
  
  // Ustawia próg sukcesów dla przejścia z HALF_OPEN do CLOSED
  withSuccessThreshold(threshold: number): this;
  
  // Ustawia czas resetu
  withResetTimeout(timeoutMs: number): this;
  
  // Ustawia typy błędów, które powinny być liczone jako awarie
  failOn(...errorTypes: (new (...args: any[]) => Error)[]): this;
  
  // Ustawia predykat dla błędów, które powinny być liczone jako awarie
  failIf(predicate: (error: Error) => boolean): this;
  
  // Buduje circuit breaker
  build(): ICircuitBreaker;
}

// Timeout
export interface ITimeout {
  // Wykonuje operację z timeoutem
  execute<T>(operation: () => Promise<T>, timeoutMs: number): Promise<T>;
}

// Bulkhead
export interface IBulkhead {
  // Wykonuje operację przez bulkhead
  execute<T>(operation: () => Promise<T>): Promise<T>;
  
  // Dostępne sloty
  getAvailableSlots(): number;
  
  // Wielkość kolejki
  getQueueSize(): number;
}

// Facade dla wszystkich mechanizmów resilience
export interface IResilienceProvider {
  // Tworzy retry policy
  createRetryPolicy(): IRetryPolicyBuilder;
  
  // Tworzy circuit breaker
  createCircuitBreaker(): ICircuitBreakerBuilder;
  
  // Tworzy timeout
  createTimeout(): ITimeout;
  
  // Tworzy bulkhead
  createBulkhead(maxConcurrent: number, maxQueue: number): IBulkhead;
  
  // Tworzy kompozytną strategię resilience
  compose(name: string): IResilienceStrategyComposer;
}

// Kompozytor strategii resilience
export interface IResilienceStrategyComposer {
  // Dodaje retry policy
  withRetry(policy: IRetryPolicy): this;
  
  // Dodaje circuit breaker
  withCircuitBreaker(circuitBreaker: ICircuitBreaker): this;
  
  // Dodaje timeout
  withTimeout(timeoutMs: number): this;
  
  // Dodaje bulkhead
  withBulkhead(bulkhead: IBulkhead): this;
  
  // Buduje strategię
  build(): IResilienceStrategy;
}

// Strategia resilience
export interface IResilienceStrategy {
  // Wykonuje operację z wszystkimi mechanizmami resilience
  execute<T>(operation: () => Promise<T>): Promise<T>;
  
  // Nazwa strategii
  name: string;
}
```

### Integracja
- **Z Event Bus**: Resilience dla obsługi zdarzeń
- **Z Domain Services**: Resilience dla operacji domenowych
- **Z External Systems**: Resilience dla integracji z zewnętrznymi systemami
- **Z Repository**: Resilience dla operacji bazodanowych

### Przykład Użycia

```typescript
// Tworzenie dostawcy mechanizmów resilience
const resilienceProvider = new ResilienceProvider();

// Tworzenie polityki ponawiania
const retryPolicy = resilienceProvider.createRetryPolicy()
  .withMaxAttempts(3)
  .withExponentialBackoff(100, 2000, 2)
  .withJitter(0.2)
  .retryOn(NetworkError, DatabaseTimeoutError)
  .build();

// Tworzenie circuit breaker'a
const circuitBreaker = resilienceProvider.createCircuitBreaker()
  .withFailureThreshold(5)
  .withSuccessThreshold(2)
  .withResetTimeout(30000)
  .failOn(ServiceUnavailableError)
  .build();

// Tworzenie timeouta
const timeout = resilienceProvider.createTimeout();

// Tworzenie bulkhead'a
const bulkhead = resilienceProvider.createBulkhead(10, 5);

// Tworzenie kompozytnej strategii
const paymentServiceStrategy = resilienceProvider.compose('PaymentService')
  .withRetry(retryPolicy)
  .withCircuitBreaker(circuitBreaker)
  .withTimeout(5000)
  .withBulkhead(bulkhead)
  .build();

// Używanie w serwisie
class PaymentService {
  constructor(
    private paymentGateway: PaymentGateway,
    private resilience: IResilienceStrategy
  ) {}
  
  async processPayment(paymentRequest: PaymentRequest): Promise<PaymentResult> {
    return this.resilience.execute(async () => {
      return await this.paymentGateway.process(paymentRequest);
    });
  }
}

// Używanie z Event Handler'em
class OrderPaymentHandler implements IEventHandler<OrderCreatedEvent> {
  constructor(
    private paymentService: PaymentService,
    private retryPolicy: IRetryPolicy
  ) {}
  
  async handle(event: OrderCreatedEvent): Promise<void> {
    let attempt = 0;
    
    while (true) {
      try {
        await this.paymentService.processPayment({
          orderId: event.payload.orderId,
          amount: event.payload.amount,
          customerId: event.payload.customerId
        });
        break;
      } catch (error) {
        attempt++;
        if (!this.retryPolicy.shouldRetry(attempt, error)) {
          throw error;
        }
        
        const delay = this.retryPolicy.getDelay(attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}
```

## 7. Rozszerzone Middleware dla Advanced Scenarios

### Cel
Zapewnienie elastycznego i kompozycyjnego mechanizmu middleware dla Event Bus, umożliwiającego budowanie zaawansowanych pipeline'ów przetwarzania zdarzeń, logowania, monitorowania i innych scenariuszy.

### Kluczowe Komponenty

```typescript
// Kontekst wykonania middleware
export interface IMiddlewareContext<TEvent = any> {
  // Zdarzenie, które jest przetwarzane
  event: TEvent;
  
  // Metadane wykonania
  metadata: Record<string, any>;
  
  // Timestamp rozpoczęcia przetwarzania
  startTimestamp: Date;
  
  // Ustawia metadane
  setMetadata(key: string, value: any): void;
  
  // Pobiera metadane
  getMetadata<T>(key: string): T | undefined;
  
  // Dodaje tag do zdarzenia
  addTag(tag: string): void;
  
  // Sprawdza, czy zdarzenie ma tag
  hasTag(tag: string): boolean;
  
  // Pobiera wszystkie tagi
  getTags(): string[];
}

// Rozszerzone Middleware z kontekstem
export type ContextAwareMiddleware<TEvent = any> = (
  context: IMiddlewareContext<TEvent>,
  next: (context: IMiddlewareContext<TEvent>) => Promise<void>
) => Promise<void>;

// Builder Pipeline'a Middleware
export interface IMiddlewarePipelineBuilder<TEvent = any> {
  // Dodaje middleware do pipeline'a
  use(middleware: ContextAwareMiddleware<TEvent>): this;
  
  // Dodaje middleware tylko dla określonych typów zdarzeń
  useFor(
    eventTypes: string[],
    middleware: ContextAwareMiddleware<TEvent>
  ): this;
  
  // Dodaje middleware z warunkiem
  useWhen(
    condition: (event: TEvent) => boolean,
    middleware: ContextAwareMiddleware<TEvent>
  ): this;
  
  // Dodaje obsługę błędów
  useErrorHandler(
    handler: (error: Error, context: IMiddlewareContext<TEvent>) => Promise<void>
  ): this;
  
  // Buduje pipeline middleware
  build(): (event: TEvent) => Promise<void>;
}

// Rejestr fabryczny dla middleware
export interface IMiddlewareRegistry {
  // Rejestruje fabrykę middleware
  register<TOptions = any>(
    name: string,
    factory: (options?: TOptions) => ContextAwareMiddleware
  ): this;
  
  // Tworzy middleware
  create<TOptions = any>(
    name: string,
    options?: TOptions
  ): ContextAwareMiddleware;
  
  // Sprawdza, czy middleware jest zarejestrowane
  has(name: string): boolean;
  
  // Pobiera wszystkie zarejestrowane nazwy middleware
  getRegisteredNames(): string[];
}

// Dekorator dla wrapowania event handlerów middleware'm
export interface IEventHandlerDecorator {
  // Dekoruje handler middleware'm
  decorate<TEvent>(
    handler: IEventHandler<TEvent>,
    middleware: ContextAwareMiddleware<TEvent>
  ): IEventHandler<TEvent>;
}
```

### Integracja
- **Z Event Bus**: Rozszerzenie standardowego middleware
- **Z Event Handler**: Dekorowanie handlerów middleware'm
- **Z Metrics**: Zbieranie metryk przez middleware
- **Z Logging**: Logowanie przez middleware
- **Z Tracing**: Śledzenie przez middleware

### Przykład Użycia

```typescript
// Tworzenie rejestru middleware
const middlewareRegistry = new MiddlewareRegistry();

// Rejestracja middleware logowania
middlewareRegistry.register('logging', (options?: { level?: string }) => {
  return async (context, next) => {
    const { event } = context;
    const level = options?.level || 'info';
    
    logger.log(level, `Processing event: ${event.eventType}`, {
      eventId: event.metadata?.eventId,
      timestamp: event.metadata?.timestamp
    });
    
    try {
      await next(context);
      logger.log(level, `Completed event: ${event.eventType}`);
    } catch (error) {
      logger.error(`Error processing event: ${event.eventType}`, error);
      throw error;
    }
  };
});

// Rejestracja middleware metryk
middlewareRegistry.register('metrics', (options?: { prefix?: string }) => {
  return async (context, next) => {
    const { event } = context;
    const prefix = options?.prefix || 'event';
    const start = Date.now();
    const metricsKey = `${prefix}_${event.eventType}_processing_time`;
    
    context.setMetadata('processingStart', start);
    
    try {
      await next(context);
      
      // Pomiar czasu przetwarzania
      const duration = Date.now() - start;
      metricsCollector.recordHistogram(metricsKey, duration, {
        eventType: event.eventType
      });
      
      metricsCollector.incrementCounter(`${prefix}_processed_count`, 1, {
        eventType: event.eventType,
        success: 'true'
      });
    } catch (error) {
      // Pomiar błędów
      metricsCollector.incrementCounter(`${prefix}_error_count`, 1, {
        eventType: event.eventType,
        errorType: error.constructor.name
      });
      throw error;
    }
  };
});

// Tworzenie buildera pipeline'a
const pipelineBuilder = new MiddlewarePipelineBuilder<IDomainEvent>();

// Budowanie pipeline'a
pipelineBuilder
  .use(middlewareRegistry.create('logging', { level: 'debug' }))
  .use(middlewareRegistry.create('metrics', { prefix: 'domain_event' }))
  .useFor(['OrderPlaced', 'OrderCancelled'], async (context, next) => {
    context.addTag('order-management');
    await next(context);
  })
  .useWhen(
    event => event.metadata?.priority === 'high',
    async (context, next) => {
      context.addTag('high-priority');
      // Priorytetowa obsługa
      await next(context);
    }
  )
  .useErrorHandler(async (error, context) => {
    const { event } = context;
    
    logger.error(`Unhandled error processing event: ${event.eventType}`, {
      eventId: event.metadata?.eventId,
      error: error.message,
      stack: error.stack
    });
    
    // Zapisywanie błędów do monitoringu
    await errorMonitoring.captureError(error, {
      tags: {
        eventType: event.eventType,
        ...Object.fromEntries(
          context.getTags().map(tag => [tag, true])
        )
      },
      extra: {
        eventId: event.metadata?.eventId,
        metadata: event.metadata
      }
    });
  });

// Tworzenie pipeline'a
const eventPipeline = pipelineBuilder.build();

// Używanie z Event Bus
eventBus.use(async event => {
  const context: IMiddlewareContext = {
    event,
    metadata: {},
    startTimestamp: new Date(),
    setMetadata: (key, value) => { context.metadata[key] = value; },
    getMetadata: (key) => context.metadata[key],
    addTag: (tag) => { context.metadata.tags = [...(context.metadata.tags || []), tag]; },
    hasTag: (tag) => (context.metadata.tags || []).includes(tag),
    getTags: () => context.metadata.tags || []
  };
  
  await eventPipeline(context);
});
```

## 8. Lazy Loading Dużych Agregatów

### Cel
Umożliwienie efektywnego ładowania dużych agregatów poprzez opóźnione ładowanie ich części (np. kolekcji elementów), co poprawia wydajność systemu i zmniejsza zużycie pamięci.

### Kluczowe Komponenty

```typescript
// Fabryka referencji Lazy
export interface ILazyReferenceFactory {
  // Tworzy lazy referencję
  createLazyReference<T>(
    id: any,
    loader: (id: any) => Promise<T | null>
  ): ILazyReference<T>;
  
  // Tworzy lazy kolekcję
  createLazyCollection<T>(
    parentId: any,
    loader: (parentId: any) => Promise<T[]>
  ): ILazyCollection<T>;
}

// Lazy referencja
export interface ILazyReference<T> {
  // Pobiera identyfikator
  getId(): any;
  
  // Sprawdza, czy obiekt jest załadowany
  isLoaded(): boolean;
  
  // Ładuje obiekt, jeśli nie jest jeszcze załadowany
  load(): Promise<T | null>;
  
  // Pobiera załadowany obiekt
  getValue(): T | null;
  
  // Ustawia wartość (ręcznie)
  setValue(value: T | null): void;
}

// Lazy kolekcja
export interface ILazyCollection<T> extends Iterable<T> {
  // Sprawdza, czy kolekcja jest załadowana
  isLoaded(): boolean;
  
  // Ładuje kolekcję, jeśli nie jest jeszcze załadowana
  load(): Promise<T[]>;
  
  // Pobiera załadowaną kolekcję
  getItems(): T[];
  
  // Dodaje element do kolekcji
  add(item: T): void;
  
  // Usuwa element z kolekcji
  remove(item: T): boolean;
  
  // Pobiera liczbę elementów
  size(): number;
  
  // Resetuje stan (wymusza ponowne załadowanie)
  reset(): void;
}

// Dostawca usługi Lazy Loading
export interface ILazyLoadingProvider {
  // Tworzy lazy referencję
  lazyReference<T>(
    id: any,
    loader: (id: any) => Promise<T | null>
  ): ILazyReference<T>;
  
  // Tworzy lazy kolekcję
  lazyCollection<T>(
    parentId: any,
    loader: (parentId: any) => Promise<T[]>
  ): ILazyCollection<T>;
  
  // Ręcznie ładuje wszystkie lazy referencje w obiekcie
  loadLazyProperties<T>(object: T): Promise<T>;
}

// Abstrakcyjna klasa dla agregatów z lazy loading
export abstract class LazyLoadableAggregate<TId> extends AggregateRoot<TId> {
  // Lazy loader dla agregatów
  protected readonly lazyLoader: ILazyLoadingProvider;
  
  constructor(id: TId, lazyLoader: ILazyLoadingProvider) {
    super(id);
    this.lazyLoader = lazyLoader;
  }
  
  // Ładuje wszystkie lazy properties
  async loadAllLazyProperties(): Promise<void> {
    await this.lazyLoader.loadLazyProperties(this);
  }
}

// Dekorator do oznaczania lazy properties
export function LazyProperty<T>(
  loader: (obj: any, propertyKey: string) => Promise<T>
): PropertyDecorator {
  return function(target: any, propertyKey: string | symbol) {
    const privatePropKey = `_lazy_${String(propertyKey)}`;
    
    // Definicja gettera i settera
    Object.defineProperty(target, propertyKey, {
      get: function() {
        // Lazy inicjalizacja
        if (!this[privatePropKey]) {
          this[privatePropKey] = this.lazyLoader.lazyReference(
            this.id,
            () => loader(this, String(propertyKey))
          );
        }
        return this[privatePropKey].getValue();
      },
      enumerable: true,
      configurable: true
    });
  };
}

// Dekorator do oznaczania lazy kolekcji
export function LazyCollection<T>(
  loader: (obj: any, propertyKey: string) => Promise<T[]>
): PropertyDecorator {
  return function(target: any, propertyKey: string | symbol) {
    const privatePropKey = `_lazy_${String(propertyKey)}`;
    
    // Definicja gettera i settera
    Object.defineProperty(target, propertyKey, {
      get: function() {
        // Lazy inicjalizacja
        if (!this[privatePropKey]) {
          this[privatePropKey] = this.lazyLoader.lazyCollection(
            this.id,
            () => loader(this, String(propertyKey))
          );
        }
        return this[privatePropKey];
      },
      enumerable: true,
      configurable: true
    });
  };
}
```

### Integracja
- **Z Agregat**: Lazy loading referencji i kolekcji
- **Z Repository**: Ładowanie części agregatów na żądanie
- **Z Entity**: Lazy loading relacji
- **Z Domain Events**: Odtwarzanie stanu agregatów bez ładowania wszystkich elementów

### Przykład Użycia

```typescript
// Definicja agregatu z lazy loading
class Order extends LazyLoadableAggregate<OrderId> {
  private customerId: CustomerId;
  private status: OrderStatus;
  
  // Lazy kolekcja elementów zamówienia
  @LazyCollection<OrderItem>(
    (order, prop) => orderItemRepository.findByOrderId(order.id)
  )
  private items!: ILazyCollection<OrderItem>;
  
  // Lazy referencja do klienta
  @LazyProperty<Customer>(
    (order, prop) => customerRepository.findById(order.customerId)
  )
  private customer!: Customer | null;
  
  constructor(
    id: OrderId, 
    customerId: CustomerId,
    lazyLoader: ILazyLoadingProvider
  ) {
    super(id, lazyLoader);
    this.customerId = customerId;
    this.status = OrderStatus.CREATED;
  }
  
  // Metoda, która nie wymaga ładowania elementów
  getStatus(): OrderStatus {
    return this.status;
  }
  
  // Metoda, która wymaga ładowania elementów
  async getTotalAmount(): Promise<Money> {
    // Lazy loading elementów
    await this.items.load();
    
    let total = Money.zero('USD');
    for (const item of this.items.getItems()) {
      total = total.add(item.getPrice().multiply(item.getQuantity()));
    }
    
    return total;
  }
  
  // Metoda dodająca element (nie wymaga ładowania wszystkich elementów)
  addItem(item: OrderItem): void {
    // Jeśli kolekcja jest już załadowana, dodajemy bezpośrednio
    if (this.items.isLoaded()) {
      this.items.add(item);
    }
    
    // Zawsze emitujemy zdarzenie, które zaktualizuje stan
    this.apply('OrderItemAdded', {
      orderId: this.id.value,
      item: {
        productId: item.getProductId().value,
        quantity: item.getQuantity(),
        price: item.getPrice().toPlainObject()
      }
    });
  }
  
  // Obsługa zdarzenia dodania elementu
  protected onOrderItemAdded(payload: any): void {
    // Jeśli kolekcja jest już załadowana, dodajemy element
    if (this.items.isLoaded()) {
      const item = new OrderItem(
        new OrderItemId(uuid()),
        new ProductId(payload.item.productId),
        payload.item.quantity,
        Money.fromPlainObject(payload.item.price)
      );
      
      this.items.add(item);
    }
  }
}

// Użycie w repository
class OrderRepository implements IRepository<Order> {
  constructor(
    private database: Database,
    private lazyLoader: ILazyLoadingProvider
  ) {}
  
  async findById(id: OrderId): Promise<Order | null> {
    const orderData = await this.database.orders.findOne({
      where: { id: id.value }
    });
    
    if (!orderData) {
      return null;
    }
    
    // Tworzenie agregatu bez ładowania wszystkich elementów
    return new Order(
      id,
      new CustomerId(orderData.customerId),
      this.lazyLoader
    );
  }
}

// Używanie agregatu
const order = await orderRepository.findById(orderId);

// Operacja, która nie wymaga ładowania elementów
const status = order.getStatus();

// Operacja, która wymaga ładowania elementów
const totalAmount = await order.getTotalAmount();
```

## 9. Optymistyczne Blokowanie z Obsługą Konfliktów

### Cel
Umożliwienie wielu użytkownikom równoczesną pracę na tych samych agregatach, wykrywanie konfliktów zmian i ich inteligentne rozwiązywanie, zapewniając spójność danych bez blokowania zasobów.

### Kluczowe Komponenty

```typescript
// Strategie rozwiązywania konfliktów
export enum ConflictResolutionStrategy {
  THROW_ERROR = 'throw_error',
  LAST_WINS = 'last_wins',
  FIRST_WINS = 'first_wins',
  MANUAL_MERGE = 'manual_merge',
  CUSTOM = 'custom'
}

// Informacja o konflikcie
export interface IConflictInfo<T> {
  // Obiekt, który próbowano zapisać
  currentVersion: T;
  
  // Obiekt, który już istnieje w repozytorium
  persistedVersion: T;
  
  // Numer wersji, który próbowano zapisać
  currentVersionNumber: number;
  
  // Numer wersji, który istnieje w repozytorium
  persistedVersionNumber: number;
  
  // Zdarzenia, które próbowano zastosować
  currentEvents: IDomainEvent[];
  
  // Zdarzenia, które zostały zastosowane w przechowywanej wersji
  persistedEvents: IDomainEvent[];
}

// Wynik rozwiązania konfliktu
export interface IConflictResolutionResult<T> {
  // Czy konflikt został rozwiązany
  resolved: boolean;
  
  // Rezultat rozwiązania konfliktu
  mergedVersion?: T;
  
  // Zdarzenia po scaleniu
  mergedEvents?: IDomainEvent[];
  
  // Nowy numer wersji
  newVersionNumber?: number;
}

// Strategia rozwiązywania konfliktów
export interface IConflictResolutionHandler<T> {
  // Rozwiązuje konflikt
  resolve(conflict: IConflictInfo<T>): Promise<IConflictResolutionResult<T>>;
  
  // Identyfikator strategii
  strategy: ConflictResolutionStrategy | string;
}

// Dostawca strategii rozwiązywania konfliktów
export interface IConflictResolutionProvider {
  // Rejestruje handler dla określonego typu obiektu
  registerHandler<T>(
    objectType: string,
    handler: IConflictResolutionHandler<T>
  ): this;
  
  // Pobiera handler dla określonego typu obiektu
  getHandler<T>(objectType: string): IConflictResolutionHandler<T> | undefined;
  
  // Rozwiązuje konflikt
  resolveConflict<T>(
    objectType: string,
    conflict: IConflictInfo<T>
  ): Promise<IConflictResolutionResult<T>>;
}

// Rozszerzenie interfejsu repozytorium o obsługę konfliktów
export interface IVersionedRepository<T extends AggregateRoot<any>> extends IRepository<T> {
  // Zapisuje agregat z określoną strategią rozwiązywania konfliktów
  saveWithConflictResolution(
    aggregate: T,
    strategy?: ConflictResolutionStrategy | string
  ): Promise<void>;
  
  // Pobiera historię wersji agregatu
  getVersionHistory(id: any): Promise<{ version: number; timestamp: Date }[]>;
  
  // Pobiera określoną wersję agregatu
  getByVersion(id: any, version: number): Promise<T | null>;
}

// Detektor zmian do wykrywania konfliktów
export interface IChangeDetector<T> {
  // Wykrywa zmiany między dwoma wersjami
  detectChanges(oldVersion: T, newVersion: T): IChange[];
}

// Zmiana w obiekcie
export interface IChange {
  // Ścieżka do zmienionej właściwości
  path: string;
  
  // Stara wartość
  oldValue: any;
  
  // Nowa wartość
  newValue: any;
  
  // Typ zmiany
  type: 'add' | 'remove' | 'update';
}

// Merger do scalania zmian
export interface IMergeHandler<T> {
  // Scala zmiany z dwóch wersji
  merge(base: T, ours: T, theirs: T): T;
}
```

### Integracja
- **Z Repository**: Wersjonowanie i wykrywanie konfliktów
- **Z Aggregat**: Śledzenie wersji i zmian
- **Z Domain Events**: Rozwiązywanie konfliktów na poziomie zdarzeń
- **Z Unit of Work**: Zarządzanie transakcjami z obsługą konfliktów

### Przykład Użycia

```typescript
// Implementacja repozytorium z wersjonowaniem
class VersionedOrderRepository implements IVersionedRepository<Order> {
  constructor(
    private database: Database,
    private conflictProvider: IConflictResolutionProvider
  ) {}
  
  async findById(id: OrderId): Promise<Order | null> {
    const orderData = await this.database.orders.findOne({
      where: { id: id.value }
    });
    
    if (!orderData) {
      return null;
    }
    
    const order = OrderMapper.toDomain(orderData);
    order.setVersion(orderData.version);
    return order;
  }
  
  async save(order: Order): Promise<void> {
    // Standardowa implementacja z kontrolą wersji
    const currentVersion = order.getVersion();
    const data = OrderMapper.toData(order);
    
    const result = await this.database.orders.updateOne(
      { id: order.getId().value, version: currentVersion },
      { $set: { ...data, version: currentVersion + 1 } }
    );
    
    if (result.modifiedCount === 0) {
      throw new VersionConflictError(
        order.getId().value,
        'Order',
        currentVersion
      );
    }
    
    order.incrementVersion();
  }
  
  async saveWithConflictResolution(
    order: Order,
    strategy: ConflictResolutionStrategy = ConflictResolutionStrategy.THROW_ERROR
  ): Promise<void> {
    try {
      await this.save(order);
    } catch (error) {
      if (error instanceof VersionConflictError) {
        // Pobierz aktualną wersję z bazy
        const persistedOrder = await this.findById(order.getId());
        
        if (!persistedOrder) {
          throw new Error('Order not found');
        }
        
        // Przygotuj informacje o konflikcie
        const conflict: IConflictInfo<Order> = {
          currentVersion: order,
          persistedVersion: persistedOrder,
          currentVersionNumber: order.getVersion(),
          persistedVersionNumber: persistedOrder.getVersion(),
          currentEvents: order.getDomainEvents(),
          persistedEvents: [] // W praktyce trzeba by pobrać z historii
        };
        
        // Próba rozwiązania konfliktu
        const resolution = await this.conflictProvider.resolveConflict(
          'Order',
          conflict
        );
        
        if (!resolution.resolved) {
          throw new Error('Could not resolve conflict');
        }
        
        // Zapisz scaloną wersję
        const mergedOrder = resolution.mergedVersion!;
        mergedOrder.setVersion(resolution.newVersionNumber!);
        
        // Zapisz bez sprawdzania wersji
        await this.database.orders.updateOne(
          { id: order.getId().value },
          { $set: OrderMapper.toData(mergedOrder) }
        );
        
        // Aktualizuj lokalny obiekt
        Object.assign(order, mergedOrder);
        order.setVersion(resolution.newVersionNumber!);
      } else {
        throw error;
      }
    }
  }
  
  async getVersionHistory(id: OrderId): Promise<{ version: number; timestamp: Date }[]> {
    const history = await this.database.orderHistory.find(
      { orderId: id.value },
      { sort: { version: 1 } }
    );
    
    return history.map(h => ({ version: h.version, timestamp: h.timestamp }));
  }
  
  async getByVersion(id: OrderId, version: number): Promise<Order | null> {
    const orderData = await this.database.orderHistory.findOne({
      orderId: id.value,
      version
    });
    
    if (!orderData) {
      return null;
    }
    
    const order = OrderMapper.toDomain(orderData.data);
    order.setVersion(version);
    return order;
  }
}

// Konfiguracja obsługi konfliktów
const conflictProvider = new ConflictResolutionProvider();

// Rejestracja handlera dla zamówień
conflictProvider.registerHandler('Order', {
  strategy: ConflictResolutionStrategy.MANUAL_MERGE,
  async resolve(conflict) {
    const { currentVersion, persistedVersion } = conflict;
    
    // Wykrywanie zmian
    const changes = changeDetector.detectChanges(
      persistedVersion,
      currentVersion
    );
    
    // Jeśli nie ma konfliktujących zmian, możemy łatwo scalić
    if (!hasConflictingChanges(changes, persistedVersion)) {
      // Aplikuj nasze zmiany do aktualnej wersji
      const mergedOrder = applyChanges(persistedVersion, changes);
      
      return {
        resolved: true,
        mergedVersion: mergedOrder,
        newVersionNumber: persistedVersion.getVersion() + 1
      };
    }
    
    // Wymagane ręczne scalenie
    return {
      resolved: false
    };
  }
});

// Używanie w serwisie
class OrderService {
  constructor(private orderRepository: VersionedOrderRepository) {}
  
  async updateOrder(
    orderId: OrderId,
    updateData: Partial<OrderData>
  ): Promise<Order> {
    // Pobierz zamówienie
    const order = await this.orderRepository.findById(orderId);
    
    if (!order) {
      throw new Error('Order not found');
    }
    
    // Zastosuj aktualizacje
    if (updateData.items) {
      updateData.items.forEach(item => {
        order.updateItem(
          new ProductId(item.productId),
          item.quantity
        );
      });
    }
    
    if (updateData.shippingAddress) {
      order.updateShippingAddress(
        AddressMapper.toDomain(updateData.shippingAddress)
      );
    }
    
    // Zapisz z obsługą konfliktów
    await this.orderRepository.saveWithConflictResolution(
      order,
      ConflictResolutionStrategy.MANUAL_MERGE
    );
    
    return order;
  }
}
```

## 10. Integracja z Bibliotekami Walidacyjnymi

### Cel
Umożliwienie integracji z popularnymi bibliotekami walidacyjnymi (Zod, Yup, class-validator) przy zachowaniu spójnego interfejsu walidacji w całej aplikacji.

### Kluczowe Komponenty

```typescript
// Adapter dla zewnętrznych walidatorów
export interface IExternalValidatorAdapter<TValidator, TOptions = any> {
  // Nazwa biblioteki
  readonly libraryName: string;
  
  // Adaptuje zewnętrzny walidator
  adapt(validator: TValidator, options?: TOptions): IValidator<any>;
  
  // Przekształca błędy walidacji z zewnętrznej biblioteki
  translateErrors(externalErrors: any): ValidationErrors;
}

// Factory dla adaptera walidatora
export interface IValidatorAdapterFactory {
  // Tworzy adapter dla określonej biblioteki
  createAdapter<TValidator, TOptions>(
    libraryName: string
  ): IExternalValidatorAdapter<TValidator, TOptions> | undefined;
  
  // Rejestruje adapter dla określonej biblioteki
  registerAdapter<TValidator, TOptions>(
    adapter: IExternalValidatorAdapter<TValidator, TOptions>
  ): this;
  
  // Sprawdza, czy adapter jest dostępny
  hasAdapter(libraryName: string): boolean;
  
  // Pobiera wszystkie dostępne adaptery
  getAvailableAdapters(): string[];
}

// Provider dla zewnętrznych walidatorów
export interface IExternalValidatorProvider {
  // Tworzy walidator z Zod schema
  fromZod<T>(schema: any, options?: any): IValidator<T>;
  
  // Tworzy walidator z Yup schema
  fromYup<T>(schema: any, options?: any): IValidator<T>;
  
  // Tworzy walidator z class-validator
  fromClassValidator<T>(targetClass: new () => T, options?: any): IValidator<T>;
  
  // Tworzy walidator z ogólnego zewnętrznego walidatora
  fromExternal<T, V>(
    validator: V,
    libraryName: string,
    options?: any
  ): IValidator<T>;
}

// Adapter dla Zod
export class ZodValidatorAdapter implements IExternalValidatorAdapter<any, any> {
  readonly libraryName = 'zod';
  
  adapt(schema: any, options?: any): IValidator<any> {
    return {
      validate: (value: any): Result<any, ValidationErrors> => {
        try {
          const result = schema.parse(value);
          return Result.ok(result);
        } catch (error) {
          return Result.fail(this.translateErrors(error));
        }
      }
    };
  }
  
  translateErrors(zodError: any): ValidationErrors {
    // Implementacja translacji błędów Zod na ValidationErrors
    const errors: ValidationError[] = [];
    
    if (zodError.errors) {
      for (const error of zodError.errors) {
        errors.push(new ValidationError(
          error.path.join('.'),
          error.message
        ));
      }
    }
    
    return new ValidationErrors(errors);
  }
}

// Adapter dla Yup
export class YupValidatorAdapter implements IExternalValidatorAdapter<any, any> {
  readonly libraryName = 'yup';
  
  adapt(schema: any, options?: any): IValidator<any> {
    return {
      validate: async (value: any): Promise<Result<any, ValidationErrors>> => {
        try {
          const result = await schema.validate(value, {
            abortEarly: false,
            ...options
          });
          return Result.ok(result);
        } catch (error) {
          return Result.fail(this.translateErrors(error));
        }
      }
    };
  }
  
  translateErrors(yupError: any): ValidationErrors {
    // Implementacja translacji błędów Yup na ValidationErrors
    const errors: ValidationError[] = [];
    
    if (yupError.inner) {
      for (const error of yupError.inner) {
        errors.push(new ValidationError(
          error.path,
          error.message
        ));
      }
    }
    
    return new ValidationErrors(errors);
  }
}

// Kompozycja walidatorów
export interface IValidatorComposer<T> {
  // Dodaje walidator do kompozycji
  add(validator: IValidator<T>): this;
  
  // Buduje kompozytowy walidator
  build(): IValidator<T>;
}
```

### Integracja
- **Z Validation**: Rozszerzenie istniejącego mechanizmu walidacji
- **Z Business Rules**: Integracja z regułami biznesowymi
- **Z Value Objects**: Walidacja obiektów wartości
- **Z Aggregat**: Walidacja agregatów
- **Z Command**: Walidacja komend

### Przykład Użycia

```typescript
// Konfiguracja adaptera walidatora
const validatorFactory = new ValidatorAdapterFactory();
validatorFactory.registerAdapter(new ZodValidatorAdapter());
validatorFactory.registerAdapter(new YupValidatorAdapter());
validatorFactory.registerAdapter(new ClassValidatorAdapter());

// Tworzenie providera
const validatorProvider = new ExternalValidatorProvider(validatorFactory);

// Używanie z Zod
import { z } from 'zod';

const addressSchema = z.object({
  street: z.string().min(5),
  city: z.string().min(2),
  zipCode: z.string().regex(/^\d{2}-\d{3}$/),
  country: z.string().min(2)
});

const addressValidator = validatorProvider.fromZod(addressSchema);

// Używanie z Yup
import * as yup from 'yup';

const customerSchema = yup.object({
  firstName: yup.string().required().min(2),
  lastName: yup.string().required().min(2),
  email: yup.string().required().email(),
  phone: yup.string().matches(/^\+\d{2}\s\d{9}$/)
});

const customerValidator = validatorProvider.fromYup(customerSchema);

// Używanie z class-validator
import { IsEmail, IsString, MinLength, Matches } from 'class-validator';

class UserDTO {
  @IsString()
  @MinLength(3)
  username!: string;
  
  @IsEmail()
  email!: string;
  
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
  password!: string;
}

const userValidator = validatorProvider.fromClassValidator(UserDTO);

// Łączenie walidatorów
const validatorComposer = new ValidatorComposer<Order>();

validatorComposer
  .add(orderBaseValidator) // Nasz własny walidator
  .add(validatorProvider.fromZod(orderZodSchema)) // Z Zod
  .add(validatorProvider.fromYup(orderYupSchema)) // Z Yup
  .add(validatorProvider.fromClassValidator(OrderDTO)); // Z class-validator

const combinedValidator = validatorComposer.build();

// Używanie w serwisie
class OrderService {
  constructor(
    private orderRepository: IRepository<Order>,
    private orderValidator: IValidator<Order>
  ) {}
  
  async createOrder(orderData: OrderData): Promise<Result<Order, ValidationErrors>> {
    // Tworzenie obiektu zamówienia
    const order = Order.create(
      new CustomerId(orderData.customerId),
      orderData.items.map(item => new OrderItem(
        new ProductId(item.productId),
        item.quantity,
        Money.fromAmount(item.price)
      )),
      AddressMapper.toDomain(orderData.shippingAddress)
    );
    
    // Walidacja zamówienia
    const validationResult = this.orderValidator.validate(order);
    if (validationResult.isFailure) {
      return validationResult;
    }
    
    // Zapisywanie zamówienia
    await this.orderRepository.save(order);
    
    return Result.ok(order);
  }
}
```

## 11. Reguły Walidacji z DSL

### Cel
Umożliwienie definiowania reguł walidacji w zwięzły, deklaratywny sposób, używając dedykowanego języka specyficznego dla domeny (DSL), co ułatwia tworzenie, zrozumienie i utrzymanie reguł walidacji.

### Kluczowe Komponenty

```typescript
// Parser reguł DSL
export interface IRuleParser {
  // Parsuje regułę DSL do funkcji walidującej
  parse<T>(rule: string): (value: T) => boolean;
  
  // Rejestruje funkcję pomocniczą
  registerHelper(name: string, fn: (...args: any[]) => any): this;
  
  // Rejestruje operator
  registerOperator(
    symbol: string,
    precedence: number,
    fn: (left: any, right: any) => any
  ): this;
}

// Kompilator reguł DSL
export interface IRuleCompiler {
  // Kompiluje regułę DSL do funkcji walidującej
  compile<T>(rule: string): (value: T) => boolean;
}

// Builder reguł
export interface IRuleBuilder<T> {
  // Dodaje regułę z DSL
  addRule(rule: string, message: string): IRuleBuilder<T>;
  
  // Łączy z innym builderem
  and(other: IRuleBuilder<T>): IRuleBuilder<T>;
  
  // Tworzy alternatywę z innym builderem
  or(other: IRuleBuilder<T>): IRuleBuilder<T>;
  
  // Tworzy negację
  not(): IRuleBuilder<T>;
  
  // Dodaje warunek
  when(condition: string | ((value: T) => boolean)): IConditionalRuleBuilder<T>;
  
  // Buduje walidator
  build(): IValidator<T>;
}

// Builder warunkowych reguł
export interface IConditionalRuleBuilder<T> {
  // Reguły do zastosowania, gdy warunek jest spełniony
  then(rules: (builder: IRuleBuilder<T>) => void): IRuleBuilder<T>;
  
  // Reguły do zastosowania, gdy warunek nie jest spełniony
  otherwise(rules: (builder: IRuleBuilder<T>) => void): IRuleBuilder<T>;
}

// Fabryka dla builderów reguł
export interface IRuleBuilderFactory {
  // Tworzy nowy builder reguł
  create<T>(): IRuleBuilder<T>;
  
  // Tworzy builder z reguł DSL
  fromDSL<T>(rules: string[]): IRuleBuilder<T>;
}

// Generator komunikatów błędów
export interface IErrorMessageGenerator {
  // Generuje komunikat błędu
  generate(rule: string, value: any): string;
}

// Rejestr reguł
export interface IRuleRegistry {
  // Rejestruje regułę
  registerRule(name: string, rule: string): this;
  
  // Pobiera regułę
  getRule(name: string): string | undefined;
  
  // Rejestruje zestaw reguł
  registerRuleSet(name: string, rules: string[]): this;
  
  // Pobiera zestaw reguł
  getRuleSet(name: string): string[] | undefined;
}
```

### Integracja
- **Z Validation**: Rozszerzenie istniejącego mechanizmu walidacji
- **Z Business Rules**: Integracja z regułami biznesowymi
- **Z Value Objects**: Walidacja obiektów wartości
- **Z Specification**: Tworzenie specyfikacji z reguł DSL

### Przykład Użycia

```typescript
// Tworzenie parsera reguł
const ruleParser = new RuleParser();

// Rejestracja pomocników
ruleParser.registerHelper('hasLength', (str, min, max) => 
  str && str.length >= min && str.length <= max
);

ruleParser.registerHelper('isEmail', (str) => 
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)
);

ruleParser.registerHelper('isPostalCode', (str) => 
  /^\d{2}-\d{3}$/.test(str)
);

// Rejestracja operatorów
ruleParser.registerOperator('&&', 2, (left, right) => left && right);
ruleParser.registerOperator('||', 1, (left, right) => left || right);
ruleParser.registerOperator('!', 3, (_, operand) => !operand);

// Tworzenie kompilatora
const ruleCompiler = new RuleCompiler(ruleParser);

// Tworzenie fabryki builderów reguł
const ruleBuilderFactory = new RuleBuilderFactory(ruleCompiler);

// Tworzenie rejestru reguł
const ruleRegistry = new RuleRegistry();

// Rejestracja reguł
ruleRegistry.registerRule(
  'validEmail',
  'isEmail(value.email)'
);

ruleRegistry.registerRule(
  'validName',
  'hasLength(value.firstName, 2, 50) && hasLength(value.lastName, 2, 50)'
);

ruleRegistry.registerRule(
  'validPostalCode',
  'isPostalCode(value.address.postalCode)'
);

// Rejestracja zestawu reguł
ruleRegistry.registerRuleSet('validPerson', [
  'validEmail',
  'validName',
  'value.age >= 18'
]);

// Używanie buildera reguł
const customerRuleBuilder = ruleBuilderFactory.create<Customer>();

customerRuleBuilder
  .addRule('hasLength(value.firstName, 2, 50)', 'First name must be between 2 and 50 characters')
  .addRule('hasLength(value.lastName, 2, 50)', 'Last name must be between 2 and 50 characters')
  .addRule('isEmail(value.email)', 'Invalid email format')
  .when('value.type === "business"')
    .then(builder => {
      builder.addRule('hasLength(value.companyName, 1, 100)', 'Company name is required')
            .addRule('value.vatNumber != null', 'VAT number is required');
    })
  .otherwise(builder => {
    builder.addRule('value.personalId != null', 'Personal ID is required');
  });

// Budowanie walidatora
const customerValidator = customerRuleBuilder.build();

// Walidacja
const result = customerValidator.validate(customer);

// Używanie zestawu reguł
const personRuleBuilder = ruleBuilderFactory.fromDSL(
  ruleRegistry.getRuleSet('validPerson')!
);

// Dodawanie warunków
personRuleBuilder.when('value.drivingLicense != null')
  .then(builder => {
    builder.addRule('value.drivingLicense.isValid()', 'Driving license must be valid');
  });

// Budowanie walidatora
const personValidator = personRuleBuilder.build();
```
