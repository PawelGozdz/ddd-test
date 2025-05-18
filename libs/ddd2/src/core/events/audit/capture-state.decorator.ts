import { ISpecification } from '../../../validations';
import { IAuditable } from './audible.interface';

/**
 * Decorator for capturing entity/aggregate state before changes
 * Works with any class implementing IAuditable interface
 *
 * @param conditionOrSpecification Optional specification or function that determines
 *                                when to capture state. If not provided, always captures.
 */
export function captureState<T extends IAuditable>(
  conditionOrSpecification?:
    | ISpecification<T>
    | ((instance: T, args: any[]) => boolean),
): MethodDecorator {
  return function (
    _target: object,
    _propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]): any {
      if (!('saveSnapshot' in this)) {
        console.warn(
          `Class ${this.constructor.name} doesn't properly implement IAuditable interface. @captureState decorator has no effect.`,
        );
        return originalMethod.apply(this, args);
      }

      let shouldCapture = true;

      // If condition is provided, evaluate it
      if (conditionOrSpecification) {
        if (typeof conditionOrSpecification === 'function') {
          // It's a function
          shouldCapture = conditionOrSpecification(this as T, args);
        } else {
          // It's a specification
          shouldCapture = conditionOrSpecification.isSatisfiedBy(this as T);
        }
      }

      // Capture state if condition is met
      if (shouldCapture) {
        this.saveSnapshot();
      }

      // Execute the original method
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}
