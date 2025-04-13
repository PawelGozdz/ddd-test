# DomainTS - Modularna Biblioteka DDD w TypeScript

## Założenia

DomainTS to niezależna, modularna biblioteka wspierająca implementację Domain-Driven Design (DDD) w TypeScript. Zaprojektowana z myślą o maksymalnej elastyczności i minimalnym sprzężeniu między komponentami, umożliwia wybór i wykorzystanie tylko tych elementów, których faktycznie potrzebujesz.

### Główne założenia:

1. **Pełna modularność** - używaj tylko tych komponentów, których potrzebujesz
2. **Minimalny coupling** - komponenty działają niezależnie, z jasnymi i minimalnymi zależnościami
3. **Czysty TypeScript** - zaprojektowana z myślą o pełnym wsparciu typów i nowoczesnych funkcji TS
4. **Gotowa do produkcji** - testy, dobra dokumentacja i sprawdzone wzorce
5. **Framework-agnostic** - działa niezależnie od frameworka
6. **Zorientowana na praktykę** - skupia się na realnych wyzwaniach implementacyjnych DDD

## Architektura Modularna

Biblioteka składa się z niezależnych modułów, które można stosować osobno lub łączyć w zależności od potrzeb:

```
@domain-ts/
├── core/                 # Kluczowe budownice DDD
│   ├── domain/           # Agregaty, encje, value objects
│   ├── events/           # Zdarzenia domenowe
│   ├── repository/       # Interfejsy repozytoriów
│   └── services/         # Usługi domenowe
├── infrastructure/       # Implementacje infrastruktury
│   ├── events/           # Implementacje event busów
│   ├── repositories/     # Implementacje repozytoriów
│   ├── services/         # Implementacje serwisów
│   └── unit-of-work/     # Implementacje Unit of Work
├── integration/          # Komponenty integracyjne
│   ├── acl/              # Anti-Corruption Layer
│   └── events/           # Zdarzenia integracyjne
├── patterns/             # Wzorce projektowe
│   ├── specifications/   # Wzorzec specyfikacji
│   └── factories/        # Fabryki i builderzy
└── utils/                # Narzędzia pomocnicze
    ├── result/           # Obsługa rezultatów
    ├── validation/       # Narzędzia walidacji
    └── serialization/    # Serializacja/deserializacja
```

## Szczegółowy Opis Modułów

### Core Domain

Fundamentalne elementy Domain-Driven Design, zapewniające strukturę domeny:

#### Agregaty i Encje (`core/domain`)

- **Agregaty** - logicznie spójne jednostki zmieniające się razem
- **Encje** - obiekty posiadające tożsamość i cykl życia
- **Zdarzenia domenowe** - emisja zdarzeń przy zmianie stanu
- **Zarządzanie wersjami** - wsparcie dla współbieżności

#### Identyfikatory (`core/domain`)

- **Silne typowanie identyfikatorów** - osobne typy dla różnych agregatów
- **UUIDv4** - generowanie unikalnych identyfikatorów
- **Serializacja/deserializacja** - konwersja do/z formatu string

#### Obiekty Wartości (`core/domain`)

- **Niezmienność** - gwarancja bezpieczeństwa współbieżności
- **Równość bazująca na wartości** - porównywanie przez strukturę, nie referencję
- **Enkapsulacja walidacji** - zapewnienie poprawności danych
- **Kompozycja** - budowanie złożonych obiektów wartości

### Zdarzenia Domenowe (`core/events`)

Kompletna infrastruktura dla zdarzeń domenowych z minimalnym sprzężeniem:

- **Zdarzenia jako niezmienne rekordy** - historia zmian w systemie
- **Metadane zdarzeń** - czas, identyfikatory korelacji, etc.
- **Publikacja i subskrypcja** - oddzielenie emisji od obsługi zdarzeń
- **Typowanie zdarzeń** - silne typowanie payload'u

### Repozytoria (`core/repository`, `infrastructure/repositories`)

Elastyczne repozytoria dla agregatów:

