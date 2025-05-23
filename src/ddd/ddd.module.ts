// // app/infrastructure/nestjs/ddd.module.ts

// import { Module, DynamicModule, Provider, Global } from '@nestjs/common';
// import { DiscoveryModule } from '@nestjs/core';
// import {
//   DDD_MODULE_OPTIONS,
//   EventHandlerExplorer,
// } from './event-handler-explorer.service';
// import { EventBusMiddleware } from '@/src/core/events/base-event-bus';
// import {
//   EventBusBuilder,
//   IEnhancedEventDispatcher,
//   IEventBus,
//   InMemoryEventBus,
//   IntegrationEventTransformerRegistry,
//   TestTransformer,
//   UniversalEventDispatcher,
// } from '@/src';
// import { createUniversalEventDispatcher } from '@/src/core/events/event-dispatcher-factory';
// import { TestEvent } from 'src/app.service';

// /**
//  * Opcje modułu DDD
//  */
// export interface DddModuleOptions {
//   /**
//    * Konfiguracja EventBus'a
//    */
//   eventBus?: {
//     /** Włącz logowanie */
//     enableLogging?: boolean;
//     /** Włącz śledzenie korelacji */
//     enableCorrelation?: boolean;
//     /** Własny handler błędów */
//     errorHandler?: (error: Error, eventType: string) => void;
//     /** Lista middleware */
//     middlewares?: EventBusMiddleware[];
//   };

//   /**
//    * Konfiguracja odkrywania handlerów
//    */
//   discovery?: {
//     /** Włącz automatyczne odkrywanie handlerów (domyślnie true) */
//     enabled?: boolean;
//     /** Czy odkrywanie ma być wykonane na OnModuleInit */
//     exploreOnInit?: boolean;
//     /** Włącz aktywację handlerów na podstawie metadanych */
//     enableActivation?: boolean;
//     /** Domyślny stan aktywacji (domyślnie true) */
//     defaultActive?: boolean;
//   };

//   /**
//    * Konfiguracja repozytorium
//    */
//   repositories?: Provider[];

//   /**
//    * Dodatkowi providenci
//    */
//   providers?: Provider[];
// }

// /**
//  * Główny moduł DDD dla integracji z NestJS
//  */
// @Global()
// @Module({
//   imports: [DiscoveryModule],
// })
// export class DddModule {
//   /**
//    * Konfiguruje moduł DDD
//    */
//   static forRoot(options: DddModuleOptions = {}): DynamicModule {
//     // Domyślne opcje
//     const defaultOptions: DddModuleOptions = {
//       eventBus: {
//         enableLogging: false,
//         enableCorrelation: true,
//         middlewares: [],
//       },
//       discovery: {
//         enabled: true,
//         exploreOnInit: true,
//         enableActivation: true,
//         defaultActive: true,
//       },
//       repositories: [],
//       providers: [],
//     };

//     // Połącz opcje z domyślnymi
//     const mergedOptions: DddModuleOptions = {
//       eventBus: { ...defaultOptions.eventBus, ...options.eventBus },
//       discovery: { ...defaultOptions.discovery, ...options.discovery },
//       repositories: options.repositories || [],
//       providers: options.providers || [],
//     };

//     // Przygotuj providery
//     const providers: Provider[] = [
//       // Provider dla EventBus
//       // {
//       //   provide: InMemoryEventBus,
//       //   useFactory: () => {
//       //     let builder = EventBusBuilder.create();

//       //     // Konfiguracja na podstawie opcji
//       //     if (mergedOptions.eventBus?.enableLogging) {
//       //       builder = builder.withLogging();
//       //     }

//       //     if (mergedOptions.eventBus?.enableCorrelation) {
//       //       builder = builder.withCorrelation();
//       //     }

//       //     if (mergedOptions.eventBus?.errorHandler) {
//       //       builder = builder.withErrorHandler(
//       //         mergedOptions.eventBus.errorHandler,
//       //       );
//       //     }

//       //     // Dodaj wszystkie middleware
//       //     for (const middleware of mergedOptions.eventBus?.middlewares || []) {
//       //       builder = builder.withMiddleware(middleware);
//       //     }

//       //     return builder.build();
//       //   },
//       // },
//       // {
//       //   privide: IntegrationEventTransformerRegistry,
//       //   useVactory: () => {
//       //     const x = IntegrationEventTransformerRegistry.
//       //     return ;
//       //   }
//       // }

//       // Provider dla EventDispatcher
//       {
//         provide: IEnhancedEventDispatcher,
//         useFactory: (eventBus: IEventBus) => {
//           const buildDispatcher = createUniversalEventDispatcher({
//             domainEventBus: eventBus,
//             middlewares: [],
//             // transformerRegistry:
//             //   new IntegrationEventTransformerRegistry().register(
//             //     TestEvent.name,
//             //     new TestTransformer({}),
//             //   )
//             // integrationEventBus:
//           });

//           return buildDispatcher;
//         },
//         inject: [IEventBus],
//       },

//       // Provider dla opcji modułu - użyteczne przy wstrzykiwaniu
//       {
//         provide: DDD_MODULE_OPTIONS,
//         useValue: mergedOptions,
//       },
//     ];

//     // Dodaj explorer handlerów jeśli odkrywanie jest włączone
//     if (mergedOptions.discovery?.enabled) {
//       providers.push(EventHandlerExplorer);
//     }

//     // Dodaj repozytoria i pozostałe providery
//     providers.push(
//       ...(mergedOptions.repositories || []),
//       ...(mergedOptions.providers || []),
//     );

//     // Przygotuj eksporty
//     const exports = [IEventBus, IEnhancedEventDispatcher];

//     return {
//       module: DddModule,
//       global: true, // Moduł globalny - dostępny wszędzie
//       imports: [DiscoveryModule],
//       providers,
//       exports,
//     };
//   }
// }
