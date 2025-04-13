import { IDomainServiceRegistry } from "@/core";
import { DefaultDomainServiceRegistry } from './domain-service-registry';

/**
 * Optional singleton for global access to domain services
 * Provides a centralized access point to the domain service registry
 */
export class GlobalServiceRegistry {
  private static instance: IDomainServiceRegistry;

  private constructor() {}

  public static getInstance(): IDomainServiceRegistry {
    if (!GlobalServiceRegistry.instance) {
      GlobalServiceRegistry.instance = new DefaultDomainServiceRegistry();
    }
    return GlobalServiceRegistry.instance;
  }

  public static setInstance(registry: IDomainServiceRegistry): void {
    GlobalServiceRegistry.instance = registry;
  }
}