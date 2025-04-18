import { IDomainService, IDomainServiceRegistry } from '../../core/';

/**
 * Default implementation of the domain service registry
 */
export class DefaultDomainServiceRegistry implements IDomainServiceRegistry {
  private services: Map<string, IDomainService> = new Map();

  public register<T extends IDomainService>(service: T, serviceId?: string): void {
    const id = serviceId || service.serviceId;
    
    if (!id) {
      throw new Error('Service ID is required for registration. Either provide it as parameter or implement serviceId in the service.');
    }

    if (this.services.has(id)) {
      throw new Error(`Service with ID '${id}' is already registered.`);
    }

    this.services.set(id, service);
  }

  public get<T extends IDomainService>(serviceId: string): T | undefined {
    return this.services.get(serviceId) as T | undefined;
  }

  public has(serviceId: string): boolean {
    return this.services.has(serviceId);
  }

  public remove(serviceId: string): boolean {
    return this.services.delete(serviceId);
  }

  public getAll(): Map<string, IDomainService> {
    return new Map(this.services);
  }

  public clear(): void {
    this.services.clear();
  }
}