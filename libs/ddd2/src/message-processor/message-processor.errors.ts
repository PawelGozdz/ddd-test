import { IDomainError, DomainErrorCode, DomainErrorOptions } from '../core';

export class MessageProcessorNotFoundError extends IDomainError {
  static withMessageType(
    messageType: string,
    data?: DomainErrorOptions,
  ): MessageProcessorNotFoundError {
    const message = `No handler registered for message type: ${messageType}`;
    const options = {
      code: DomainErrorCode.NotFound,
      data,
    };
    return new MessageProcessorNotFoundError(message, options);
  }
}
