import { IProjectionCheckpoint, IProjectionCheckpointStore } from '@/src';
import { Injectable } from '@nestjs/common';

@Injectable()
export class InMemoryCheckpointStore implements IProjectionCheckpointStore {
  private readonly storage = new Map<string, IProjectionCheckpoint>();

  async save<TState>(
    projectionName: string,
    checkpoint: Omit<IProjectionCheckpoint<TState>, 'projectionName'>,
  ): Promise<void> {
    this.storage.set(projectionName, {
      projectionName,
      ...checkpoint,
    });
  }

  async load<TState>(
    projectionName: string,
  ): Promise<IProjectionCheckpoint<TState> | null> {
    return (
      (this.storage.get(projectionName) as IProjectionCheckpoint<TState>) ||
      null
    );
  }

  async delete(projectionName: string): Promise<void> {
    this.storage.delete(projectionName);
  }
}
