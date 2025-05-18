import { EntityId, LibUtils } from '@/src';

export class OrderId extends EntityId<string> {
  constructor(id?: string) {
    super(id || LibUtils.getUUID(), 'uuid');
  }

  validate() {
    return true;
  }
}
