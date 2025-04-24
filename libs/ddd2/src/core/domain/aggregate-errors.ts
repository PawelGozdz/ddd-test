import { 
  DomainError, 
  DomainErrorCode, 
  DomainErrorOptions,
} from '../errors';

/**
 * Unified error class for aggregate-related errors
 */
export class AggregateError extends DomainError {
  /**
   * Error for invalid arguments provided to the aggregate
   */
  static invalidArguments(message: string, data?: DomainErrorOptions): AggregateError {
    const options = {
      code: DomainErrorCode.InvalidParameter,
      data
    };
    return new AggregateError(message, options);
  }

  /**
   * Error for version conflicts in the aggregate
   */
  static versionConflict(
    aggregateType: string, 
    aggregateId: any, 
    currentVersion: number, 
    expectedVersion: number
  ): AggregateError {
    const message = `Version conflict: Aggregate ${aggregateType} with ID ${aggregateId} has version ${currentVersion}, but expected ${expectedVersion}`;
    const options = {
      code: DomainErrorCode.ValidationFailed,
      data: {
        aggregateType,
        aggregateId,
        currentVersion,
        expectedVersion
      }
    };
    return new AggregateError(message, options);
  }

  /**
   * Error for when a required feature is not enabled
   */
  static featureNotEnabled(feature: string, aggregateType: string): AggregateError {
    const message = `Feature '${feature}' is not enabled on aggregate ${aggregateType}`;
    const options = {
      code: DomainErrorCode.ValidationFailed,
      data: {
        feature,
        aggregateType
      }
    };
    return new AggregateError(message, options);
  }

  /**
   * Error for when a required method is not implemented
   */
  static methodNotImplemented(methodName: string, aggregateType: string): AggregateError {
    const message = `Method '${methodName}' must be implemented by ${aggregateType} to use this feature`;
    const options = {
      code: DomainErrorCode.MissingValue,
      data: {
        methodName,
        aggregateType
      }
    };
    return new AggregateError(message, options);
  }

  /**
   * Error for invalid snapshot
   */
  static invalidSnapshot(aggregateType: string, reason?: string): AggregateError {
    const message = `Invalid snapshot for aggregate ${aggregateType}${reason ? `: ${reason}` : ''}`;
    const options = {
      code: DomainErrorCode.InvalidFormat,
      data: {
        aggregateType,
        reason
      }
    };
    return new AggregateError(message, options);
  }

  /**
   * Error for ID mismatch during snapshot restoration
   */
  static idMismatch(snapshotId: any, aggregateId: any): AggregateError {
    const message = `ID mismatch: Snapshot is for ID ${snapshotId}, but aggregate has ID ${aggregateId}`;
    const options = {
      code: DomainErrorCode.ValidationFailed,
      data: {
        snapshotId,
        aggregateId
      }
    };
    return new AggregateError(message, options);
  }

  /**
   * Error for type mismatch during snapshot restoration
   */
  static typeMismatch(snapshotType: string, aggregateType: string): AggregateError {
    const message = `Aggregate type mismatch: Snapshot is for type ${snapshotType}, but trying to load into ${aggregateType}`;
    const options = {
      code: DomainErrorCode.ValidationFailed,
      data: {
        snapshotType,
        aggregateType
      }
    };
    return new AggregateError(message, options);
  }

  /**
   * Error for duplicate upcaster registration
   */
  static duplicateUpcaster(eventType: string, sourceVersion: number): AggregateError {
    const message = `Upcaster for event ${eventType} version ${sourceVersion} already exists`;
    const options = {
      code: DomainErrorCode.DuplicateEntry,
      data: {
        eventType,
        sourceVersion
      }
    };
    return new AggregateError(message, options);
  }

  /**
   * Error for missing upcaster
   */
  static missingUpcaster(eventType: string, fromVersion: number, toVersion: number): AggregateError {
    const message = `Missing upcaster for event ${eventType} from version ${fromVersion} to ${toVersion}`;
    const options = {
      code: DomainErrorCode.MissingValue,
      data: {
        eventType,
        fromVersion,
        toVersion
      }
    };
    return new AggregateError(message, options);
  }
}
