// import { IAuditEvent } from './audit';
// import { AuditEventProcessorOptions } from './audit/audit-processor';
// import { IDomainEvent } from './domain';
// import { IEventBus } from './event-bus';
// import { UniversalEventDispatcher } from './event-dispatcher';
// import { EventMiddleware } from './event-dispatcher.interface';
// import {
//   IIntegrationEvent,
//   IntegrationEventTransformerRegistry,
// } from './integration';
// import { IntegrationEventProcessor } from './integration/integration-processor';

// /**
//  * Factory function to create a fully configured universal event dispatcher
//  */
// export function createUniversalEventDispatcher(options: {
//   /** Domain event bus (required) */
//   domainEventBus: IEventBus<IDomainEvent>;

//   /** Integration event bus (optional) */
//   integrationEventBus?: IEventBus<IIntegrationEvent>;

//   /** Audit event bus (optional) */
//   auditEventBus?: IEventBus<IAuditEvent>;

//   /** Event store for event sourcing (optional) */
//   //   eventStore?: IEventStore;

//   /** Integration event transformer registry (required if using integration events) */
//   transformerRegistry?: IntegrationEventTransformerRegistry;

//   /** Audit configuration (optional) */
//   auditOptions?: AuditEventProcessorOptions;

//   /** Middleware to add to the dispatcher (optional) */
//   middlewares?: EventMiddleware[];
// }): UniversalEventDispatcher {
//   // Create dispatcher with domain event bus
//   const dispatcher = new UniversalEventDispatcher({
//     domainEventBus: options.domainEventBus,
//   });

//   // Register additional buses if provided
//   if (options.integrationEventBus) {
//     dispatcher.registerEventBus('integration', options.integrationEventBus);
//   }

//   if (options.auditEventBus) {
//     dispatcher.registerEventBus('audit', options.auditEventBus);
//   }

//   // Add middleware if provided
//   if (options.middlewares) {
//     options.middlewares.forEach((middleware) => dispatcher.use(middleware));
//   }

//   // Register processors
//   if (options.integrationEventBus && options.transformerRegistry) {
//     dispatcher.registerProcessor(
//       new IntegrationEventProcessor(options.transformerRegistry),
//     );
//   }

//   // if (options.auditEventBus) {
//   //   dispatcher.registerProcessor(new AuditEventProcessor());
//   // }

//   //   if (options.eventStore) {
//   //     dispatcher.registerProcessor(
//   //       new EventSourcingProcessor(options.eventStore),
//   //     );
//   //   }

//   return dispatcher;
// }

// /**
//  * Common middleware implementations
//  */

// /**
//  * Middleware for logging events
//  */
// export const loggingMiddleware: EventMiddleware = async (event, next) => {
//   const start = Date.now();

//   try {
//     await next(event);
//     console.log(
//       `Event ${event.eventType} dispatched in ${Date.now() - start}ms`,
//     );
//   } catch (error) {
//     console.error(`Error dispatching event ${event.eventType}:`, error);
//     throw error;
//   }
// };

// /**
//  * Middleware for adding correlation IDs
//  */
// export const correlationMiddleware: EventMiddleware = async (event, next) => {
//   // Ensure event has metadata
//   const metadata = event['metadata'] || {};

//   // Add correlation ID if not present
//   if (!metadata.correlationId) {
//     metadata.correlationId = crypto.randomUUID();
//   }

//   // Update event metadata
//   event['metadata'] = metadata;

//   // Continue to next middleware
//   await next(event);
// };
