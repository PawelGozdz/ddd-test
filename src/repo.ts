import { AggregateRoot, BaseRepository, EntityId, IEventDispatcher } from "@app/libs";
import { Injectable } from "@nestjs/common";

@Injectable()
export class TestRepo extends BaseRepository {
  constructor(private readonly dispatcher: IEventDispatcher) {
    super(dispatcher);
  }

  handleTestEvent(event: any): void {
    console.log('Handling test event=====>', event);
  }

  async getCurrentVersion(id: any): Promise<number> {
    return null;
  }
}