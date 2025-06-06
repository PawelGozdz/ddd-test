import { IProjectionStore } from '@/src';
import { Injectable } from '@nestjs/common';

@Injectable()
export class InMemoryProjectionStore<TReadModel>
  implements IProjectionStore<TReadModel>
{
  private readonly storage = new Map<string, TReadModel>();

  async load(projectionName: string): Promise<TReadModel | null> {
    return this.storage.get(projectionName) || null;
  }

  async save(projectionName: string, state: TReadModel): Promise<void> {
    this.storage.set(projectionName, state);
  }

  async delete(projectionName: string): Promise<void> {
    this.storage.delete(projectionName);
  }

  async exists(projectionName: string): Promise<boolean> {
    return this.storage.has(projectionName);
  }
}
