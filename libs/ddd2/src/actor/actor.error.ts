import { DomainError, DomainErrorCode, DomainErrorOptions } from "../core";
import { ActorType } from "./actor-type.enum";

export class ActorError extends DomainError {
  static withType(type: ActorType, data?: DomainErrorOptions): ActorError {
    const message = `Invalid actor type: ${type}`;
    const options = {
      code: DomainErrorCode.InvalidParameter,
      data,
    };
    return new ActorError(message, options);
  }

  static withMessage(message: string, data?: DomainErrorOptions): ActorError {
    const options = {
      code: DomainErrorCode.InvalidParameter,
      data,
    };
    return new ActorError(message, options);
  }
}
