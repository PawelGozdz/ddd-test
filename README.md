```
@domain-ts/
├── core/                 # Absolutne minimum - podstawowe budulce DDD
│   ├── domain/           # Encje, agregaty, value objects
│   ├── common/           # Wspólne interfejsy i typy
│   └── index.ts          
├── events/               # System zdarzeń domenowych (opcjonalny)
├── integration/          # System integracji kontekstów (opcjonalny)
├── repositories/         # Infrastruktura repozytoriów (opcjonalny)
├── services/             # System usług domenowych (opcjonalny)
├── acl/                  # Warstwa antykorupcyjna (opcjonalna)
├── patterns/             # Wzorce projektowe (opcjonalne)
├── utils/                # Niezależne narzędzia pomocnicze
└── adapters/             # Adaptery dla frameworków (opcjonalne)
```