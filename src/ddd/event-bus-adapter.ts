import { Injectable, OnModuleInit } from '@nestjs/common';
import { DiscoveryService, MetadataScanner } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import {
  EVENT_HANDLER_METADATA,
  EventHandlerFn,
  IEventBus,
  IEventHandler,
} from '@/src';

/**
 * Adapter EventBusa dla NestJS
 */

@Injectable()
export class NestJsEventBusAdapter implements OnModuleInit {
  constructor(
    readonly eventBus: IEventBus,
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
  ) {}

  /**
   * Automatycznie skanuje i rejestruje handlery po inicjalizacji modułu
   */
  onModuleInit() {
    this.registerDiscoveredHandlers();
  }

  /**
   * Odkrywa i rejestruje wszystkie handlery w aplikacji
   */
  private registerDiscoveredHandlers() {
    // Znajdź wszystkie providery w aplikacji
    const providers = this.discoveryService.getProviders();

    // Przetwarzanie providerów
    providers.forEach((wrapper: InstanceWrapper) => {
      const { instance } = wrapper;

      // Jeśli instancja nie istnieje, pomiń
      if (!instance || typeof instance !== 'object') {
        return;
      }

      // Sprawdź, czy klasa ma dekorator
      this.extractClassHandler(instance);

      // Sprawdź metody
      this.extractMethodsFromInstance(instance);
    });

    // Skanowanie kontrolerów
    const controllers = this.discoveryService.getControllers();
    controllers.forEach((wrapper: InstanceWrapper) => {
      const { instance } = wrapper;

      if (!instance || typeof instance !== 'object') {
        return;
      }

      // Sprawdź, czy klasa ma dekorator
      this.extractClassHandler(instance);

      // Sprawdź metody
      this.extractMethodsFromInstance(instance);
    });
  }

  private extractClassHandler(instance: object) {
    // Sprawdź, czy klasa ma dekorator EVENT_HANDLER_METADATA
    const classMetadata = Reflect.getMetadata(
      EVENT_HANDLER_METADATA,
      instance.constructor,
    );

    if (classMetadata) {
      const { eventType } = classMetadata;

      // Zakładamy, że klasa ma metodę 'handle' do obsługi zdarzeń
      if (instance['handle'] && typeof instance['handle'] === 'function') {
        this.eventBus.registerHandler(
          eventType,
          instance as IEventHandler<any>,
        );

        console.log(
          `Zarejestrowano klasę obsługującą zdarzenie ${eventType.name}: ${instance.constructor.name}`,
        );
      }
    }
  }

  private extractMethodsFromInstance(instance: object) {
    const prototype = Object.getPrototypeOf(instance);

    // Użyj getAllMethodNames zamiast scanFromPrototype
    const methodNames = this.metadataScanner.getAllMethodNames(prototype);

    methodNames.forEach((methodName: string) => {
      // Pobierz metodę z prototypu, aby uzyskać dostęp do metadanych
      const methodRef = prototype[methodName];

      // Sprawdź, czy metoda ma nasz dekorator
      const metadata = Reflect.getMetadata(EVENT_HANDLER_METADATA, methodRef);

      if (metadata) {
        const { eventType } = metadata;

        // Stwórz funkcję handlera z metody instancji
        const handlerFn: EventHandlerFn<any> =
          instance[methodName].bind(instance);

        // Rejestruj metodę jako handler w eventBusie
        this.eventBus.subscribe(eventType, handlerFn);

        console.log(
          `Zarejestrowano handler metody dla ${eventType.name}: ${instance.constructor.name}.${methodName}`,
        );
      }
    });
  }
}
