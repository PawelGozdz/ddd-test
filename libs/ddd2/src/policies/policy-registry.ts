import { IBusinessPolicy } from '../policies';

/**
 * Registry for domain-specific business policies
 */
export class PolicyRegistry {
  private static policies: Map<string, Record<string, IBusinessPolicy<any>>> = new Map();
  
  /**
   * Register a domain policy
   */
  static register<T>(
    domain: string, 
    policyName: string, 
    policy: IBusinessPolicy<T>
  ): void {
    if (!this.policies.has(domain)) {
      this.policies.set(domain, {});
    }
    
    const domainPolicies = this.policies.get(domain)!;
    domainPolicies[policyName] = policy;
  }
  
  /**
   * Get a policy by domain and name
   */
  static getPolicy<T>(domain: string, policyName: string): IBusinessPolicy<T> {
    const domainPolicies = this.policies.get(domain);
    if (!domainPolicies) {
      throw new Error(`Domain "${domain}" not found`);
    }
    
    const policy = domainPolicies[policyName];
    if (!policy) {
      throw new Error(`Policy "${policyName}" not found in domain "${domain}"`);
    }
    
    return policy as IBusinessPolicy<T>;
  }
  
  /**
   * Get all policies for a domain
   */
  static getDomainPolicies<T>(domain: string): Record<string, IBusinessPolicy<T>> {
    const domainPolicies = this.policies.get(domain);
    if (!domainPolicies) {
      throw new Error(`Domain "${domain}" not found`);
    }
    
    return domainPolicies as Record<string, IBusinessPolicy<T>>;
  }
}