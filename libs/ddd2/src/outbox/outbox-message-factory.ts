import { LibUtils } from '../utils';
import {
  IOutboxMessage,
  MessageStatus,
  MessagePriority,
  OutboxMessageOptions,
} from './outbox-interfaces';

/**
 * Factory for creating outbox messages
 * Provides utility methods for creating different types of messages
 */
export class OutboxMessageFactory {
  /**
   * Creates a new outbox message
   * @param messageType Type of the message
   * @param payload Message payload
   * @param options Additional options
   * @returns Outbox message
   */
  static createMessage<T = any>(
    messageType: string,
    payload: T,
    options?: OutboxMessageOptions,
  ): IOutboxMessage<T> {
    return {
      id: LibUtils.getUUID(),
      messageType,
      payload,
      metadata: options?.metadata || {},
      status: MessageStatus.PENDING,
      attempts: 0,
      createdAt: new Date(),
      processAfter: options?.processAfter,
      priority: options?.priority || MessagePriority.NORMAL,
    };
  }

  /**
   * Creates a delayed outbox message
   * @param messageType Type of the message
   * @param payload Message payload
   * @param delayMs Delay in milliseconds
   * @param options Additional options
   * @returns Outbox message scheduled for later processing
   */
  static createDelayedMessage<T = any>(
    messageType: string,
    payload: T,
    delayMs: number,
    options?: OutboxMessageOptions,
  ): IOutboxMessage<T> {
    const processAfter = new Date(Date.now() + delayMs);

    return OutboxMessageFactory.createMessage(messageType, payload, {
      ...options,
      processAfter,
    });
  }

  /**
   * Creates a high priority outbox message
   * @param messageType Type of the message
   * @param payload Message payload
   * @param options Additional options
   * @returns High priority outbox message
   */
  static createHighPriorityMessage<T = any>(
    messageType: string,
    payload: T,
    options?: OutboxMessageOptions,
  ): IOutboxMessage<T> {
    return OutboxMessageFactory.createMessage(messageType, payload, {
      ...options,
      priority: MessagePriority.HIGH,
    });
  }

  /**
   * Creates an outbox message from an integration event
   * @param event Integration event
   * @param options Additional options
   * @returns Outbox message containing the integration event
   */
  static createFromIntegrationEvent<T = any>(
    event: { eventType: string; payload?: T; metadata?: Record<string, any> },
    options?: OutboxMessageOptions,
  ): IOutboxMessage<T> {
    return OutboxMessageFactory.createMessage(
      `integration_event:${event.eventType}`,
      event.payload as T,
      {
        metadata: {
          ...(event.metadata || {}),
          ...(options?.metadata || {}),
        },
        processAfter: options?.processAfter,
        priority: options?.priority,
      },
    );
  }
}
