import { describe, it, expect, vi } from 'vitest';

import { PolicyRegistry, BusinessPolicy } from '../policies';
import { ISpecification } from '../validations';
import { safeRun } from '../utils';
import e from 'express';

/**
 * Unit tests for PolicyRegistry class
 */
describe('PolicyRegistry', () => {
  // Clear the registry before each test to avoid test interference
  beforeEach(() => {
    // Reset the private static property by using any type
    (PolicyRegistry as any).policies = new Map();
  });
  
  // Create a helper function to create a mock policy
  const createMockPolicy = () => {
    const spec: ISpecification<any> = {
      isSatisfiedBy: vi.fn().mockReturnValue(true),
      and: vi.fn(),
      or: vi.fn(),
      not: vi.fn()
    };
    
    return new BusinessPolicy<any>(spec, 'CODE', 'Message');
  };
  
  describe('register', () => {
    it('should register policy for new domain', () => {
      // Arrange
      const domain = 'user';
      const policyName = 'adultPolicy';
      const policy = createMockPolicy();
      
      // Act
      PolicyRegistry.register(domain, policyName, policy);
      
      // Assert
      expect(() => PolicyRegistry.getPolicy(domain, policyName)).not.toThrow();
      expect(PolicyRegistry.getPolicy(domain, policyName)).toBe(policy);
    });
    
    it('should register multiple policies for same domain', () => {
      // Arrange
      const domain = 'user';
      const policy1 = createMockPolicy();
      const policy2 = createMockPolicy();
      
      // Act
      PolicyRegistry.register(domain, 'policy1', policy1);
      PolicyRegistry.register(domain, 'policy2', policy2);
      
      // Assert
      expect(PolicyRegistry.getPolicy(domain, 'policy1')).toBe(policy1);
      expect(PolicyRegistry.getPolicy(domain, 'policy2')).toBe(policy2);
    });
    
    it('should override existing policy with same name', () => {
      // Arrange
      const domain = 'user';
      const policyName = 'adultPolicy';
      const policy1 = createMockPolicy();
      const policy2 = createMockPolicy();
      
      // Act
      PolicyRegistry.register(domain, policyName, policy1);
      PolicyRegistry.register(domain, policyName, policy2); // Override
      
      // Assert
      expect(PolicyRegistry.getPolicy(domain, policyName)).toBe(policy2);
      expect(PolicyRegistry.getPolicy(domain, policyName)).not.toBe(policy1);
    });
  });
  
  describe('getPolicy', () => {
    it('should return correct policy', () => {
      // Arrange
      const domain = 'user';
      const policyName = 'adultPolicy';
      const policy = createMockPolicy();
      PolicyRegistry.register(domain, policyName, policy);
      
      // Act
      const result = PolicyRegistry.getPolicy(domain, policyName);
      
      // Assert
      expect(result).toBe(policy);
    });
    
    it('should throw error for non-existent domain', () => {
      // Arrange
      const nonExistentDomain = 'nonExistent';
      
      // Act
      const [error] = safeRun(() => PolicyRegistry.getPolicy(nonExistentDomain, 'anyPolicy'));

      // Assert
      expect(error.message).toBe(`Domain "${nonExistentDomain}" not found`);
    });
    
    it('should throw error for non-existent policy', () => {
      // Arrange
      const domain = 'user';
      const existingPolicyName = 'existingPolicy';
      const nonExistentPolicyName = 'nonExistentPolicy';
      const policy = createMockPolicy();
      
      PolicyRegistry.register(domain, existingPolicyName, policy);
      
      // Act
      const [error] = safeRun(() => PolicyRegistry.getPolicy(domain, nonExistentPolicyName));
      
      // Assert
      expect(error.message).toBe(`Policy "${nonExistentPolicyName}" not found in domain "${domain}"`);
    });
  });
  
  describe('getDomainPolicies', () => {
    it('should return all policies for domain', () => {
      // Arrange
      const domain = 'user';
      const policy1 = createMockPolicy();
      const policy2 = createMockPolicy();
      
      PolicyRegistry.register(domain, 'policy1', policy1);
      PolicyRegistry.register(domain, 'policy2', policy2);
      
      // Act
      const domainPolicies = PolicyRegistry.getDomainPolicies(domain);
      
      // Assert
      expect(Object.keys(domainPolicies).length).toBe(2);
      expect(domainPolicies['policy1']).toBe(policy1);
      expect(domainPolicies['policy2']).toBe(policy2);
    });
    
    it('should throw error for non-existent domain', () => {
      // Arrange
      const nonExistentDomain = 'nonExistent';
      
      // Act
      const [error] = safeRun(() => PolicyRegistry.getDomainPolicies(nonExistentDomain));
      
      // Assert
      expect(error.message).toBe(`Domain "${nonExistentDomain}" not found`);
  });
});
});
