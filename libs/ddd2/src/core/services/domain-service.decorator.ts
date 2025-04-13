import 'reflect-metadata';

const DOMAIN_SERVICE_METADATA_KEY = Symbol('DomainService');

/**
 * Interface defining domain service metadata
 */
export interface DomainServiceMetadata {
  serviceId: string;
  dependencies?: string[];
}

/**
 * Decorator marking a class as a domain service
 * @param options Service options (serviceId or object with serviceId and dependencies)
 */
export function DomainService(options: string | DomainServiceMetadata) {
  return function (target: any) {
    // Define service metadata
    const metadata: DomainServiceMetadata = typeof options === 'string' 
      ? { serviceId: options } 
      : options;
    
    // Store metadata on the class
    Reflect.defineMetadata(DOMAIN_SERVICE_METADATA_KEY, metadata, target);
    
    return target;
  };
}

/**
 * Retrieves service metadata from a class
 * @param target Service class
 */
export function getDomainServiceMetadata(target: any): DomainServiceMetadata | undefined {
  return Reflect.getMetadata(DOMAIN_SERVICE_METADATA_KEY, target);
}