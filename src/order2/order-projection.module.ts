import { Module } from '@nestjs/common';
import { OrderProjection } from './order.projection';
import { OrderProjectionService } from './order-projection.service';
import { OrderProjectionController } from './order-projection.controller';
import { InMemoryProjectionStore } from './in-memory-projection.store';
import { InMemoryCheckpointStore } from './in-memory-checkpoint.store';
import {
  IEnhancedEventDispatcher,
  InMemoryDomainEventBus,
  ProjectionBuilder,
  ProjectionEngine,
  ProjectionEngineRegistry,
  ProjectionProcessor,
  UniversalEventDispatcher,
} from '@/src';
import { OrderProjectionState } from './order.interfaces';

@Module({
  providers: [
    // Stores
    {
      provide: 'OrderProjectionStore',
      useClass: InMemoryProjectionStore<OrderProjectionState>,
    },
    {
      provide: 'CheckpointStore',
      useClass: InMemoryCheckpointStore,
    },

    {
      provide: 'OrderProjection',
      useClass: OrderProjection,
    },

    {
      provide: IEnhancedEventDispatcher,
      useFactory: (transformerRegistry: ProjectionEngineRegistry) => {
        const dispatcher = new UniversalEventDispatcher()
          // .registerEventBus(
          //   'domain',
          //   new InMemoryDomainEventBus({
          //     enableLogging: true,
          //   }),
          // )
          .registerEventBus(
            'domain',
            new InMemoryDomainEventBus({
              enableLogging: true,
            }),
          )
          .registerProcessor(new ProjectionProcessor(transformerRegistry));
        // .use(loggingMiddleware)
        // .use(correlationMiddleware);

        return dispatcher;
      },
      inject: [ProjectionEngineRegistry],
    },

    // Engine
    {
      provide: 'OrderProjectionEngine',
      useFactory: (
        projection: OrderProjection,
        store: InMemoryProjectionStore<OrderProjectionState>,
        checkpointStore: InMemoryCheckpointStore,
      ) => {
        return ProjectionBuilder.create(projection, store)
          .withCheckpoints(checkpointStore, 50)
          .build();
      },
      inject: ['OrderProjection', 'OrderProjectionStore', 'CheckpointStore'],
    },

    // 4. ⭐ Registry - BRAKUJĄCY PROVIDER
    {
      provide: ProjectionEngineRegistry,
      useFactory: (orderEngine) => {
        const registry = new ProjectionEngineRegistry();
        registry.register(orderEngine);
        return registry;
      },
      inject: ['OrderProjectionEngine'],
    },

    // 5. ⭐ Processor - BRAKUJĄCY PROVIDER
    {
      provide: ProjectionProcessor,
      useFactory: (registry: ProjectionEngineRegistry) => {
        return new ProjectionProcessor(registry);
      },
      inject: [ProjectionEngineRegistry],
    },

    // 6. ⭐ Event Dispatcher - BRAKUJĄCY PROVIDER
    {
      provide: IEnhancedEventDispatcher,
      useFactory: (projectionProcessor: ProjectionProcessor) => {
        const dispatcher = new UniversalEventDispatcher();
        dispatcher.registerProcessor(projectionProcessor);
        return dispatcher;
      },
      inject: [ProjectionProcessor],
    },

    // 7. Service
    {
      provide: OrderProjectionService,
      useFactory: (engine) => new OrderProjectionService(engine),
      inject: ['OrderProjectionEngine'],
    },
  ],
  controllers: [OrderProjectionController],
  exports: [OrderProjectionService],
})
export class OrderProjectionModule {}
