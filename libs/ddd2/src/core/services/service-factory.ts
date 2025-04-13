import { IDomainService, IDomainServiceRegistry } from './domain-service.interface';

/**
 * Base class for domain service factories
 * Used for creating service instances with complex initialization
 */
export abstract class ServiceFactory<T extends IDomainService> {
  constructor(protected registry: IDomainServiceRegistry) {}

  /**
   * Creates and registers a service
   */
  public createAndRegister(): T {
    const service = this.create();
    this.registry.register(service, this.getServiceId());
    return service;
  }

  /**
   * Abstract method to be implemented by concrete factories
   * @returns New service instance
   */
  protected abstract create(): T;

  /**
   * Abstract method returning the service identifier
   */
  protected abstract getServiceId(): string;
}