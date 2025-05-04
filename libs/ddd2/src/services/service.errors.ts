import { IDomainError, DomainErrorCode, DomainErrorOptions } from "../core";

export class ServiceDuplicateError extends IDomainError {
  static withServiceId(serviceId: string, data?: DomainErrorOptions): ServiceDuplicateError {
    const message = `Service with id ${serviceId} already exists`;
    const options = {
      code: DomainErrorCode.DuplicateEntry,
      data,
    };
    return new ServiceDuplicateError(message, options);
  }
}

export class ServiceNotFoundError extends IDomainError {
  static withServiceId(serviceId: string, data?: DomainErrorOptions): ServiceNotFoundError {
    const message = `Service with id ${serviceId} not found`;
    const options = {
      code: DomainErrorCode.NotFound,
      data,
    };
    return new ServiceNotFoundError(message, options);
  }
}
