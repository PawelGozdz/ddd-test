/**
 * Represents a business policy violation
 */
export class PolicyViolation {
  constructor(
    public readonly code: string,
    public readonly message: string,
    public readonly details?: Record<string, any>,
  ) {}

  toString(): string {
    return `${this.code}: ${this.message}`;
  }
}
