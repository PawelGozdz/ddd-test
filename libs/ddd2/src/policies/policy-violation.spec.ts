import { PolicyViolation } from '../policies';

/**
 * Unit tests for PolicyViolation class
 */
describe('PolicyViolation', () => {
  // Test that constructor properly sets properties
  it('should set code, message and details correctly', () => {
    // Arrange
    const code = 'POLICY_VIOLATED';
    const message = 'The policy has been violated';
    const details = { field: 'age', value: 17 };
    
    // Act
    const violation = new PolicyViolation(code, message, details);
    
    // Assert
    expect(violation.code).toBe(code);
    expect(violation.message).toBe(message);
    expect(violation.details).toEqual(details);
  });
  
  // Test that toString returns properly formatted message
  it('should format toString result correctly', () => {
    // Arrange
    const code = 'POLICY_VIOLATED';
    const message = 'The policy has been violated';
    const violation = new PolicyViolation(code, message);
    
    // Act
    const result = violation.toString();
    
    // Assert
    expect(result).toBe(`${code}: ${message}`);
  });
  
  // Test that details are optional
  it('should allow undefined details', () => {
    // Arrange
    const code = 'POLICY_VIOLATED';
    const message = 'The policy has been violated';
    
    // Act
    const violation = new PolicyViolation(code, message);
    
    // Assert
    expect(violation.details).toBeUndefined();
  });
});
