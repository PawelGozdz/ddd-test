import {
  createDomainEvent,
  IDomainEvent,
  IExtendedDomainEvent,
  IEventMetadata,
} from '../events';
import { IAuditable } from '../events/audit';
import { EntityId } from '../value-objects';
import { AggregateError } from './aggregate-errors';
import {
  IAggregateRoot,
  ISnapshotable,
  IVersioned,
  IAggregateSnapshot,
  IEventUpcaster,
  IAggregateConstructorParams,
} from './aggregate-interfaces';

/**
 * Complete aggregate root implementation with optional capabilities
 * Supports basic aggregate functionality, snapshots, and versioning
 */
export class AggregateRoot<TId = string, TState = any, TMeta = object>
  implements
    IAggregateRoot<TId>,
    ISnapshotable<TState, TMeta>,
    IVersioned,
    IAuditable
{
  private _domainEvents: IExtendedDomainEvent[] = [];
  private _version: number = 0;
  private _initialVersion: number = 0;
  private readonly _id: EntityId<TId>;
  private _snapshot: any = null;

  // Feature flags for optional capabilities
  private _features = {
    snapshots: false,
    versioning: false,
  };

  // Storage for event upcasters (used when versioning is enabled)
  private _eventUpcasters?: Map<string, Map<number, IEventUpcaster>>;

  /**
   * Creates a new aggregate root instance
   * @param params Construction parameters including ID and optional version
   */
  constructor({ id, version = 0 }: IAggregateConstructorParams<TId>) {
    this._id = id;
    this._version = version;
    this._initialVersion = version;
  }

  // ==========================================
  // CORE AGGREGATE FUNCTIONALITY
  // ==========================================

  /**
   * Returns the aggregate ID value
   */
  getId(): EntityId<TId> {
    return this._id;
  }

  /**
   * Returns the initial version when the aggregate was loaded
   */
  getInitialVersion(): number {
    return this._initialVersion;
  }

  /**
   * Returns the current version of the aggregate
   */
  getVersion(): number {
    return this._version;
  }

  /**
   * Checks if the aggregate has uncommitted changes
   */
  hasChanges(): boolean {
    return this._domainEvents.length > 0;
  }

  /**
   * Returns a read-only collection of domain events
   */
  getDomainEvents(): ReadonlyArray<IExtendedDomainEvent> {
    return [...this._domainEvents];
  }

  /**
   * Applies a domain event to the aggregate
   * Supports multiple method signatures for flexibility:
   * - apply(eventType, payload, metadata)
   * - apply(domainEvent, metadata)
   */
  protected apply<P = any>(
    domainEventOrType: IDomainEvent<P> | string,
    payloadOrMetadata?: P | Partial<IEventMetadata>,
    metadata?: Partial<IEventMetadata>,
  ): void {
    // Handle different method signatures
    let domainEvent: IDomainEvent<P>;
    let eventMetadata: Partial<IEventMetadata> = {};

    if (typeof domainEventOrType === 'string') {
      // Signature: apply(eventType, payload, metadata)
      domainEvent = createDomainEvent(
        domainEventOrType,
        payloadOrMetadata as P,
        metadata,
      );
    } else if (
      typeof domainEventOrType === 'object' &&
      'eventType' in domainEventOrType
    ) {
      // Signature: apply(domainEvent, metadata)
      domainEvent = domainEventOrType;
      eventMetadata = (payloadOrMetadata as Partial<IEventMetadata>) || {};
    } else {
      throw AggregateError.invalidArguments(
        'Invalid arguments for apply method',
      );
    }
    this._incrementVersion();

    if (this._snapshot) {
      eventMetadata._previousState = this._snapshot;
      this._snapshot = null;
    }

    // Enrich the event with aggregate metadata
    const enrichedEvent: IExtendedDomainEvent<P> = {
      ...domainEvent,
      metadata: {
        ...(domainEvent['metadata'] || {}),
        ...eventMetadata,
        aggregateId: this._id.getValue(),
        aggregateType: this.constructor.name,
        aggregateVersion: this._version,
      },
    };

    this._domainEvents.push(enrichedEvent);

    // Handle the event - potentially using versioning if enabled
    this._handleEvent(enrichedEvent);
  }

  /**
   * Handles a domain event - internal implementation
   */
  private _handleEvent<P = any>(event: IExtendedDomainEvent<P>): void {
    if (this._features.versioning) {
      // Use versioning logic if enabled
      this._handleVersionedEvent(event);
    } else {
      // Default behavior
      const handlerMethod = `on${event.eventType}`;
      if (typeof this[handlerMethod] === 'function') {
        console.log(this[handlerMethod]);
        this[handlerMethod](event.payload, event.metadata);
      }
    }
  }

  saveSnapshot(): void {
    this._snapshot = this.serializeState();
  }

  /**
   * Gets previous state and clears the snapshot
   */
  getPreviousState(): any | null {
    const snapshot = this._snapshot;
    this._snapshot = null;
    return snapshot;
  }

  /**
   * Clears all domain events from the aggregate
   */
  public commit(): void {
    this._domainEvents = [];
    this._initialVersion = this._version;
  }

  /**
   * Increments the version of the aggregate
   */
  private _incrementVersion(): void {
    this._version++;
  }

  /**
   * Loads aggregate state from a series of events
   * Useful for event sourcing implementations
   */
  protected loadFromHistory(events: IExtendedDomainEvent[]): void {
    // Reset current state
    this._version = 0;
    this._domainEvents = [];

    // Apply each historical event
    for (const event of events) {
      this._handleEvent(event);
      this._incrementVersion();
    }

    this._initialVersion = this._version;
  }

  /**
   * Checks for version conflicts (optimistic concurrency)
   */
  checkVersion(expectedVersion: number): void {
    if (this._initialVersion !== expectedVersion) {
      throw AggregateError.versionConflict(
        this.constructor.name,
        this._id.getValue(),
        this._initialVersion,
        expectedVersion,
      );
    }
  }

  // ==========================================
  // SNAPSHOT FUNCTIONALITY
  // ==========================================

  /**
   * Checks if snapshots are enabled for this aggregate
   */
  isSnapshotEnabled(): boolean {
    return this._features.snapshots;
  }

  /**
   * Enables snapshot capability for this aggregate
   */
  enableSnapshots(): this {
    this._features.snapshots = true;
    return this;
  }

  /**
   * Creates a snapshot of the current aggregate state
   * @throws Error if snapshots are not enabled or required methods are not implemented
   */
  createSnapshot(): IAggregateSnapshot<TState, TMeta> {
    this._requireFeature('snapshots');
    this._requireMethod('serializeState');

    const lastEvent =
      this._domainEvents.length > 0
        ? this._domainEvents[this._domainEvents.length - 1]
        : null;

    const snapshot: IAggregateSnapshot<TState, TMeta> = {
      id: this._id.getValue(),
      version: this._version,
      aggregateType: this.constructor.name,
      state: this.serializeState(),
      timestamp: new Date(),
      lastEventId: lastEvent?.metadata?.eventId,
    };

    // Add metadata if the method exists
    if (typeof this.createSnapshotMetadata === 'function') {
      snapshot.metadata = this.createSnapshotMetadata();
    }

    return snapshot;
  }

  /**
   * Restores aggregate state from a snapshot
   * @throws Error if snapshots are not enabled or required methods are not implemented
   */
  restoreFromSnapshot(snapshot: IAggregateSnapshot<TState, TMeta>): void {
    this._requireFeature('snapshots');
    this._requireMethod('deserializeState');

    if (!snapshot || !snapshot.state) {
      throw AggregateError.invalidSnapshot(this.constructor.name);
    }

    // Verify identifier
    if (snapshot.id !== this._id.getValue()) {
      throw AggregateError.idMismatch(snapshot.id, this._id.getValue());
    }

    // Verify aggregate type
    if (snapshot.aggregateType !== this.constructor.name) {
      throw AggregateError.typeMismatch(
        snapshot.aggregateType,
        this.constructor.name,
      );
    }

    // Restore state
    this.deserializeState(snapshot.state);

    // Restore metadata if the method exists
    if (
      snapshot.metadata &&
      typeof this.restoreSnapshotMetadata === 'function'
    ) {
      this.restoreSnapshotMetadata(snapshot.metadata);
    }

    // Reset internal state
    this._version = snapshot.version;
    this._initialVersion = snapshot.version;
    this._domainEvents = [];
  }

  /**
   * Creates metadata for the snapshot - to be overridden by derived classes
   */
  protected createSnapshotMetadata?(): TMeta;

  /**
   * Restores metadata from the snapshot - to be overridden by derived classes
   */
  protected restoreSnapshotMetadata?(metadata: TMeta): void;

  /**
   * Serializes aggregate state for snapshots
   * Fixed return type implementation
   */
  serializeState(): TState {
    // Create a deep clone
    const clone = structuredClone(this) as any;

    // Remove internal properties that shouldn't be part of the snapshot
    delete clone._domainEvents;
    delete clone._snapshot;
    delete clone._features;
    delete clone._eventUpcasters;

    return clone as TState;
  }

  /**
   * Deserializes aggregate state from a snapshot - must be implemented in derived classes
   * when snapshots are enabled
   */
  deserializeState(state: TState): void {
    throw AggregateError.methodNotImplemented(
      'deserializeState',
      this.constructor.name,
    );
  }

  // ==========================================
  // VERSIONING FUNCTIONALITY
  // ==========================================

  /**
   * Checks if versioning is enabled for this aggregate
   */
  isVersioningEnabled(): boolean {
    return this._features.versioning;
  }

  /**
   * Enables versioning capability for this aggregate
   */
  enableVersioning(): this {
    this._features.versioning = true;
    this._eventUpcasters = new Map();
    return this;
  }

  /**
   * Registers an upcaster for a specific event type and version
   * @throws Error if versioning is not enabled
   */
  registerUpcaster(
    eventType: string,
    sourceVersion: number,
    upcaster: IEventUpcaster,
  ): this {
    this._requireFeature('versioning');

    if (!this._eventUpcasters.has(eventType)) {
      this._eventUpcasters.set(eventType, new Map());
    }

    const typeUpcasters = this._eventUpcasters.get(eventType);

    // Check if upcaster for this version already exists
    if (typeUpcasters.has(sourceVersion)) {
      throw AggregateError.duplicateUpcaster(eventType, sourceVersion);
    }

    typeUpcasters.set(sourceVersion, upcaster);
    return this;
  }

  /**
   * Applies a domain event with a specific version
   * @throws Error if versioning is not enabled
   */
  applyWithVersion<P = any>(
    domainEvent: IDomainEvent<P>,
    version: number,
    metadata: Partial<IEventMetadata> = {},
  ): void {
    this._requireFeature('versioning');

    const enhancedMetadata = {
      ...metadata,
      eventVersion: version,
    };

    this.apply(domainEvent, enhancedMetadata);
  }

  /**
   * Handles a versioned event
   */
  private _handleVersionedEvent<P = any>(event: IExtendedDomainEvent<P>): void {
    // Upcast the event if needed
    const upcastedEvent = this._upcastEvent(event);

    // Try version-specific handler first
    const eventType = upcastedEvent.eventType;
    const version = upcastedEvent.metadata?.eventVersion;

    if (version) {
      const versionedHandler = `on${eventType}_v${version}`;
      if (typeof this[versionedHandler] === 'function') {
        this[versionedHandler](upcastedEvent.payload, upcastedEvent.metadata);
        return;
      }
    }

    // Fall back to default handler
    const defaultHandler = `on${eventType}`;
    if (typeof this[defaultHandler] === 'function') {
      this[defaultHandler](upcastedEvent.payload, upcastedEvent.metadata);
    }
  }

  /**
   * Upcasts an event to the latest version
   */
  private _upcastEvent<P = any>(
    event: IExtendedDomainEvent<P>,
  ): IExtendedDomainEvent<any> {
    if (!this._eventUpcasters) {
      return event;
    }

    const eventType = event.eventType;
    const typeUpcasters = this._eventUpcasters.get(eventType);

    if (!typeUpcasters || typeUpcasters.size === 0) {
      return event;
    }

    // Determine event version
    const sourceVersion = event.metadata?.eventVersion || 1;
    const latestVersion = this._getLatestEventVersion(eventType);

    if (sourceVersion >= latestVersion) {
      return event;
    }

    // Perform sequential upcasting
    let currentPayload = event.payload;
    let currentMetadata = { ...(event.metadata || {}) };
    let currentVersion = sourceVersion;

    while (currentVersion < latestVersion) {
      const upcaster = typeUpcasters.get(currentVersion);

      if (!upcaster) {
        throw AggregateError.missingUpcaster(
          eventType,
          currentVersion,
          currentVersion + 1,
        );
      }

      currentPayload = upcaster.upcast(currentPayload, currentMetadata);
      currentVersion++;

      currentMetadata = {
        ...currentMetadata,
        eventVersion: currentVersion,
      };
    }

    return {
      ...event,
      payload: currentPayload,
      metadata: currentMetadata,
    };
  }

  /**
   * Gets the latest version for a specific event type
   */
  private _getLatestEventVersion(eventType: string): number {
    if (!this._eventUpcasters) {
      return 1;
    }

    const typeUpcasters = this._eventUpcasters.get(eventType);

    if (!typeUpcasters || typeUpcasters.size === 0) {
      return 1;
    }

    return Math.max(...Array.from(typeUpcasters.keys())) + 1;
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  /**
   * Ensures a feature is enabled
   */
  private _requireFeature(feature: keyof typeof this._features): void {
    if (!this._features[feature]) {
      throw AggregateError.featureNotEnabled(feature, this.constructor.name);
    }
  }

  /**
   * Ensures a method is implemented
   */
  private _requireMethod(methodName: string): void {
    if (
      typeof this[methodName] !== 'function' ||
      this[methodName] === AggregateRoot.prototype[methodName]
    ) {
      throw AggregateError.methodNotImplemented(
        methodName,
        this.constructor.name,
      );
    }
  }
}
