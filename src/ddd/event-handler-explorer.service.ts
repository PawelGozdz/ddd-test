import { EVENT_HANDLER_METADATA, EVENT_HANDLER_OPTIONS, EventHandlerOptions, IEventBus } from "@app/libs";
import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { DiscoveryService, MetadataScanner } from "@nestjs/core";
import { DddModuleOptions } from "./ddd.module";

export const DDD_MODULE_OPTIONS = Symbol('DDD_MODULE_OPTIONS');


/**
 * Serwis odkrywający handlery zdarzeń
 */
@Injectable()
export class EventHandlerExplorer implements OnModuleInit {
  private readonly currentVersion = '1.0.0';

  constructor(
    private readonly eventBus: IEventBus,
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
    @Inject(DDD_MODULE_OPTIONS) private readonly options: DddModuleOptions
  ) {}

  /**
   * Automatyczne skanowanie przy inicjalizacji modułu
   */
  onModuleInit() {
    if (this.options.discovery?.exploreOnInit) {
      this.explore();
    }
  }

  /**
   * Odkryj i zarejestruj wszystkie handlery zdarzeń
   */
  explore(): void {
    // Pobierz wszystkich providerów
    const providers = this.discoveryService.getProviders();
    const controllers = this.discoveryService.getControllers();
    
    // Przetwórz providery
    providers
      .filter(wrapper => wrapper.instance)
      .forEach(wrapper => this.processInstance(wrapper.instance));
    
    // Przetwórz kontrolery
    controllers
      .filter(wrapper => wrapper.instance)
      .forEach(wrapper => this.processInstance(wrapper.instance));
    
    console.log('[DddModule] Zakończono skanowanie handlerów zdarzeń');
  }

  /**
   * Przetwórz instancję w poszukiwaniu handlerów
   */
  private processInstance(instance: any): void {
    // Sprawdź, czy klasa ma dekorator EventHandler
    this.processClassHandlers(instance);
    
    // Sprawdź, czy metody mają dekoratory EventHandler
    this.processMethodHandlers(instance);
  }

  /**
   * Przetwórz handlery na poziomie klasy
   */
  private processClassHandlers(instance: any): void {
    const target = instance.constructor;
    
    // Pobierz metadane o handlerze
    const metadata = Reflect.getMetadata(EVENT_HANDLER_METADATA, target);
    if (!metadata || !metadata.eventType) {
      return;
    }
    
    // Pobierz opcje handlera
    const options: EventHandlerOptions = Reflect.getMetadata(EVENT_HANDLER_OPTIONS, target) || {};
    const defaultActive = this.options.discovery?.defaultActive ?? true;
    
    // Sprawdź, czy handler powinien być aktywny
    if (!this.shouldActivateHandler(options, defaultActive)) {
      console.log(`[DddModule] Pomijanie nieaktywnego handlera klasy: ${target.name}`);
      return;
    }
    
    // Sprawdź, czy instancja implementuje interfejs IEventHandler
    if (typeof instance.handle !== 'function') {
      console.warn(`[DddModule] Klasa ${target.name} ma dekorator EventHandler, ale nie implementuje metody handle()`);
      return;
    }
    
    // Zarejestruj handler
    this.eventBus.registerHandler(metadata.eventType, instance);
    console.log(`[DddModule] Zarejestrowano handler klasy: ${target.name} dla zdarzenia ${metadata.eventType.name}`);
  }

  /**
   * Przetwórz handlery na poziomie metod
   */
  private processMethodHandlers(instance: any): void {
    const prototype = Object.getPrototypeOf(instance);
    
    if (!prototype) {
      return;
    }
    
    // Przeskanuj wszystkie metody
    this.metadataScanner.getAllMethodNames(prototype)
      .forEach(methodName => {
        const descriptor = Object.getOwnPropertyDescriptor(prototype, methodName);
        if (!descriptor || typeof descriptor.value !== 'function') {
          return;
        }
        
        // Pobierz metadane o handlerze
        const metadata = Reflect.getMetadata(EVENT_HANDLER_METADATA, descriptor.value);
        if (!metadata || !metadata.eventType) {
          return;
        }
        
        // Pobierz opcje handlera
        const options: EventHandlerOptions = Reflect.getMetadata(EVENT_HANDLER_OPTIONS, descriptor.value) || {};
        const defaultActive = this.options.discovery?.defaultActive ?? true;
        
        // Sprawdź, czy handler powinien być aktywny
        if (!this.shouldActivateHandler(options, defaultActive)) {
          console.log(`[DddModule] Pomijanie nieaktywnego handlera metody: ${instance.constructor.name}.${methodName}`);
          return;
        }
        
        // Zarejestruj handler
        const handler = instance[methodName].bind(instance);
        this.eventBus.subscribe(metadata.eventType, handler);
        console.log(`[DddModule] Zarejestrowano handler metody: ${instance.constructor.name}.${methodName} dla zdarzenia ${metadata.eventType.name}`);
      });
  }

  /**
   * Sprawdź, czy handler powinien być aktywowany
   */
  private shouldActivateHandler(options: EventHandlerOptions, defaultActive: boolean): boolean {
    // Jeśli aktywacja nie jest włączona, zawsze zwróć true
    if (!this.options.discovery?.enableActivation) {
      return true;
    }
    
    // Sprawdź flagę active
    if (options.active !== undefined) {
      return options.active;
    }
    
    // Sprawdź wersję, jeśli określona
    if (options.availableFrom) {
      return this.isVersionGreaterOrEqual(this.currentVersion, options.availableFrom);
    }
    
    // Użyj domyślnej wartości
    return defaultActive;
  }

  /**
   * Porównaj wersje semantyczne
   */
  private isVersionGreaterOrEqual(current: string, required: string): boolean {
    const currentParts = current.split('.').map(Number);
    const requiredParts = required.split('.').map(Number);
    
    for (let i = 0; i < Math.max(currentParts.length, requiredParts.length); i++) {
      const currentPart = currentParts[i] || 0;
      const requiredPart = requiredParts[i] || 0;
      
      if (currentPart > requiredPart) {
        return true;
      }
      
      if (currentPart < requiredPart) {
        return false;
      }
    }
    
    // Wersje są równe
    return true;
  }
}