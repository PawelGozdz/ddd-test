export interface ISpecification<T> {
  isSatisfiedBy(candidate: T): boolean;
  and(other: ISpecification<T>): ISpecification<T>;
  or(other: ISpecification<T>): ISpecification<T>;
  not(): ISpecification<T>;

  readonly name?: string;
  readonly description?: string;

  explainFailure?(candidate: T): string | null;
}
