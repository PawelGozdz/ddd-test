import {
  IOutboxMessage,
  IOutboxMessageHandler,
  MessageStatus,
  OutboxMiddleware,
  IOutboxRepository,
} from '../outbox';
import { MessageProcessorNotFoundError } from './message-processor.errors';

/**
 * Abstract base class for message processor
 * Provides core functionality for processing outbox messages
 */
export abstract class IMessageProcessor {
  /**
   * Process a single message
   * This is the core method that must be implemented
   * @param message Message to process
   */
  abstract processMessage(message: IOutboxMessage): Promise<void>;

  /**
   * Initialize the processor
   * May be overridden for specific initialization logic
   */
  async initialize?(): Promise<void> {
    // Default implementation does nothing
    return;
  }

  /**
   * Process a batch of messages
   * @param batchSize Maximum number of messages to process
   * @returns Number of processed messages
   */
  async processMessages?(_batchSize?: number): Promise<number> {
    // Default implementation returns 0
    return 0;
  }

  /**
   * Start continuous processing
   * @param interval Interval between processing (ms)
   */
  async startProcessing?(interval?: number): Promise<void> {
    // Default implementation does nothing
    return;
  }

  /**
   * Stop continuous processing
   */
  async stopProcessing?(): Promise<void> {
    // Default implementation does nothing
    return;
  }
}

/**
 * Standard implementation of message processor
 * Processes messages from outbox repository using registered handlers
 */
export class StandardMessageProcessor implements IMessageProcessor {
  private readonly handlers: Map<string, IOutboxMessageHandler> = new Map();
  private readonly middlewares: OutboxMiddleware[] = [];
  private isRunning: boolean = false;
  private processingInterval: NodeJS.Timeout | null = null;

  /**
   * Creates a new message processor
   * @param outboxRepository Repository for accessing messages
   * @param defaultBatchSize Default batch size for processing
   */
  constructor(
    private readonly outboxRepository: IOutboxRepository,
    private readonly defaultBatchSize: number = 100,
  ) {}

  /**
   * Registers a handler for a specific message type
   * @param messageType Type of message
   * @param handler Handler for this type
   */
  public registerHandler(
    messageType: string,
    handler: IOutboxMessageHandler,
  ): void {
    this.handlers.set(messageType, handler);
  }

  /**
   * Adds middleware to the processing pipeline
   * @param middleware Middleware function
   */
  public use(middleware: OutboxMiddleware): this {
    this.middlewares.push(middleware);
    return this;
  }

  /**
   * Initializes the processor
   */
  public async initialize(): Promise<void> {
    // Initialization logic if needed
  }

  /**
   * Processes a single message
   * @param message Message to process
   */
  public async processMessage(message: IOutboxMessage): Promise<void> {
    try {
      // Build middleware pipeline
      const handler = this.getHandler(message.messageType);

      if (!handler) {
        throw MessageProcessorNotFoundError.withMessageType(
          message.messageType,
        );
      }

      // Create base handler function
      const baseHandler = async (msg: IOutboxMessage) => {
        await handler.handle(msg);
      };

      // Apply middlewares
      const processWithMiddlewares = this.middlewares.reduceRight(
        (next, middleware) => middleware(next),
        baseHandler,
      );

      // Process with middleware pipeline
      await processWithMiddlewares(message);

      // Update status to processed
      await this.outboxRepository.updateStatus(
        message.id,
        MessageStatus.PROCESSED,
      );
    } catch (error) {
      // Increment attempt count
      await this.outboxRepository.incrementAttempt(message.id);

      // Update status to failed
      await this.outboxRepository.updateStatus(
        message.id,
        MessageStatus.FAILED,
        error as Error,
      );

      // Rethrow the error for upper-level handling
      throw error;
    }
  }

  /**
   * Processes a batch of messages
   * @param batchSize Maximum number of messages to process
   * @returns Number of processed messages
   */
  public async processMessages(
    batchSize: number = this.defaultBatchSize,
  ): Promise<number> {
    // Get unprocessed messages
    const messages =
      await this.outboxRepository.getUnprocessedMessages(batchSize);

    if (!messages.length) {
      return 0;
    }

    let processedCount = 0;

    // Process each message
    for (const message of messages) {
      try {
        // Update status to processing
        await this.outboxRepository.updateStatus(
          message.id,
          MessageStatus.PROCESSING,
        );

        // Process the message
        await this.processMessage(message);

        processedCount++;
      } catch (error) {
        console.error(`Error processing message ${message.id}:`, error);
      }
    }

    return processedCount;
  }

  /**
   * Starts continuous processing
   * @param interval Interval between processing (ms)
   */
  public async startProcessing(interval: number = 5000): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    // Process in a loop
    this.processingInterval = setInterval(async () => {
      try {
        await this.processMessages();
      } catch (error) {
        console.error('Error during message processing:', error);
      }
    }, interval);
  }

  /**
   * Stops continuous processing
   */
  public async stopProcessing(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  /**
   * Gets handler for a specific message type
   * @param messageType Message type
   * @returns Handler for this type or undefined if not found
   */
  private getHandler(messageType: string): IOutboxMessageHandler | undefined {
    return this.handlers.get(messageType);
  }
}
