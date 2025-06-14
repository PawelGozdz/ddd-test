import { IDomainError } from '../core';

export class ACLError extends IDomainError {
  constructor(
    message: string,
    public readonly contextName: string,
    public readonly operation?: string,
    error?: Error,
  ) {
    super(message, { contextName, operation, error });
  }

  static translationFailed(
    contextName: string,
    direction: 'TO_EXTERNAL' | 'FROM_EXTERNAL',
    error: Error,
  ): ACLError {
    return new ACLError(
      `Translation failed (${direction}): ${error.message}`,
      contextName,
      'TRANSLATION',
      error,
    );
  }

  static operationFailed(
    contextName: string,
    operation: string,
    error: Error,
  ): ACLError {
    return new ACLError(
      `Operation '${operation}' failed: ${error.message}`,
      contextName,
      operation,
      error,
    );
  }

  static unsupportedOperation(
    contextName: string,
    operation: string,
  ): ACLError {
    return new ACLError(
      `Operation '${operation}' is not supported`,
      contextName,
      operation,
    );
  }

  static externalSystemUnavailable(
    contextName: string,
    systemName: string,
  ): ACLError {
    return new ACLError(
      `External system '${systemName}' is unavailable`,
      contextName,
      'HEALTH_CHECK',
    );
  }
}

export class TranslationError extends ACLError {
  constructor(
    message: string,
    contextName: string,
    public readonly sourceModel: unknown,
    public readonly direction: 'TO_EXTERNAL' | 'FROM_EXTERNAL',
    error?: Error,
  ) {
    super(message, contextName, 'TRANSLATION', error);
  }

  static forToExternal(
    message: string,
    contextName: string,
    sourceModel: unknown,
    error?: Error,
  ): TranslationError {
    return new TranslationError(
      message,
      contextName,
      sourceModel,
      'TO_EXTERNAL',
      error,
    );
  }

  static forFromExternal(
    message: string,
    contextName: string,
    sourceModel: unknown,
    error?: Error,
  ): TranslationError {
    return new TranslationError(
      message,
      contextName,
      sourceModel,
      'FROM_EXTERNAL',
      error,
    );
  }
}
