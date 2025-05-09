/**
 * Type for class constructors
 * This is both a type and a value that can be used at runtime
 */
export interface Constructor<T = object> {
  new (...args: any[]): T;
}
