import { DomainErrorCode, DomainErrorOptions, IDomainError } from "../errors";

export class VersionError extends IDomainError {
  static withEntityIdAndVersions(id: any, dbVersion: any, newVersion: any, data?: DomainErrorOptions): VersionError {
    const message = `Version mismatch for entity with id ${id}: expected [${dbVersion}], got [${newVersion}]`;
    const options = {
      code: DomainErrorCode.ValidationFailed,
      data,
    };
    return new VersionError(message, options);
  }
}