- **Podstawowe operacje CRUD** - znajdowanie, zapisywanie, usuwanie agregatów
- **Opcjonalna integracja z Unit of Work** - wsparcie dla transakcji
- **Automatyczna publikacja zdarzeń** - emisja zdarzeń przy zapisie/usunięciu
- **Kontrola współbieżności** - sprawdzanie wersji przy zapisie

### Unit of Work (`infrastructure/unit-of-work`)

Opcjonalny wzorzec dla koordynowania transakcji:

- **Atomowe operacje** - zapewnienie spójności danych
- **Zbieranie zdarzeń** - publikacja zdarzeń po udanej transakcji
- **Rejestracja repozytoriów** - koordynacja między repozytoriami
- **Wsparcie dla rollback'u** - cofanie zmian przy błędach

### Usługi Domenowe (`core/services`, `infrastructure/services`)

Implementacja logiki domenowej wykraczającej poza pojedyncze agregaty:

- **Koordynacja między agregatami** - operacje wieloagregatowe
- **Zarządzanie cyklem życia** - inicjalizacja i zwalnianie zasobów
- **Rejestr usług** - opcjonalna centralna rejestracja usług
- **Podział odpowiedzialności** - separacja od logiki agregatów

### Anti-Corruption Layer (`integration/acl`)

Elastyczny mechanizm izolacji i translacji między kontekstami:

- **Translatory** - konwersja między różnymi modelami danych
- **Adaptery** - dostosowanie zewnętrznych API do modelu domeny
- **Fasady** - uproszczone interfejsy do zewnętrznych systemów
- **Rejestr ACL** - centralna rejestracja komponentów ACL

### Zdarzenia Integracyjne (`integration/events`)

Komunikacja między bounded kontekstami:

- **Przekształcanie zdarzeń domenowych** - mapowanie na zdarzenia integracyjne
- **Kontekst ograniczony (Bounded Context)** - izolacja między domenami
- **Filtrowanie zdarzeń** - kierowanie zdarzeń do właściwych odbiorców
- **Wsparcie dla serializacji** - konwersja do formatów transportowych

### Specyfikacje (`patterns/specifications`)

Enkapsulacja reguł biznesowych i zapytań:

- **Kompozycja specyfikacji** - łączenie warunków (AND, OR, NOT)
- **Zapytania przez specyfikacje** - filtrowanie kolekcji i zapytania DB
- **Walidacja przez specyfikacje** - sprawdzanie reguł biznesowych
- **Czytelność kodu biznesowego** - separacja warunków od logiki

### Result i Obsługa Błędów (`utils/result`)

Funkcjonalne podejście do obsługi rezultatów operacji:

- **Typ Result** - enkapsulacja powodzenia/niepowodzenia
- **Łańcuchowanie operacji** - metody map, flatMap, tap
- **Obsługa błędów bez wyjątków** - kontrolowany przepływ błędów
- **Zwiększona czytelność** - jawne rozróżnienie ścieżek sukcesu/błędu

## Główne Korzyści

### Modułowość i Elastyczność

- **Użyj tylko tego, czego potrzebujesz** - każdy moduł ma minimalny zestaw zależności
- **Komponuj według własnych potrzeb** - wybierz preferowany event bus, repository pattern czy podejście do ACL
- **Progresywna adopcja** - zacznij od pojedynczych elementów, dodawaj więcej z rozwojem aplikacji

### Czysty Design

- **Przejrzyste interfejsy** - jasno zdefiniowane kontrakty między komponentami
- **Minimum sprzężeń** - komponenty są luźno powiązane przez abstrakcje
- **Zgodność z zasadami DDD** - implementacja zgodna z najlepszymi praktykami

### Wsparcie TypeScript

- **Pełne wsparcie typów** - wszystkie komponenty zaprojektowane z myślą o TypeScript
- **Generyki** - elastyczne typy dla agregatów, zdarzeń, repozytoriów etc.
- **Lepsza widoczność błędów** - możliwe do wykrycia podczas kompilacji

