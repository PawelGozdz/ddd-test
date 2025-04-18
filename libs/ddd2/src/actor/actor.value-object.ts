import { InvalidParameterError, BaseValueObject, MissingValueError } from '../core';
import { LibUtils } from '../utils';

import { ActorType } from './actor-type.enum';
import { ActorError } from './actor.error';

export class Actor extends BaseValueObject<{type: ActorType, source: string, id?: string}> {
  readonly type: ActorType;

  readonly source: string;

  readonly id?: string;

  constructor(type: ActorType, source: string, id?: string) {
    super({  source, id, type });
    this.type = type;
    this.source = source;
    this.id = id;
  }

  static create(props: { type: ActorType; source: string; id?: string }): Actor {
    const actor = new Actor(props.type, props.source, props.id);
    if (!actor.validate(props)) {
      throw new InvalidParameterError('Invalid Actor parameters');
    }
    return actor;
  }

  validate(props: { type: ActorType; source: string; id?: string }): boolean {
    const { type, source, id } = props;

    if (LibUtils.isEmpty(type)) {
      throw new MissingValueError('Actor.type');
    }

    if(!Object.values(ActorType).includes(type)) {
      throw ActorError.withType(type);
    }

    if (!source) {
      throw new MissingValueError('Actor.source');
    }

    if (/[^a-zA-Z0-9]/.test(source)) {
      throw ActorError.withMessage('Actor.source must contain only alphanumeric characters');
    }

    if (type === ActorType.SYSTEM) {
      if (id) {
        throw ActorError.withMessage('Actor.id is not allowed for SYSTEM actor');
      }
    } else {
      if (!id) {
        throw new MissingValueError('Actor.id');
      }

      if (!LibUtils.isValidUUID(id)) {
        throw ActorError.withMessage(`Invalid UUID: ${id}`);
      }
    }

    return true;
  }

  getType(): ActorType {
    return this.type;
  }

  getSource(): string {
    return this.source;
  }

  getId(): string | undefined {
    return this.id;
  }
}
