import { describe, it, expect } from 'vitest';

import { CompositeSpecification, AndSpecification, OrSpecification, NotSpecification } from './composite-specification';
import { ISpecification } from './specification-interface';

// Extend the specifications to implement expression conversion
class ExpressionSpecification<T> extends CompositeSpecification<T> {
  constructor(
    private readonly predicate: (candidate: T) => boolean,
    private readonly property?: keyof T,
    private readonly operator?: string,
    private readonly value?: any
  ) {
    super();
  }

  isSatisfiedBy(candidate: T): boolean {
    return this.predicate(candidate);
  }

  // Convert to a query expression object
  toExpression(): any {
    if (!this.property) {
      return { type: 'custom' };
    }

    return {
      type: 'condition',
      property: String(this.property),
      operator: this.operator || 'custom',
      value: this.value
    };
  }

  // Convert to a query predicate string (for SQL-like queries)
  toQueryPredicate(): string {
    if (!this.property) {
      return '(custom predicate)';
    }

    const prop = String(this.property);
    const val = typeof this.value === 'string' ? `'${this.value}'` : this.value;

    switch (this.operator) {
      case '=':
        return `${prop} = ${val}`;
      case '>':
        return `${prop} > ${val}`;
      case '>=':
        return `${prop} >= ${val}`;
      case '<':
        return `${prop} < ${val}`;
      case '<=':
        return `${prop} <= ${val}`;
      case 'in':
        if (Array.isArray(this.value)) {
          const values = this.value.map(v => typeof v === 'string' ? `'${v}'` : v).join(', ');
          return `${prop} IN (${values})`;
        }
        return `${prop} IN (${val})`;
      case 'between':
        if (Array.isArray(this.value) && this.value.length === 2) {
          return `${prop} BETWEEN ${this.value[0]} AND ${this.value[1]}`;
        }
        return `${prop} BETWEEN (custom range)`;
      default:
        return `${prop} ${this.operator || 'custom'} ${val}`;
    }
  }
}

// Extending composite specifications to implement expression conversion
class ExpressionAndSpecification<T> extends AndSpecification<T> {
  constructor(
    private readonly leftSpec: ISpecification<T>,
    private readonly rightSpec: ISpecification<T>
  ) {
    super(leftSpec, rightSpec);
  }

  toExpression(): any {
    const left = this.leftSpec.toExpression?.() || { type: 'unknown' };
    const right = this.rightSpec.toExpression?.() || { type: 'unknown' };

    return {
      type: 'and',
      left,
      right
    };
  }

  toQueryPredicate(): string {
    const left = this.leftSpec.toQueryPredicate?.() || '(unknown)';
    const right = this.rightSpec.toQueryPredicate?.() || '(unknown)';

    return `(${left}) AND (${right})`;
  }
}

class ExpressionOrSpecification<T> extends OrSpecification<T> {
  constructor(
    private readonly leftSpec: ISpecification<T>,
    private readonly rightSpec: ISpecification<T>
  ) {
    super(leftSpec, rightSpec);
  }

  toExpression(): any {
    const left = this.leftSpec.toExpression?.() || { type: 'unknown' };
    const right = this.rightSpec.toExpression?.() || { type: 'unknown' };

    return {
      type: 'or',
      left,
      right
    };
  }

  toQueryPredicate(): string {
    const left = this.leftSpec.toQueryPredicate?.() || '(unknown)';
    const right = this.rightSpec.toQueryPredicate?.() || '(unknown)';

    return `(${left}) OR (${right})`;
  }
}

class ExpressionNotSpecification<T> extends NotSpecification<T> {
  constructor(private readonly innerSpec: ISpecification<T>) {
    super(innerSpec);
  }

  toExpression(): any {
    const inner = this.innerSpec.toExpression?.() || { type: 'unknown' };

    return {
      type: 'not',
      expression: inner
    };
  }

  toQueryPredicate(): string {
    const inner = this.innerSpec.toQueryPredicate?.() || '(unknown)';

    return `NOT (${inner})`;
  }
}

