import { IValidator, ValidationError, ValidationErrors, SpecificationValidator, BusinessRuleValidator, ISpecification, Specification } from '../validations';
import { Result } from '../utils';

/**
 * Fabryki i narzędzia do pracy z walidatorami i specyfikacjami
 */
export const Validation = {
  /**
   * Tworzy nowy walidator reguł biznesowych
   */
  create<T>(): BusinessRuleValidator<T> {
    return BusinessRuleValidator.create<T>();
  },
  
  /**
   * Tworzy walidator oparty na specyfikacji
   */
  fromSpecification<T>(
    specification: ISpecification<T>,
    message: string,
    property?: string
  ): IValidator<T> {
    return SpecificationValidator.fromSpecification(specification, message, property);
  },
  
  /**
   * Tworzy walidator łączący wiele walidatorów
   */
  combine<T>(...validators: IValidator<T>[]): IValidator<T> {
    return {
      validate: (value: T): Result<T, ValidationErrors> => {
        const errors: ValidationErrors[] = [];
        
        for (const validator of validators) {
          const result = validator.validate(value);
          if (result.isFailure) {
            errors.push(result.error);
          }
        }
        
        if (errors.length > 0) {
          // Łączymy wszystkie błędy
          const allErrors = errors.flatMap(e => e.errors);
          return Result.fail(new ValidationErrors(allErrors));
        }
        
        return Result.ok(value);
      }
    };
  },
  
  /**
   * Waliduje obiekt bezpośrednio za pomocą specyfikacji
   */
  validateWithSpecification<T>(
    value: T, 
    specification: ISpecification<T>,
    message: string
  ): Result<T, ValidationErrors> {
    return this.fromSpecification(specification, message).validate(value);
  },
  
  /**
   * Waliduje za pomocą wielu specyfikacji z własnymi komunikatami błędów
   */
  validateWithRules<T>(
    value: T,
    rules: Array<{
      specification: ISpecification<T>,
      message: string,
      property?: string
    }>
  ): Result<T, ValidationErrors> {
    const validator = SpecificationValidator.create<T>();
    
    for (const rule of rules) {
      validator.addRule(rule.specification, rule.message, rule.property);
    }
    
    return validator.validate(value);
  },
  
  // Narzędzia konwersji
  
  /**
   * Konwertuje specyfikację na walidator
   */
  specificationToValidator<T>(
    specification: ISpecification<T>,
    message: string,
    property?: string
  ): IValidator<T> {
    return this.fromSpecification(specification, message, property);
  },
  
  /**
   * Konwertuje walidator na specyfikację
   */
  validatorToSpecification<T>(validator: IValidator<T>): ISpecification<T> {
    return Specification.create<T>(
      (candidate) => validator.validate(candidate).isSuccess
    );
  },

  /**
   * Tworzy walidator dla głęboko zagnieżdżonej struktury obiektów
   */
  forNestedPath<T>(path: string[], validator: IValidator<any>): IValidator<T> {
    if (path.length === 0) {
      return validator as unknown as IValidator<T>;
    }

    let currentValidator = validator;
    
    // Budowanie walidatorów od najgłębszego poziomu
    for (let i = path.length - 1; i >= 0; i--) {
      const property = path[i];
      const nestedValidator = BusinessRuleValidator.create();
      
      nestedValidator.addNested(property, currentValidator, (obj) => {
        return obj ? obj[property] : undefined;
      });
      
      currentValidator = nestedValidator;
    }
    
    return currentValidator as unknown as IValidator<T>;
  },
  
  /**
   * Waliduje głęboko zagnieżdżoną właściwość
   */
  validatePath<T, P>(
    object: T, 
    path: (string | number)[], 
    valueValidator: IValidator<P>
  ): Result<T, ValidationErrors> {
    // Funkcja pomocnicza do pobierania wartości po ścieżce
    const getValueByPath = (obj: any, pathSegments: (string | number)[]): any => {
      let current = obj;
      
      for (const segment of pathSegments) {
        if (current === null || current === undefined) {
          return undefined;
        }
        
        current = current[segment];
      }
      
      return current;
    };
    
    const pathValue = getValueByPath(object, path);
    
    if (pathValue === undefined) {
      return Result.fail(new ValidationErrors([
        new ValidationError(path.join('.'), 'Path does not exist', { path })
      ]));
    }
    
    const valueResult = valueValidator.validate(pathValue as P);
    
    if (valueResult.isFailure) {
      // Przekształć błędy, dodając ścieżkę
      const prefixedErrors = valueResult.error.errors.map(err => {
        const fullPath = [...path];
        if (err.property) {
          fullPath.push(err.property);
        }
        
        return new ValidationError(
          fullPath.join('.'),
          err.message,
          { ...err.context, fullPath }
        );
      });
      
      return Result.fail(new ValidationErrors(prefixedErrors));
    }
    
    return Result.ok(object);
  }
};

