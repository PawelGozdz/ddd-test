import { IDomainService, IDomainServiceRegistry } from '@/core';
import { DefaultDomainServiceRegistry } from './domain-service-registry';
import { ServiceBuilder } from './service-builder';

/**
 * Builder for creating and configuring a service registry
 * Provides a fluent API for service registration
 */
export class ServiceRegistryBuilder {
  private registry: IDomainServiceRegistry;

  constructor(registry?: IDomainServiceRegistry) {
    this.registry = registry || new DefaultDomainServiceRegistry();
  }

  /**
   * Creates a new builder for a service
   * @param serviceId Service identifier
   * @param factory Function creating a service instance
   * @returns Service builder
   */
  public service<T extends IDomainService>(
    serviceId: string,
    factory: (...args: any[]) => T
  ): ServiceBuilder<T> {
    return new ServiceBuilder<T>(this.registry, serviceId, factory);
  }

  /**
   * Directly registers a ready service instance
   * @param service Service instance to register
   * @param serviceId Service identifier
   * @returns This for method chaining
   */
  public register<T extends IDomainService>(service: T, serviceId?: string): ServiceRegistryBuilder {
    this.registry.register(service, serviceId);
    return this;
  }

  /**
   * Returns the configured service registry
   * @returns Service registry
   */
  public build(): IDomainServiceRegistry {
    return this.registry;
  }
}