// Factory for creating expression specifications
const ExpressionSpec = {
  equals<T>(property: keyof T, value: any): ISpecification<T> {
    return new ExpressionSpecification<T>(
      (candidate) => candidate[property] === value,
      property,
      '=',
      value
    );
  },

  greaterThan<T>(property: keyof T, value: number): ISpecification<T> {
    return new ExpressionSpecification<T>(
      (candidate) => (candidate[property] as unknown as number) > value,
      property,
      '>',
      value
    );
  },

  lessThan<T>(property: keyof T, value: number): ISpecification<T> {
    return new ExpressionSpecification<T>(
      (candidate) => (candidate[property] as unknown as number) < value,
      property,
      '<',
      value
    );
  },

  between<T>(property: keyof T, min: number, max: number): ISpecification<T> {
    return new ExpressionSpecification<T>(
      (candidate) => {
        const val = candidate[property] as unknown as number;
        return val >= min && val <= max;
      },
      property,
      'between',
      [min, max]
    );
  },

  in<T>(property: keyof T, values: any[]): ISpecification<T> {
    return new ExpressionSpecification<T>(
      (candidate) => values.includes(candidate[property]),
      property,
      'in',
      values
    );
  },

  and<T>(left: ISpecification<T>, right: ISpecification<T>): ISpecification<T> {
    return new ExpressionAndSpecification<T>(left, right);
  },

  or<T>(left: ISpecification<T>, right: ISpecification<T>): ISpecification<T> {
    return new ExpressionOrSpecification<T>(left, right);
  },

  not<T>(spec: ISpecification<T>): ISpecification<T> {
    return new ExpressionNotSpecification<T>(spec);
  }
};

