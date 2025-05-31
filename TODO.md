# Instrukcje Implementacji dla DomainTS

## 1. Projekcje i Materialized Views

### Cel
Umożliwienie tworzenia i zarządzania specjalnymi modelami odczytu (read models) zoptymalizowanymi pod kątem konkretnych zapytań, zasilanych przez zdarzenia domenowe.

### Kluczowe interfejsy do implementacji

```typescript
// core/projections/projection.interface.ts
export interface IProjection<TReadModel, TEvent = IDomainEvent> {
  handle(event: TEvent, readModel: TReadModel): Promise<TReadModel>;
  isInterested(event: TEvent): boolean;
}

// core/projections/projection-manager.interface.ts
export interface IProjectionManager<TReadModel> {
  registerProjection<TEvent>(projection: IProjection<TReadModel, TEvent>): this;
  updateReadModel(event: IDomainEvent, readModel: TReadModel): Promise<TReadModel>;
  createReadModel(eventStream: AsyncIterable<IDomainEvent>): Promise<TReadModel>;
}

// core/projections/read-model-repository.interface.ts
export interface IReadModelRepository<TReadModel> {
  save(readModel: TReadModel): Promise<void>;
  findById(id: string): Promise<TReadModel | null>;
  delete(id: string): Promise<void>;
}

// core/projections/projection-dispatcher.interface.ts
export interface IProjectionDispatcher {
  registerProjectionManager<TReadModel>(
    readModelType: string,
    manager: IProjectionManager<TReadModel>,
    repository: IReadModelRepository<TReadModel>,
    factory: IReadModelFactory<TReadModel>
  ): this;
  initialize(eventBus: IEventBus): Promise<void>;
}
```

### Plan implementacji
1. Stwórz folder `core/projections` z interfejsami
2. Zaimplementuj `ProjectionManager` - zarządza projekcjami dla danego read modelu
3. Zaimplementuj `ProjectionDispatcher` - łączy event bus z projekcjami
4. Dodaj przykład użycia (np. `OrderSummaryProjection`)
5. Napisz testy jednostkowe

### Integracje
- Z istniejącym Event Bus (subskrypcja na zdarzenia)
- Z Repository pattern (dla read models)
- Z Event Store (odtwarzanie projekcji)

---

## 2. Anti-Corruption Layer (ACL)

### Cel
Ochrona integralności modelu domeny poprzez tłumaczenie między różnymi kontekstami granicznymi (Bounded Contexts).

### Kluczowe interfejsy do implementacji

```typescript
// integration/acl/model-adapter.interface.ts
export interface IModelAdapter<TExternal, TInternal> {
  adaptToInternal(external: TExternal): TInternal;
  adaptToExternal(internal: TInternal): TExternal;
}

// integration/acl/context-translator.interface.ts
export interface IContextTranslator<TSourceContext, TTargetContext> {
  translate(sourceModel: TSourceContext): TTargetContext;
  sourceContextName: string;
  targetContextName: string;
}

// integration/acl/external-system-facade.interface.ts
export interface IExternalSystemFacade<TCommand, TResult> {
  execute(command: TCommand): Promise<TResult>;
  externalSystemName: string;
}

// integration/acl/acl-registry.interface.ts
export interface IACLRegistry {
  registerTranslator<TSource, TTarget>(
    translator: IContextTranslator<TSource, TTarget>
  ): this;
  
  registerAdapter<TExternal, TInternal>(
    externalType: string,
    adapter: IModelAdapter<TExternal, TInternal>
  ): this;
  
  registerFacade<TCommand, TResult>(
    facade: IExternalSystemFacade<TCommand, TResult>
  ): this;
  
  getTranslator<TSource, TTarget>(
    sourceContext: string,
    targetContext: string
  ): IContextTranslator<TSource, TTarget> | undefined;
  
  getAdapter<TExternal, TInternal>(
    externalType: string
  ): IModelAdapter<TExternal, TInternal> | undefined;
}
```

