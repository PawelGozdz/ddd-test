export interface ISpecification<T> {
  isSatisfiedBy(candidate: T): boolean;
  and(other: ISpecification<T>): ISpecification<T>;
  or(other: ISpecification<T>): ISpecification<T>;
  not(): ISpecification<T>;

  readonly name?: string;
  readonly description?: string;

  toExpression?(): any;
  toQueryPredicate?(): any;

  explainFailure?(candidate: T): string | null;
}
