import { Result } from '../utils';
import { IModelTranslator } from './acl.interfaces';
import { TranslationError } from './acl-errors';

export abstract class BaseModelTranslator<TDomain, TExternal>
  implements IModelTranslator<TDomain, TExternal>
{
  constructor(protected readonly contextName: string) {}

  toExternal(domainModel: TDomain): TExternal {
    try {
      const validationResult = this.validateDomain?.(domainModel);
      if (validationResult?.isFailure) {
        throw new Error(
          `Domain validation failed: ${validationResult.error.message}`,
        );
      }

      return this.performToExternalTranslation(domainModel);
    } catch (error) {
      throw TranslationError.forToExternal(
        'Translation to external failed',
        this.contextName,
        domainModel,
        error as Error,
      );
    }
  }

  fromExternal(externalModel: TExternal): TDomain {
    try {
      const validationResult = this.validateExternal?.(externalModel);
      if (validationResult?.isFailure) {
        throw new Error(
          `External validation failed: ${validationResult.error.message}`,
        );
      }

      return this.performFromExternalTranslation(externalModel);
    } catch (error) {
      throw TranslationError.forFromExternal(
        'Translation from external failed',
        this.contextName,
        externalModel,
        error as Error,
      );
    }
  }

  protected abstract performToExternalTranslation(
    domainModel: TDomain,
  ): TExternal;
  protected abstract performFromExternalTranslation(
    externalModel: TExternal,
  ): TDomain;

  public validateDomain?(domainModel: TDomain): Result<void, Error>;
  public validateExternal?(externalModel: TExternal): Result<void, Error>;
}
