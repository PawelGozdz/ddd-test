export class ValidationError {
  constructor(
    public readonly property: string,
    public readonly message: string,
    public readonly context?: Record<string, any>
  ) {}

  toString(): string {
    return `${this.property}: ${this.message}`;
  }
}

export class ValidationErrors extends Error {
  constructor(public readonly errors: ValidationError[]) {
    super(`Validation failed with ${errors.length} error(s): ${errors.map(e => e.toString()).join('; ')}`);
    this.name = 'ValidationErrors';
  }
}