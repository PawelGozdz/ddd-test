import { IDomainService, IDomainServiceRegistry } from '../../core/';
import { DefaultDomainServiceRegistry } from './domain-service-registry';

/**
 * Container for domain services with dependency resolution capabilities
 * Used for manual configuration of services and their dependencies
 */
export class DomainServiceContainer {
  private registry: IDomainServiceRegistry;
  private factories: Map<string, () => IDomainService> = new Map();
  private dependencies: Map<string, string[]> = new Map();

  constructor(registry?: IDomainServiceRegistry) {
    this.registry = registry || new DefaultDomainServiceRegistry();
  }

  /**
   * Registers a service factory
   * @param serviceId Service identifier
   * @param factory Function creating a service instance
   * @param dependencies Optional array of service IDs this service depends on
   */
  public registerFactory(serviceId: string, factory: () => IDomainService, dependencies: string[] = []): void {
    this.factories.set(serviceId, factory);
    this.dependencies.set(serviceId, dependencies);
  }

  /**
   * Initializes all registered services in the correct order
   * (respecting dependencies)
   */
  public initializeServices(): void {
    const initialized = new Set<string>();
    const pending = new Set<string>(this.factories.keys());

    while (pending.size > 0) {
      let progress = false;

      for (const serviceId of pending) {
        const deps = this.dependencies.get(serviceId) || [];
        const canInitialize = deps.every(dep => initialized.has(dep));

        if (canInitialize) {
          const factory = this.factories.get(serviceId)!;
          const service = factory();
          this.registry.register(service, serviceId);
          
          initialized.add(serviceId);
          pending.delete(serviceId);
          progress = true;
        }
      }

      if (!progress && pending.size > 0) {
        const remaining = Array.from(pending).join(', ');
        throw new Error(`Circular dependency detected among services: ${remaining}`);
      }
    }
  }

  /**
   * Retrieves a service from the registry
   */
  public getService<T extends IDomainService>(serviceId: string): T | undefined {
    return this.registry.get<T>(serviceId);
  }

  /**
   * Returns the registry being used
   */
  public getRegistry(): IDomainServiceRegistry {
    return this.registry;
  }
}