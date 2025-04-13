/**
 * Base interface for all domain services
 * A domain service represents domain logic that doesn't naturally fit into entities or value objects
 */
export interface IDomainService {
  /**
   * Optional service identifier (used for registration)
   */
  readonly serviceId?: string;
}

// core/services/domain-service-registry.interface.ts
/**
 * Registry for domain services
 * Provides methods for registering, retrieving, and managing domain services
 */
export interface IDomainServiceRegistry {
  /**
   * Registers a domain service in the registry
   * @param service Domain service to register
   * @param serviceId Optional service identifier (if not provided, serviceId from the service is used)
   */
  register<T extends IDomainService>(service: T, serviceId?: string): void;

  /**
   * Retrieves a domain service from the registry
   * @param serviceId Service identifier
   * @returns Domain service or undefined if not found
   */
  get<T extends IDomainService>(serviceId: string): T | undefined;

  /**
   * Checks if a service with the given identifier exists in the registry
   * @param serviceId Service identifier
   * @returns True if the service exists, false otherwise
   */
  has(serviceId: string): boolean;

  /**
   * Removes a service from the registry
   * @param serviceId Service identifier to remove
   * @returns True if the service was removed, false if it didn't exist
   */
  remove(serviceId: string): boolean;

  /**
   * Returns all registered services
   * @returns Map of services (key: serviceId, value: service)
   */
  getAll(): Map<string, IDomainService>;

  /**
   * Clears the registry by removing all services
   */
  clear(): void;
}