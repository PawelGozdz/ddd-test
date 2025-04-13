import { IDomainService } from './domain-service.interface';

/**
 * Base class for domain services
 * Provides a common base implementation for domain services
 */
export abstract class BaseDomainService implements IDomainService {
  constructor(public readonly serviceId: string) {}
}
