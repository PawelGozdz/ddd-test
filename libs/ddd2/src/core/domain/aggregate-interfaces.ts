import {
  IExtendedDomainEvent,
  IEventMetadata,
  IDomainEvent,
} from '../events/domain-event-interfaces';
import { EntityId } from '../value-objects';

/**
 * Base interface for all aggregate roots
 */
export interface IAggregateRoot<TId = string> {
  /**
   * Returns the current version of the aggregate
   */
  getVersion(): number;

  /**
   * Returns the initial version of the aggregate when it was loaded
   */
  getInitialVersion(): number;

  /**
   * Checks if the aggregate has uncommitted changes
   */
  hasChanges(): boolean;

  /**
   * Clears all uncommitted domain events
   */
  commit(): void;

  /**
   * Returns the aggregate identifier
   */
  getId(): EntityId<TId>;

  /**
   * Returns uncommitted domain events
   */
  getDomainEvents(): ReadonlyArray<IExtendedDomainEvent>;
}

/**
 * Type for aggregate constructor parameters
 */
export interface IAggregateConstructorParams<TId> {
  id: EntityId<TId>;
  version?: number;
}

/**
 * Interface for snapshot functionality
 */
export interface ISnapshotable<TState = any, TMeta = object> {
  /**
   * Checks if snapshots are enabled for this aggregate
   */
  isSnapshotEnabled(): boolean;

  /**
   * Enables snapshot capability for this aggregate
   */
  enableSnapshots(): this;

  /**
   * Creates a snapshot of the current aggregate state
   * @throws Error if snapshots are not enabled
   */
  createSnapshot(): IAggregateSnapshot<TState, TMeta>;

  /**
   * Restores aggregate state from a snapshot
   * @throws Error if snapshots are not enabled
   */
  restoreFromSnapshot(snapshot: IAggregateSnapshot<TState, TMeta>): void;

  /**
   * Serializes aggregate state for snapshots
   * Must be implemented when snapshots are enabled
   */
  serializeState?(): TState;

  /**
   * Deserializes aggregate state from a snapshot
   * Must be implemented when snapshots are enabled
   */
  deserializeState?(state: TState): void;
}

/**
 * Represents an aggregate snapshot
 */
export interface IAggregateSnapshot<TState = any, TMeta = object> {
  /** Aggregate identifier */
  id: any;

  /** Aggregate version */
  version: number;

  /** Aggregate type */
  aggregateType: string;

  /** Aggregate state */
  state: TState;

  /** When the snapshot was created */
  timestamp: Date;

  /** Snapshot metadata (optional) */
  metadata?: TMeta;

  /** ID of the last event included in the snapshot (optional) */
  lastEventId?: string;
}

/**
 * Interface for event versioning functionality
 */
export interface IVersioned {
  /**
   * Checks if versioning is enabled for this aggregate
   */
  isVersioningEnabled(): boolean;

  /**
   * Enables versioning capability for this aggregate
   */
  enableVersioning(): this;

  /**
   * Registers an upcaster for a specific event type and version
   * @throws Error if versioning is not enabled
   */
  registerUpcaster(
    eventType: string,
    sourceVersion: number,
    upcaster: IEventUpcaster,
  ): this;

  /**
   * Applies a domain event with a specific version
   * @throws Error if versioning is not enabled
   */
  applyWithVersion<P = any>(
    domainEvent: IDomainEvent<P>,
    version: number,
    metadata?: Partial<IEventMetadata>,
  ): void;
}

/**
 * Interface for event upcaster
 */
export interface IEventUpcaster<TInput = any, TOutput = any> {
  /**
   * Transforms an event payload from one version to another
   */
  upcast(payload: TInput, metadata: IEventMetadata): TOutput;
}