describe('Specification Expression Conversion', () => {
  // Test data
  interface Product {
    id: number;
    name: string;
    price: number;
    category: string;
    stock: number;
  }

  const product: Product = {
    id: 1,
    name: 'Test Product',
    price: 29.99,
    category: 'electronics',
    stock: 100
  };

  describe('Basic Expressions', () => {
    it('should convert equals specification to expression', () => {
      // Arrange
      const spec = ExpressionSpec.equals<Product>('category', 'electronics');
      
      // Act
      const expression = spec.toExpression();
      
      // Assert
      expect(expression).toEqual({
        type: 'condition',
        property: 'category',
        operator: '=',
        value: 'electronics'
      });
    });

    it('should convert equals specification to query predicate', () => {
      // Arrange
      const spec = ExpressionSpec.equals<Product>('category', 'electronics');
      
      // Act
      const predicate = spec.toQueryPredicate();
      
      // Assert
      expect(predicate).toBe("category = 'electronics'");
    });

    it('should convert number comparison to expression', () => {
      // Arrange
      const spec = ExpressionSpec.greaterThan<Product>('price', 20);
      
      // Act
      const expression = spec.toExpression();
      
      // Assert
      expect(expression).toEqual({
        type: 'condition',
        property: 'price',
        operator: '>',
        value: 20
      });
    });

    it('should convert number comparison to query predicate', () => {
      // Arrange
      const spec = ExpressionSpec.greaterThan<Product>('price', 20);
      
      // Act
      const predicate = spec.toQueryPredicate();
      
      // Assert
      expect(predicate).toBe("price > 20");
    });

    it('should convert between specification to expression', () => {
      // Arrange
      const spec = ExpressionSpec.between<Product>('price', 20, 30);
      
      // Act
      const expression = spec.toExpression();
      
      // Assert
      expect(expression).toEqual({
        type: 'condition',
        property: 'price',
        operator: 'between',
        value: [20, 30]
      });
    });

    it('should convert between specification to query predicate', () => {
      // Arrange
      const spec = ExpressionSpec.between<Product>('price', 20, 30);
      
      // Act
      const predicate = spec.toQueryPredicate();
      
      // Assert
      expect(predicate).toBe("price BETWEEN 20 AND 30");
    });

    it('should convert in specification to expression', () => {
      // Arrange
      const spec = ExpressionSpec.in<Product>('category', ['electronics', 'gadgets']);
      
      // Act
      const expression = spec.toExpression();
      
      // Assert
      expect(expression).toEqual({
        type: 'condition',
        property: 'category',
        operator: 'in',
        value: ['electronics', 'gadgets']
      });
    });

    it('should convert in specification to query predicate', () => {
      // Arrange
      const spec = ExpressionSpec.in<Product>('category', ['electronics', 'gadgets']);
      
      // Act
      const predicate = spec.toQueryPredicate();
      
      // Assert
      expect(predicate).toBe("category IN ('electronics', 'gadgets')");
    });
  });

  describe('Composite Expressions', () => {
    it('should convert AND specification to expression', () => {
      // Arrange
      const spec = ExpressionSpec.and<Product>(
        ExpressionSpec.equals<Product>('category', 'electronics'),
        ExpressionSpec.greaterThan<Product>('price', 20)
      );
      
      // Act
      const expression = spec.toExpression();
      
      // Assert
      expect(expression).toEqual({
        type: 'and',
        left: {
          type: 'condition',
          property: 'category',
          operator: '=',
          value: 'electronics'
        },
        right: {
          type: 'condition',
          property: 'price',
          operator: '>',
          value: 20
        }
      });
    });

    it('should convert AND specification to query predicate', () => {
      // Arrange
      const spec = ExpressionSpec.and<Product>(
        ExpressionSpec.equals<Product>('category', 'electronics'),
        ExpressionSpec.greaterThan<Product>('price', 20)
      );
      
      // Act
      const predicate = spec.toQueryPredicate();
      
      // Assert
      expect(predicate).toBe("(category = 'electronics') AND (price > 20)");
    });

    it('should convert OR specification to expression', () => {
      // Arrange
      const spec = ExpressionSpec.or<Product>(
        ExpressionSpec.equals<Product>('category', 'electronics'),
        ExpressionSpec.equals<Product>('category', 'gadgets')
      );
      
      // Act
      const expression = spec.toExpression();
      
      // Assert
      expect(expression).toEqual({
        type: 'or',
        left: {
          type: 'condition',
          property: 'category',
          operator: '=',
          value: 'electronics'
        },
        right: {
          type: 'condition',
          property: 'category',
          operator: '=',
          value: 'gadgets'
        }
      });
    });

    it('should convert OR specification to query predicate', () => {
      // Arrange
      const spec = ExpressionSpec.or<Product>(
        ExpressionSpec.equals<Product>('category', 'electronics'),
        ExpressionSpec.equals<Product>('category', 'gadgets')
      );
      
      // Act
      const predicate = spec.toQueryPredicate();
      
      // Assert
      expect(predicate).toBe("(category = 'electronics') OR (category = 'gadgets')");
    });

    it('should convert NOT specification to expression', () => {
      // Arrange
      const spec = ExpressionSpec.not<Product>(
        ExpressionSpec.equals<Product>('category', 'clothing')
      );
      
      // Act
      const expression = spec.toExpression();
      
      // Assert
      expect(expression).toEqual({
        type: 'not',
        expression: {
          type: 'condition',
          property: 'category',
          operator: '=',
          value: 'clothing'
        }
      });
    });

    it('should convert NOT specification to query predicate', () => {
      // Arrange
      const spec = ExpressionSpec.not<Product>(
        ExpressionSpec.equals<Product>('category', 'clothing')
      );
      
      // Act
      const predicate = spec.toQueryPredicate();
      
      // Assert
      expect(predicate).toBe("NOT (category = 'clothing')");
    });

    it('should convert complex nested specification to expression', () => {
      // Arrange
      // (category = 'electronics' OR category = 'gadgets') AND (price > 20 AND stock > 0)
      const spec = ExpressionSpec.and<Product>(
        ExpressionSpec.or<Product>(
          ExpressionSpec.equals<Product>('category', 'electronics'),
          ExpressionSpec.equals<Product>('category', 'gadgets')
        ),
        ExpressionSpec.and<Product>(
          ExpressionSpec.greaterThan<Product>('price', 20),
          ExpressionSpec.greaterThan<Product>('stock', 0)
        )
      );
      
      // Act
      const expression = spec.toExpression();
      
      // Assert
      expect(expression).toEqual({
        type: 'and',
        left: {
          type: 'or',
          left: {
            type: 'condition',
            property: 'category',
            operator: '=',
            value: 'electronics'
          },
          right: {
            type: 'condition',
            property: 'category',
            operator: '=',
            value: 'gadgets'
          }
        },
        right: {
          type: 'and',
          left: {
            type: 'condition',
            property: 'price',
            operator: '>',
            value: 20
          },
          right: {
            type: 'condition',
            property: 'stock',
            operator: '>',
            value: 0
          }
        }
      });
    });

    it('should convert complex nested specification to query predicate', () => {
      // Arrange
      // (category = 'electronics' OR category = 'gadgets') AND (price > 20 AND stock > 0)
      const spec = ExpressionSpec.and<Product>(
        ExpressionSpec.or<Product>(
          ExpressionSpec.equals<Product>('category', 'electronics'),
          ExpressionSpec.equals<Product>('category', 'gadgets')
        ),
        ExpressionSpec.and<Product>(
          ExpressionSpec.greaterThan<Product>('price', 20),
          ExpressionSpec.greaterThan<Product>('stock', 0)
        )
      );
      
      // Act
      const predicate = spec.toQueryPredicate();
      
      // Assert
      expect(predicate).toBe(
        "((category = 'electronics') OR (category = 'gadgets')) AND ((price > 20) AND (stock > 0))"
      );
    });
  });

  describe('Practical Use Cases', () => {
    // Create a mock repository that uses specification expressions
    class ProductRepository {
      private products: Product[] = [];
      
      constructor(initialProducts: Product[] = []) {
        this.products = [...initialProducts];
      }
      
      // Find products by specification and convert to query
      findBySpecification(spec: ISpecification<Product>): { query: string, results: Product[] } {
        // Convert specification to query (in a real system, this might be SQL or MongoDB query)
        const query = spec.toQueryPredicate?.() || '(custom query)';
        
        // Apply the specification to filter products
        const results = this.products.filter(p => spec.isSatisfiedBy(p));
        
        return { query, results };
      }
      
      // Add a product
      add(product: Product): void {
        this.products.push({ ...product });
      }
    }

    it('should use expressions in a repository context', () => {
      // Arrange
      const repository = new ProductRepository([
        {
          id: 1,
          name: 'Laptop',
          price: 999.99,
          category: 'electronics',
          stock: 50
        },
        {
          id: 2,
          name: 'Smartphone',
          price: 499.99,
          category: 'electronics',
          stock: 100
        },
        {
          id: 3,
          name: 'T-shirt',
          price: 19.99,
          category: 'clothing',
          stock: 200
        },
        {
          id: 4,
          name: 'Book',
          price: 9.99,
          category: 'books',
          stock: 150
        }
      ]);
      
      // Create a specification for electronics priced over $100
      const spec = ExpressionSpec.and<Product>(
        ExpressionSpec.equals<Product>('category', 'electronics'),
        ExpressionSpec.greaterThan<Product>('price', 100),
      );

      // Act
      const result = repository.findBySpecification(spec);
      
      // Assert
      expect(result.query).toBe("(category = 'electronics') AND (price > 100)");
      expect(result.results.length).toBe(2);
      expect(result.results[0].name).toBe('Laptop');
      expect(result.results[1].name).toBe('Smartphone');
    });

    it('should use complex expressions for advanced filtering', () => {
      // Arrange
      const repository = new ProductRepository([
        {
          id: 1,
          name: 'Laptop',
          price: 999.99,
          category: 'electronics',
          stock: 50
        },
        {
          id: 2,
          name: 'Smartphone',
          price: 499.99,
          category: 'electronics',
          stock: 100
        },
        {
          id: 3,
          name: 'T-shirt',
          price: 19.99,
          category: 'clothing',
          stock: 200
        },
        {
          id: 4,
          name: 'Book',
          price: 9.99,
          category: 'books',
          stock: 150
        },
        {
          id: 5,
          name: 'Budget Phone',
          price: 99.99,
          category: 'electronics',
          stock: 5
        }
      ]);
      
      // Create a specification for:
      // Electronics that are either expensive (>$400) OR low in stock (<10)
      const spec = ExpressionSpec.and<Product>(
        ExpressionSpec.equals<Product>('category', 'electronics'),
        ExpressionSpec.or<Product>(
          ExpressionSpec.greaterThan<Product>('price', 400),
          ExpressionSpec.lessThan<Product>('stock', 10)
        )
      );

      // Act
      const result = repository.findBySpecification(spec);
      
      // Assert
      expect(result.query).toBe("(category = 'electronics') AND ((price > 400) OR (stock < 10))");
      expect(result.results.length).toBe(3);
      
      // Should include: Laptop, Smartphone, and Budget Phone
      const names = result.results.map(p => p.name);
      expect(names).toContain('Laptop');
      expect(names).toContain('Smartphone');
      expect(names).toContain('Budget Phone');
      
      // Should not include: T-shirt, Book
      expect(names).not.toContain('T-shirt');
      expect(names).not.toContain('Book');
    });
  });
});