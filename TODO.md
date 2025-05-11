# Podsumowanie kluczowych koncepcji DDD

## 1. Saga (Process Manager)

**Definicja:**  
Saga to komponent koordynujący długotrwałe procesy biznesowe między wieloma agregatami, często wykraczające poza granice pojedynczego bounded context.

**Kluczowe cechy:**
- **Stanowość** - przechowuje stan procesu między zdarzeniami
- **Długotrwałość** - może trwać godziny/dni/tygodnie
- **Reaktywność** - reaguje na zdarzenia z różnych źródeł
- **Mechanizm kompensacji** - obsługuje cofanie zmian przy błędach

**Różnice od serwisu domenowego:**
- Serwis domenowy jest bezstanowy, działa w ramach pojedynczej transakcji
- Saga zarządza stanem i koordynuje wiele kroków w czasie
- Serwis jest wywoływany bezpośrednio, saga reaktywnie przez zdarzenia

**Przykład implementacji:**
```typescript
class OrderProcessSaga {
  private sagaState = new Map<string, {
    paymentConfirmed: boolean;
    stockReserved: boolean;
  }>();
  
  async handle(event: IDomainEvent): Promise<void> {
    if (event.eventType === 'OrderPlaced') {
      // Rozpocznij proces
      this.sagaState.set(event.payload.orderId, { paymentConfirmed: false, stockReserved: false });
      await this.commandBus.dispatch(new ProcessPaymentCommand(/*...*/));
    }
    else if (event.eventType === 'PaymentProcessed') {
      // Aktualizuj stan i sprawdź czy możemy kontynuować
      const state = this.sagaState.get(event.payload.orderId);
      state.paymentConfirmed = true;
      this.checkCompletion(event.payload.orderId);
    }
  }
}
```

## 2. Projekcje (Projections)

**Definicja:**  
Projekcje to komponenty transformujące strumień zdarzeń domenowych w zoptymalizowane modele danych przeznaczone do odczytu.

#### QA
- podpytać po co tu potrzebna metoda apply, skoro wszystko działa req-res i raczej wykluczone że w trakcie pracy nad projekcją akurat jakoś będziemy aktualizować eventy (bo niby ską one miałyby się wziać)

**Kluczowe cechy:**
- **Zorientowane na odczyt** - optymalizacja do zapytań
- **Denormalizacja** - struktury dopasowane do konkretnych przypadków użycia
- **Aktualizowane przez zdarzenia** - reakcja na zmiany w modelach zapisu
- **Wsparcie dla CQRS** - oddzielenie odczytu od zapisu

**Dlaczego projekcje używają metody `apply()`:**
- Metoda `apply()` nie modyfikuje źródłowych agregatów
- Służy do aktualizacji wewnętrznej reprezentacji danych dla odczytu
- Transformuje zdarzenia w zoptymalizowany model

**Przykład implementacji:**
```typescript
class OrderSummaryProjection {
  private orderSummaries: OrderSummary[] = [];
  
  apply(event: IDomainEvent): void {
    if (event.eventType === 'OrderPlaced') {
      // Dodaj nowy wpis do projekcji
      this.orderSummaries.push({
        id: event.payload.orderId,
        customerName: event.payload.customerName,
        total: event.payload.total,
        status: 'PLACED'
      });
    }
    else if (event.eventType === 'OrderShipped') {
      // Zaktualizuj istniejący wpis
      const summary = this.orderSummaries.find(s => s.id === event.payload.orderId);
      if (summary) summary.status = 'SHIPPED';
    }
  }
  
  // Metoda dostępowa dla zoptymalizowanego modelu
  getOrderSummaries(): OrderSummary[] {
    return this.orderSummaries;
  }
}
```

## 3. Eventy Integracyjne i Audytowe

### A. Eventy Integracyjne

**Definicja:**  
Eventy integracyjne są zdarzeniami publikowanymi poza granice bounded context, służącymi do komunikacji między różnymi częściami systemu.

**Kluczowe cechy:**
- **Publiczny kontrakt** - ściśle zdefiniowany i wersjonowany
- **Mniej szczegółowe** - zawierają tylko dane potrzebne innym kontekstom
- **Transformowane z eventów domenowych** - nie są tworzone bezpośrednio
- **Asynchroniczna komunikacja** - luźne powiązanie między kontekstami

**Nasza implementacja:**
- `IIntegrationEvent` - interfejs bazowy z metadanymi
- `DomainToIntegrationTransformer` - transformacja z eventów domenowych
- `IntegrationEventTransformerRegistry` - rejestr transformerów
- `IIntegrationEventDispatcher` - dedykowany dispatcher (oddzielny od domenowego)

**Przykład kodu:**
```typescript
// Transformacja eventu domenowego na integracyjny
class OrderPlacedTransformer extends DomainToIntegrationTransformer<OrderPlacedPayload, OrderPlacedIntegrationPayload> {
  protected transformPayload(domainPayload: OrderPlacedPayload): OrderPlacedIntegrationPayload {
    return {
      orderId: domainPayload.orderId,
      placedAt: domainPayload.timestamp,
      items: domainPayload.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity
      }))
      // Pomijamy wewnętrzne szczegóły jak ceny, marże, etc.
    };
  }
}

// Użycie
const integrationEvent = transformerRegistry.transform(domainEvent);
await integrationEventDispatcher.dispatch(integrationEvent);
```

### B. Eventy Audytowe

**Definicja:**  
Eventy audytowe służą do rejestrowania wszystkich operacji dla celów audytu, compliance i debugowania.

**Kluczowe cechy:**
- **Zawierają pełny kontekst operacji** - kto, co, kiedy, dlaczego
- **Wzbogacone metadane** - IP, urządzenie, sesja, etc.
- **Długoterminowe przechowywanie** - często z wymogów prawnych
- **Niezmienialne** - nigdy nie są modyfikowane ani usuwane

**Propozycja implementacji:**
```typescript
interface IAuditEvent<T = any> {
  eventType: string;        // Typ operacji
  entityType: string;       // Typ encji (Order, Customer, etc.)
  entityId: string;         // ID encji
  operation: 'CREATE' | 'UPDATE' | 'DELETE' | 'READ';
  previousState?: T;        // Stan przed
  newState?: T;             // Stan po
  changes?: Record<string, { old: any; new: any }>;  // Szczegółowe zmiany
  metadata: {
    userId: string;         // Kto wykonał operację
    userRole?: string;      // Rola użytkownika
    ipAddress?: string;     // Skąd
    timestamp: Date;        // Kiedy
    correlationId?: string; // Powiązanie z innymi operacjami
    reason?: string;        // Powód operacji (np. "customer request")
  };
}
```

## 4. ACL
