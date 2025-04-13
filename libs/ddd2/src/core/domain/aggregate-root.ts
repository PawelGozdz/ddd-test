import { IExtendedDomainEvent } from '../events';
import { EntityId } from '../value-objects';


/**
 * Interface for snapshotable aggregates
 */
export interface ISnapshotable {
  createSnapshot?(): any;
  restoreFromSnapshot?(snapshot: any): void;
}

/**
 * Interface for aggregate roots
 */
export interface IAggregateRoot<T> {
  /**
   * The version of the aggregate
   */
  getVersion(): number;
  
  /**
   * Initial version of the aggregate when loaded
   */
  getInitialVersion(): number;
    
  /**
   * Check if aggregate has uncommitted changes
   */
  hasChanges(): boolean;
  
  /**
   * Clear all recorded domain events
   */
  commit(): void;

  getId(): EntityId<T>;
}

/**
 * Base class for aggregate roots
 */
export abstract class AggregateRoot<T = string> implements IAggregateRoot<T>, ISnapshotable {
  private _domainEvents: IExtendedDomainEvent[] = [];
  private _version: number = 0;
  private _initialVersion: number = 0;
  private readonly id: EntityId<T>;

  constructor({ id, version = 0 }: { id: EntityId<T>; version?: number }) {
    this.id = id;
    this._version = version;
    this._initialVersion = version;
  }

  /**
   * Returns ID value
   */
  getId() {
    return this.id;
  }

  /**
   * Returns initial version when the aggregate was loaded
   */
  getInitialVersion(): number {
    return this._initialVersion;
  }

  /**
   * Returns current version of the aggregate
   */
  getVersion(): number {
    return this._version;
  }

  /**
   * Checks if aggregate has uncommitted changes
   */
  hasChanges(): boolean {
    return this._domainEvents.length > 0;
  }

  /**
   * Read-only collection of domain events
   */
  getDomainEvents(): ReadonlyArray<IExtendedDomainEvent> {
    return [...this._domainEvents];
  }

  /**
   * Apply a domain event to the aggregate
   */
  protected apply<P = any>(domainEvent: IExtendedDomainEvent<P>): void {
    // Enrich the event with aggregate metadata
    const enrichedEvent = {
      ...domainEvent,
      metadata: {
        ...domainEvent.metadata || {},
        aggregateId: this.id.getValue(),
        aggregateType: this.constructor.name,
        aggregateVersion: this._version + 1
      }
    };
    
    this._domainEvents.push(enrichedEvent);
    this.incrementVersion();
    
    // Handle the event if a matching handler exists
    const handlerMethod = `on${domainEvent.eventType}`;
    if (typeof this[handlerMethod] === 'function') {
      this[handlerMethod](domainEvent.payload);
    }
  }

  /**
   * Clear all domain events from the aggregate
   */
  public commit(): void {
    this._domainEvents = [];
    this._initialVersion = this._version;
  }

  /**
   * Increment the version of the aggregate
   */
  protected incrementVersion(): void {
    this._version++;
  }

  /**
   * Create a snapshot of current aggregate state
   */
  createSnapshot(): any {
    return {
      id: this.id,
      version: this._version,
      state: this.serializeState()
    };
  }
  
  /**
   * Restore aggregate state from a snapshot
   */
  restoreFromSnapshot(snapshot: any): void {
    this._version = snapshot.version;
    this._initialVersion = snapshot.version;
    this.deserializeState(snapshot.state);
  }

  protected serializeState(): any {
    return {
      id: this.id.value,
      version: this._version,
    };  
  }

  protected deserializeState<T>(state: T): void {
  }

  /**
   * Load aggregate state from a series of events
   * Useful for event sourcing implementations
   */
  protected loadFromHistory(events: IExtendedDomainEvent[]): void {
    // Reset current state
    this._version = 0;
    this._domainEvents = [];
    
    // Apply each historical event without adding to uncommitted events
    for (const event of events) {
      const handlerMethod = `on${event.eventType}`;
      if (typeof this[handlerMethod] === 'function') {
        this[handlerMethod](event.payload);
      }
      this._version++;
    }
    
    this._initialVersion = this._version;
  }
  
  /**
   * Check for version conflicts (optimistic concurrency)
   */
  checkVersion(expectedVersion: number): void {
    if (this._initialVersion !== expectedVersion) {
      throw new Error(
        `Version conflict: Aggregate ${this.constructor.name} with ID ${this.id} ` +
        `has version ${this._initialVersion}, but expected ${expectedVersion}`
      );
    }
  }
}
