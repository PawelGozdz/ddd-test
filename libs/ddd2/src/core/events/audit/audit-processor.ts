import { IRepository } from '../../repositories';
import { IExtendedDomainEvent } from '../domain';
import { IEventProcessor } from '../event-processor';
import {
  AuditActionType,
  AuditStatus,
  IAuditEvent,
} from './audit-event.interface';

/**
 * Options for configuring audit event processor
 */
export interface AuditEventProcessorOptions {
  /** Audit all domain events */
  auditAll?: boolean;

  /** Only audit specific event types */
  auditEventTypes?: string[];

  /** Default source identifier */
  source?: string;
}

/**
 * Processor for creating and publishing audit events based on domain events
 */
export class AuditEventProcessor implements IEventProcessor {
  constructor(
    private readonly auditRepository: IRepository<any>,
    private readonly options: AuditEventProcessorOptions = {},
  ) {}

  /**
   * Process a domain event by creating an audit event if applicable
   */
  async process(event: IExtendedDomainEvent): Promise<void> {
    // Check if event should be audited
    if (!this.shouldAudit(event)) return;

    // Create and publish audit event
    const auditEvent = this.createAuditEvent(event);
    await this.auditRepository.save(auditEvent);
  }

  /**
   * Determine if an event should be audited based on configuration
   */
  private shouldAudit(event: IExtendedDomainEvent): boolean {
    if (this.options.auditAll) return true;

    if (
      this.options.auditEventTypes &&
      this.options.auditEventTypes.length > 0
    ) {
      return this.options.auditEventTypes.includes(event.eventType);
    }

    return false;
  }

  /**
   * Create an audit event from a domain event
   */
  private createAuditEvent(domainEvent: IExtendedDomainEvent): IAuditEvent {
    // Determine action type from event name
    let actionType = AuditActionType.OTHER;
    if (domainEvent.eventType.includes('Created'))
      actionType = AuditActionType.CREATE;
    if (domainEvent.eventType.includes('Updated'))
      actionType = AuditActionType.UPDATE;
    if (domainEvent.eventType.includes('Deleted'))
      actionType = AuditActionType.DELETE;

    return {
      eventType: `AUDIT_${domainEvent.eventType}`,
      payload: domainEvent.payload,
      metadata: {
        previousState: domainEvent?.metadata?._previousState,
        correlationId: domainEvent?.metadata?.correlationId,
        timestamp: new Date(),
        actionType,
        status: AuditStatus.SUCCESS,
        source: this.options.source || 'domain_event',
        resourceId: domainEvent.metadata?.aggregateId?.toString(),
        resourceType: domainEvent.metadata?.aggregateType,
        actor: domainEvent.metadata?.actor,
      },
    };
  }

  /**
   * Manually record an audit action
   */
  async recordAction(
    action: AuditActionType | string,
    resourceType: string,
    resourceId: string,
    data?: any,
  ): Promise<void> {
    const auditEvent: IAuditEvent = {
      eventType: `AUDIT_${action}`,
      payload: data,
      metadata: {
        timestamp: new Date(),
        actionType: action,
        status: AuditStatus.SUCCESS,
        source: 'manual',
        resourceId,
        resourceType,
      },
    };

    await this.auditRepository.save(auditEvent);
  }
}