### Gotowość Produkcyjna

- **Przetestowane komponenty** - pokrycie testami dla kluczowej funkcjonalności
- **Obsługa błędów** - funkcjonalne podejście przez typ Result
- **Skalowalność** - od prostych aplikacji po złożone systemy rozproszone

## Inspiracje i Najlepsze Praktyki

Biblioteka DomainTS została zainspirowana sprawdzonymi rozwiązaniami i najlepszymi praktykami z innych implementacji DDD:

### Axon Framework (Java)

- **Podejście do obsługi zdarzeń** - separacja publikacji i obsługi
- **Command-Query Responsibility Segregation (CQRS)** - oddzielenie odczytu od zapisu
- **Śledzenie zdarzeń** - wsparcie dla korelacji i śledzenia przepływu zdarzeń
- **Oparte na zdarzeniach agregaty** - emisja i obsługa zdarzeń domenowych

### EventFlow (C#/.NET)

- **Struktura agregatów** - elegancki model zarządzania stanem
- **Optymistyczna kontrola współbieżności** - zarządzanie wersjami agregatów
- **Snapshotting** - optymalizacja odtwarzania stanu agregatów
- **Mocne typowanie** - wykorzystanie zaawansowanych funkcji systemu typów

### Broadway (PHP)

- **Prostota implementacji** - przystępne podejście do DDD
- **Elastyczne mapowanie zdarzeń** - łatwe dopasowanie handlerów
- **Modelowanie procesów** - koordynacja długotrwałych procesów
- **Zorientowanie na modułowość** - komponenty współpracujące, ale niezależne

### Domain-Driven Design (Eric Evans)

- **Język wszechobecny (Ubiquitous Language)** - spójne nazewnictwo w kodzie i komunikacji
- **Bounded Contexts** - jasne granice między różnymi modelami domeny
- **Agregaty i reguły spójności** - zapewnienie niezmienników biznesowych
- **Entities, Value Objects, Domain Services** - fundamentalne wzorce taktyczne

### Modele reaktywne i Event Sourcing

- **Reaktywne przetwarzanie zdarzeń** - asynchroniczna obsługa zdarzeń
- **Event Sourcing** - przechowywanie historii zdarzeń zamiast stanu
- **Projekcje i widoki odczytu** - materialized views dla optymalizacji zapytań
- **Idempotentność** - bezpieczne wielokrotne przetwarzanie zdarzeń

## Elastyczność i Rozszerzalność

Biblioteka została zaprojektowana z myślą o maksymalnej elastyczności:

- **Zastępowalne komponenty** - własne implementacje interfejsów
- **Rozszerzalne klasy bazowe** - dziedziczenie i dostosowywanie zachowań
- **Adaptery** - integracja z dowolnym frameworkiem lub biblioteką zewnętrzną
- **Przestrzenie nazw** - dobrze zorganizowane importy dla lepszej czytelności kodu

## Wsparcie dla Różnych Stylów DDD

Biblioteka wspiera różne style i podejścia do DDD:

- **Klasyczne DDD** - agregaty, zdarzenia domenowe, repozytoria
- **Event Sourcing** - opcjonalne wsparcie dla event sourcingu
- **CQRS** - pomocniki dla separacji odczytu i zapisu
- **Tactical vs Strategic DDD** - elementy dla obu podejść

## Zalecane Podejście

1. **Rozpocznij od domeny** - zdefiniuj agregaty, encje i obiekty wartości
2. **Dodaj zdarzenia domenowe** - wprowadź publikację i obsługę zdarzeń
3. **Wprowadź repozytoria** - dodaj trwałość dla agregatów
4. **Rozważ integrację** - w miarę potrzeb, dodaj zdarzenia integracyjne i ACL
5. **Optymalizuj infrastrukturę** - wprowadź unit of work, CQRS i inne wzorce

Ta biblioteka daje Ci swobodę wyboru elementów, które najlepiej pasują do Twojego projektu, bez wymuszania nieistotnych zależności czy nadmiarowego kodu.