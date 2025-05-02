import { LibUtils } from '../../utils';
import { BaseError, ErrorOptions } from './base.error';
import { DomainErrorCode } from './error.enum';

export type DomainErrorOptions = ErrorOptions & {
  domain?: string | any;
  code?: DomainErrorCode;
  data?: unknown;
  error?: Error;
};

export abstract class DomainError extends BaseError implements DomainErrorOptions {
  domain?: string | any;

  code: DomainErrorCode;

  data?: unknown;

  timestamp?: Date;

  error?: Error;

  constructor(message: string, options: DomainErrorOptions | Error = {}) {
    super(message);

    if (options instanceof Error) {
      this.error = options;
    } else if (LibUtils.isNotEmpty(options) && 'code' in options) {
      this.domain = options?.domain;
      this.code = options?.code != null ? options?.code : DomainErrorCode.Default;
      this.data = options?.data ?? {};
      this.error = options?.error;
    }

    this.timestamp = DomainError.generateTimestamp();
  }

  private static generateTimestamp(): Date {
    return new Date();
  }
}

export class MissingValueError extends DomainError {
  static withValue(msg: string, data?: DomainErrorOptions): MissingValueError {
    const message = msg ?? 'Missing value';
    const options = {
      code: DomainErrorCode.MissingValue,
      data,
    };
    return new MissingValueError(message, options);
  }
}

export class InvalidParameterError extends DomainError {
  static withParameter(parameter: string, msg?: string, data?: DomainErrorOptions): InvalidParameterError {
    const message = msg ?? `Invalid ${parameter}`;
    const options: DomainErrorOptions = {
      code: DomainErrorCode.MissingValue,
      data,
    };

    return new InvalidParameterError(message, options);
  }
}

export class DuplicateError extends DomainError {
  static withEntityId(id: string, data?: DomainErrorOptions): DuplicateError {
    const message = `Entity with id ${id} already exists`;
    const options = {
      code: DomainErrorCode.DuplicateEntry,
      data,
    };
    return new DuplicateError(message, options);
  }

  static withServiceId(serviceId: string, data?: DomainErrorOptions): DuplicateError {
    const message = `Service with id ${serviceId} already exists`;
    const options = {
      code: DomainErrorCode.DuplicateEntry,
      data,
    };
    return new DuplicateError(message, options);
  }
}

export class NotFoundError extends DomainError {
  static withEntityId(id: string, data?: DomainErrorOptions): DuplicateError {
    const message = `Entity with id ${id} already exists`;
    const options = {
      code: DomainErrorCode.DuplicateEntry,
      data,
    };
    return new DuplicateError(message, options);
  }

  static withServiceId(serviceId: string, data?: DomainErrorOptions): NotFoundError {
    const message = `Service with id ${serviceId} not found`;
    const options = {
      code: DomainErrorCode.NotFound,
      data,
    };
    return new NotFoundError(message, options);
  }
}

export class VersionError extends DomainError {
  static withEntityIdAndVersions(id: any, dbVersion: any, newVersion: any, data?: DomainErrorOptions): DuplicateError {
    const message = `Version mismatch for entity with id ${id}: expected [${dbVersion}], got [${newVersion}]`;
    const options = {
      code: DomainErrorCode.ValidationFailed,
      data,
    };
    return new VersionError(message, options);
  }
}
