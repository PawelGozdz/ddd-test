import { EntityId } from "./value-objects";

/**
 * Type for class constructors
 * This is both a type and a value that can be used at runtime
 */
export interface Constructor<T = {}> {
  new (...args: any[]): T;
}
