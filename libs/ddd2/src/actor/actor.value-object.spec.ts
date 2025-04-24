import { describe, it, expect } from 'vitest';

import { Actor } from './actor.value-object';
import { ActorType } from './actor-type.enum';
import { MissingValueError } from '../core';
import { ActorError } from './actor.error';
import { safeRun } from '../utils';

describe('Actor', () => {
  describe('create', () => {
    it('should throw MissingValueError if type is missing', () => {
      // Act
      const [error] = safeRun(() => Actor.create({
        source: 'Source',
        type: undefined as unknown as ActorType,
      }));

      // Assert
      expect(error).toBeInstanceOf(MissingValueError);
    });

    it('should throw ActorError if type is invalid', () => {
      // Act
      const [error] = safeRun(() => Actor.create({
        source: 'Source',
        type: 'INVALID_TUPE' as unknown as ActorType,
      }));

      // Assert
      expect(error).toBeInstanceOf(ActorError);
    });

    it('should throw ActorError if source contains non-alphanumeric characters', () => {
      // Act
      const [error] = safeRun(() => Actor.create({
        source: 'Source!@#',
        type: ActorType.USER,
      }));

      // Assert
      expect(error).toBeInstanceOf(ActorError);
      expect(error.message).toBe('Actor.source must contain only alphanumeric characters');
    });

    it('should throw ActorError if SYSTEM actor has an id', () => {
      // Act
      const [error] = safeRun(() => Actor.create({
        source: 'Source',
        type: ActorType.SYSTEM,
        id: '123e4567-e89b-12d3-a456-426614174000',
      }));

      // Assert
      expect(error).toBeInstanceOf(ActorError);
      expect(error.message).toBe('Actor.id is not allowed for SYSTEM actor');
    });

    it('should throw MissingValueError if non-SYSTEM actor does not have an id', () => {
      // Act
      const [error] = safeRun(() => Actor.create({
        source: 'Source',
        type: ActorType.USER,
      }));

      // Assert
      expect(error).toBeInstanceOf(MissingValueError);
    });

    it('should throw ActorError if non-SYSTEM actor has an invalid id', () => {
      // Act
      const [error] = safeRun(() => Actor.create({
        source: 'Source',
        type: ActorType.USER,
        id: 'invalid-uuid',
      }));

      // Assert
      expect(error).toBeInstanceOf(ActorError);
      expect(error.message).toBe('Invalid UUID: invalid-uuid');
    });

    it('should create SYSTEM actor successfully without an id', () => {
      // Act
      const actor = Actor.create({
        source: 'Source',
        type: ActorType.SYSTEM,
      })

      // Assert
      expect(actor).toBeInstanceOf(Actor);
      expect(actor.type).toBe(ActorType.SYSTEM);
      expect(actor.source).toBe('Source');
      expect(actor.id).toBeUndefined();
    });

    it('should create non-SYSTEM actor successfully with a valid id', () => {
      // Act
      const validUUID = '123e4567-e89b-12d3-a456-426614174000';
      const actor = Actor.create({
        source: 'Source',
        type: ActorType.USER,
        id: validUUID,
      })

      // Assert
      expect(actor).toBeInstanceOf(Actor);
      expect(actor.type).toBe(ActorType.USER);
      expect(actor.source).toBe('Source');
      expect(actor.id).toBe(validUUID);
    });
  });
});
