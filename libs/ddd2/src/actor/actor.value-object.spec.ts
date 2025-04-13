import { describe, it, expect } from 'vitest';

import { ActorError, ActorType, MissingValueError } from '@libs/common';

import { Actor } from './actor.value-object';

describe('Actor', () => {
  describe('create', () => {
    it('should throw MissingValueError if type is missing', () => {
      expect(() =>
        Actor.create({
          source: 'Source',
          type: undefined as unknown as ActorType,
        }),
      ).toThrow(MissingValueError);
    });

    it('should throw ActorError if type is invalid', () => {
      expect(() =>
        Actor.create({
          source: 'Source',
          type: 'INVALID_TUPE' as unknown as ActorType,
        }),
      ).toThrow(ActorError);
    });

    // it('should throw MissingValueError if source is missing', () => {
    //   expect(() => Actor.create(ActorType.USER, undefined as unknown as string)).toThrow(MissingValueError);
    // });

    // it('should throw ActorError if source contains non-alphanumeric characters', () => {
    //   expect(() => Actor.create(ActorType.USER, 'Source!@#')).toThrow(ActorError);
    // });

    // it('should throw ActorError if SYSTEM actor has an id', () => {
    //   expect(() => Actor.create(ActorType.SYSTEM, 'Source', 'some-id')).toThrow(ActorError);
    // });

    // it('should throw MissingValueError if non-SYSTEM actor does not have an id', () => {
    //   expect(() => Actor.create(ActorType.USER, 'Source')).toThrow(MissingValueError);
    // });

    // it('should throw ActorError if non-SYSTEM actor has an invalid id', () => {
    //   expect(() => Actor.create(ActorType.USER, 'Source', 'invalid-uuid')).toThrow(ActorError);
    // });

    // it('should create SYSTEM actor successfully without an id', () => {
    //   const actor = Actor.create(ActorType.SYSTEM, 'Source');
    //   expect(actor).toBeInstanceOf(Actor);
    //   expect(actor.type).toBe(ActorType.SYSTEM);
    //   expect(actor.source).toBe('Source');
    //   expect(actor.id).toBeUndefined();
    // });

    // it('should create non-SYSTEM actor successfully with a valid id', () => {
    //   const validUUID = '123e4567-e89b-12d3-a456-426614174000';
    //   const actor = Actor.create(ActorType.USER, 'Source', validUUID);
    //   expect(actor).toBeInstanceOf(Actor);
    //   expect(actor.type).toBe(ActorType.USER);
    //   expect(actor.source).toBe('Source');
    //   expect(actor.id).toBe(validUUID);
    // });
  });
});
