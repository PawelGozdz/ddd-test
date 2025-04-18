import { createDomainEvent, IDomainEvent, IExtendedDomainEvent, IEventMetadata } from '../events';
import { EntityId } from '../value-objects';
import { 
  IAggregateRoot, 
  ISnapshotable, 
  IVersioned,
  IAggregateSnapshot,
  IEventUpcaster,
  IAggregateConstructorParams
} from './aggregate-interfaces';

/**
 * Complete aggregate root implementation with optional capabilities
 * Supports basic aggregate functionality, snapshots, and versioning
 */
export class AggregateRoot<TId = string, TState = any, TMeta = {}> 
  implements IAggregateRoot<TId>, ISnapshotable<TState, TMeta>, IVersioned {
  
  private _domainEvents: IExtendedDomainEvent[] = [];
  private _version: number = 0;
  private _initialVersion: number = 0;
  private readonly _id: EntityId<TId>;
  
  // Feature flags for optional capabilities
  private _features = {
    snapshots: false,
    versioning: false
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
    metadata?: Partial<IEventMetadata>
  ): void {
    // Handle different method signatures
    let domainEvent: IDomainEvent<P>;
    let eventMetadata: Partial<IEventMetadata> = {};

    if (typeof domainEventOrType === 'string') {
      // Signature: apply(eventType, payload, metadata)
      domainEvent = createDomainEvent(
        domainEventOrType, 
        payloadOrMetadata as P, 
        metadata
      );
    } else if (typeof domainEventOrType === 'object' && 'eventType' in domainEventOrType) {
      // Signature: apply(domainEvent, metadata)
      domainEvent = domainEventOrType;
      eventMetadata = (payloadOrMetadata as Partial<IEventMetadata>) || {};
    } else {
      throw new Error('Invalid arguments for apply method');
    }

    // Enrich the event with aggregate metadata
    const enrichedEvent: IExtendedDomainEvent<P> = {
      ...domainEvent,
      metadata: {
        ...domainEvent['metadata'] || {},
        ...eventMetadata,
        aggregateId: this._id.getValue(),
        aggregateType: this.constructor.name,
        aggregateVersion: this._version + 1
      }
    };
    
    this._domainEvents.push(enrichedEvent);
    this._incrementVersion();
    
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
        this[handlerMethod](event.payload, event.metadata);
      }
    }
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
      this._version++;
    }
    
    this._initialVersion = this._version;
  }
  
  /**
   * Checks for version conflicts (optimistic concurrency)
   */
  checkVersion(expectedVersion: number): void {
    if (this._initialVersion !== expectedVersion) {
      throw new Error(
        `Version conflict: Aggregate ${this.constructor.name} with ID ${this._id} ` +
        `has version ${this._initialVersion}, but expected ${expectedVersion}`
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
    
    const lastEvent = this._domainEvents.length > 0 
      ? this._domainEvents[this._domainEvents.length - 1] 
      : null;
      
    const snapshot: IAggregateSnapshot<TState, TMeta> = {
      id: this._id.getValue(),
      version: this._version,
      aggregateType: this.constructor.name,
      state: this.serializeState(),
      timestamp: new Date(),
      lastEventId: lastEvent?.metadata?.eventId
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
      throw new Error(`Invalid snapshot for aggregate ${this.constructor.name}`);
    }

    // Verify identifier
    if (snapshot.id !== this._id.getValue()) {
      throw new Error(
        `ID mismatch: Snapshot is for ID ${snapshot.id}, ` +
        `but aggregate has ID ${this._id.getValue()}`
      );
    }

    // Verify aggregate type
    if (snapshot.aggregateType !== this.constructor.name) {
      throw new Error(
        `Aggregate type mismatch: Snapshot is for type ${snapshot.aggregateType}, ` +
        `but trying to load into ${this.constructor.name}`
      );
    }

    // Restore state
    this.deserializeState(snapshot.state);

    // Restore metadata if the method exists
    if (snapshot.metadata && typeof this.restoreSnapshotMetadata === 'function') {
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
   * Serializes aggregate state for snapshots - must be implemented in derived classes
   * when snapshots are enabled
   */
  serializeState(): TState {
    throw new Error(`Method 'serializeState' must be implemented by ${this.constructor.name} to use snapshots`);
  }
  
  /**
   * Deserializes aggregate state from a snapshot - must be implemented in derived classes
   * when snapshots are enabled
   */
  deserializeState(state: TState): void {
    throw new Error(`Method 'deserializeState' must be implemented by ${this.constructor.name} to use snapshots`);
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
  registerUpcaster(eventType: string, sourceVersion: number, upcaster: IEventUpcaster): this {
    this._requireFeature('versioning');
    
    if (!this._eventUpcasters.has(eventType)) {
      this._eventUpcasters.set(eventType, new Map());
    }
    
    const typeUpcasters = this._eventUpcasters.get(eventType);
    
    // Check if upcaster for this version already exists
    if (typeUpcasters.has(sourceVersion)) {
      throw new Error(`Upcaster for event ${eventType} version ${sourceVersion} already exists`);
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
    metadata: Partial<IEventMetadata> = {}
  ): void {
    this._requireFeature('versioning');
    
    const enhancedMetadata = {
      ...metadata,
      eventVersion: version
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
  private _upcastEvent<P = any>(event: IExtendedDomainEvent<P>): IExtendedDomainEvent<any> {
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
        throw new Error(
          `Missing upcaster for event ${eventType} from version ${currentVersion} to ${currentVersion + 1}`
        );
      }
      
      currentPayload = upcaster.upcast(currentPayload, currentMetadata);
      currentVersion++;
      
      currentMetadata = {
        ...currentMetadata,
        eventVersion: currentVersion
      };
    }
    
    return {
      ...event,
      payload: currentPayload,
      metadata: currentMetadata
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
      throw new Error(`Feature '${feature}' is not enabled on aggregate ${this.constructor.name}`);
    }
  }
  
  /**
   * Ensures a method is implemented
   */
  private _requireMethod(methodName: string): void {
    if (typeof this[methodName] !== 'function' || 
        this[methodName] === AggregateRoot.prototype[methodName]) {
      throw new Error(`Method '${methodName}' must be implemented by ${this.constructor.name}`);
    }
  }
}
