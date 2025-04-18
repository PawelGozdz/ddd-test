import { Result } from '../utils';
import { ValidationError } from '../validations';

export interface ValidationRule<T> {
  /** Prop name or path */
  property: string;
  
  /** Function validation */
  validate: (value: T) => Result<true, ValidationError>;
  
  /** Condition for when to apply the rule */
  condition?: (value: T) => boolean;
}