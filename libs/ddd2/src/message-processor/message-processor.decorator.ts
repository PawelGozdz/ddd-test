import 'reflect-metadata';
import { IOutboxMessage } from '../outbox';

// Metadata keys
export const MESSAGE_HANDLER_METADATA = Symbol('messageHandler');
export const MESSAGE_HANDLER_OPTIONS = Symbol('messageHandlerOptions');

/**
 * Options for message handler
 */
export interface MessageHandlerOptions {
  /** Whether to auto-register this handler */
  autoRegister?: boolean;

  /** Description of what this handler does */
  description?: string;
}

/**
 * Decorator for message handlers
 * Can be used on classes or methods
 * @param messageType Type of message to handle
 * @param options Additional options
 */
export function MessageHandler(
  messageType: string,
  options: MessageHandlerOptions = {},
) {
  return function (
    target: any,
    propertyKey?: string | symbol,
    descriptor?: TypedPropertyDescriptor<any>,
  ) {
    const metadata = { messageType };

    if (propertyKey !== undefined && descriptor !== undefined) {
      // Method decorator
      Reflect.defineMetadata(
        MESSAGE_HANDLER_METADATA,
        metadata,
        descriptor.value,
      );
      Reflect.defineMetadata(
        MESSAGE_HANDLER_OPTIONS,
        options,
        descriptor.value,
      );
      return descriptor;
    } else {
      // Class decorator
      Reflect.defineMetadata(MESSAGE_HANDLER_METADATA, metadata, target);
      Reflect.defineMetadata(MESSAGE_HANDLER_OPTIONS, options, target);

      // Add helper method for adapter
      if (!target.prototype.getMessageType) {
        target.prototype.getMessageType = function () {
          return messageType;
        };
      }

      // Add default handle method if not exists
      if (!target.prototype.handle) {
        target.prototype.handle = async function (message: IOutboxMessage) {
          if (this.process) {
            return await this.process(message);
          }
          throw new Error(
            `Handler for ${messageType} has no handle or process method`,
          );
        };
      }

      return target;
    }
  };
}

/**
 * Decorator for integration event handlers
 * Specialized version of MessageHandler for integration events
 * @param eventType Type of integration event to handle
 * @param options Additional options
 */
export function IntegrationEventHandler(
  eventType: string,
  options: MessageHandlerOptions = {},
) {
  return MessageHandler(`integration_event:${eventType}`, options);
}
