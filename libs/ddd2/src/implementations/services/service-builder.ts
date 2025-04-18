import { IDomainService, IDomainServiceRegistry } from '../../core';

/**
 * Builder for creating and registering domain services
 * with a clear dependency chain
 */
export class ServiceBuilder<T extends IDomainService> {
  private dependencies: any[] = [];
  private factory: (...args: any[]) => T;
  private id: string;

  /**
   * Service builder constructor
   * @param registry Service registry where the service will be registered
   * @param serviceId Service identifier
   * @param factory Function creating a service instance
   */
  constructor(
    private registry: IDomainServiceRegistry,
    serviceId: string,
    factory: (...args: any[]) => T
  ) {
    this.id = serviceId;
    this.factory = factory;
  }

  /**
   * Adds a dependency on another service
   * @param serviceId Identifier of the service to depend on
   * @returns Builder for method chaining
   */
  public dependsOn(serviceId: string): ServiceBuilder<T> {
    const dependency = this.registry.get(serviceId);
    
    if (!dependency) {
      throw new Error(`Dependency service with ID '${serviceId}' not found in registry`);
    }
    
    this.dependencies.push(dependency);
    return this;
  }

  /**
   * Adds a direct dependency instance
   * @param dependency Dependency instance
   * @returns Builder for method chaining
   */
  public withDependency(dependency: any): ServiceBuilder<T> {
    this.dependencies.push(dependency);
    return this;
  }

  /**
   * Creates a service instance with dependencies
   * @returns Created service instance
   */
  public build(): T {
    return this.factory(...this.dependencies);
  }

  /**
   * Creates a service instance and registers it in the registry
   * @returns Created and registered service instance
   */
  public buildAndRegister(): T {
    const service = this.build();
    this.registry.register(service, this.id);
    return service;
  }
}