### Plan implementacji
1. Stwórz folder `integration/acl` z interfejsami
2. Zaimplementuj `ACLRegistry` - centralny rejestr translatorów i adapterów
3. Stwórz bazowe klasy abstrakcyjne dla adapterów i translatorów
4. Dodaj przykład (np. `CustomerAdapter`, `OrderToShippingTranslator`)
5. Napisz testy jednostkowe

### Integracje
- Z Event Bus (tłumaczenie zdarzeń między kontekstami)
- Z Domain Services (fasady dla zewnętrznych systemów)
- Z Integration Events

---

## 3. Lazy Loading Dużych Agregatów

### Cel
Umożliwienie efektywnego ładowania dużych agregatów poprzez opóźnione ładowanie ich części.

### Kluczowe interfejsy do implementacji

```typescript
// core/lazy-loading/lazy-reference.interface.ts
export interface ILazyReference<T> {
  getId(): any;
  isLoaded(): boolean;
  load(): Promise<T | null>;
  getValue(): T | null;
  setValue(value: T | null): void;
}

// core/lazy-loading/lazy-collection.interface.ts
export interface ILazyCollection<T> extends Iterable<T> {
  isLoaded(): boolean;
  load(): Promise<T[]>;
  getItems(): T[];
  add(item: T): void;
  remove(item: T): boolean;
  size(): number;
  reset(): void;
}

// core/lazy-loading/lazy-loading-provider.interface.ts
export interface ILazyLoadingProvider {
  lazyReference<T>(
    id: any,
    loader: (id: any) => Promise<T | null>
  ): ILazyReference<T>;
  
  lazyCollection<T>(
    parentId: any,
    loader: (parentId: any) => Promise<T[]>
  ): ILazyCollection<T>;
  
  loadLazyProperties<T>(object: T): Promise<T>;
}

// core/lazy-loading/lazy-loadable-aggregate.ts
export abstract class LazyLoadableAggregate<TId> extends AggregateRoot<TId> {
  protected readonly lazyLoader: ILazyLoadingProvider;
  
  constructor(id: TId, lazyLoader: ILazyLoadingProvider) {
    super(id);
    this.lazyLoader = lazyLoader;
  }
  
  async loadAllLazyProperties(): Promise<void> {
    await this.lazyLoader.loadLazyProperties(this);
  }
}
```

### Dekoratory TypeScript

```typescript
// core/lazy-loading/decorators.ts
export function LazyProperty<T>(
  loader: (obj: any, propertyKey: string) => Promise<T>
): PropertyDecorator;

export function LazyCollection<T>(
  loader: (obj: any, propertyKey: string) => Promise<T[]>
): PropertyDecorator;
```

### Plan implementacji
1. Stwórz folder `core/lazy-loading` z interfejsami
2. Zaimplementuj `LazyReference` i `LazyCollection`
3. Zaimplementuj `LazyLoadingProvider`
4. Stwórz dekoratory `@LazyProperty` i `@LazyCollection`
5. Rozszerz `AggregateRoot` o `LazyLoadableAggregate`
6. Dodaj przykład (np. `Order` z lazy-loaded `OrderItems`)
7. Napisz testy jednostkowe

### Integracje
- Z istniejącymi Agregatami (rozszerzenie AggregateRoot)
- Z Repository pattern (ładowanie części agregatów)
- Z Domain Events (obsługa lazy properties przy odtwarzaniu)

---

## Struktura folderów dla nowych funkcjonalności

```
src/
├── core/
│   ├── projections/
│   │   ├── interfaces/
│   │   ├── projection-manager.ts
│   │   ├── projection-dispatcher.ts
│   │   └── index.ts
│   └── lazy-loading/
│       ├── interfaces/
│       ├── lazy-reference.ts
│       ├── lazy-collection.ts
│       ├── lazy-loading-provider.ts
│       ├── decorators.ts
│       └── index.ts
└── integration/
    └── acl/
        ├── interfaces/
        ├── acl-registry.ts
        ├── base-adapter.ts
        ├── base-translator.ts
        └── index.ts
```

## Priorytety implementacji

1. **ACL** - najprostsze, najmniej zależności
2. **Lazy Loading** - średnia złożoność, duża wartość
3. **Projekcje** - najbardziej złożone, wymaga dobrej integracji z Event Bus