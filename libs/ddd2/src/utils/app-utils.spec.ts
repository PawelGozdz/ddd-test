import { describe, it, expect } from 'vitest';

import { LibUtils } from './lib-utils';

describe('LibUtils', () => {
  describe('isTruthy', () => {
    it('should return true for truthy values', () => {
      expect(LibUtils.isTruthy(true)).toBe(true);
      expect(LibUtils.isTruthy(1)).toBe(true);
      expect(LibUtils.isTruthy('hello')).toBe(true);
      expect(LibUtils.isTruthy([1, 2, 3])).toBe(true);
      expect(LibUtils.isTruthy({ a: 1 })).toBe(true);
      expect(LibUtils.isTruthy(new Map().set('a', 1))).toBe(true);
      expect(LibUtils.isTruthy(new Set().add('a'))).toBe(true);
    });

    it('should return false for falsy values', () => {
      expect(LibUtils.isTruthy(false)).toBe(false);
      expect(LibUtils.isTruthy(0)).toBe(false);
      expect(LibUtils.isTruthy('')).toBe(false);
      expect(LibUtils.isTruthy([])).toBe(false);
      expect(LibUtils.isTruthy({})).toBe(false);
      expect(LibUtils.isTruthy(new Map())).toBe(false);
      expect(LibUtils.isTruthy(new Set())).toBe(false);
    });
  });

  describe('isFalsy', () => {
    it('should return false for truthy values', () => {
      expect(LibUtils.isFalsy(true)).toBe(false);
      expect(LibUtils.isFalsy(1)).toBe(false);
      expect(LibUtils.isFalsy('hello')).toBe(false);
      expect(LibUtils.isFalsy([1, 2, 3])).toBe(false);
      expect(LibUtils.isFalsy({ a: 1 })).toBe(false);
      expect(LibUtils.isFalsy(new Map().set('a', 1))).toBe(false);
      expect(LibUtils.isFalsy(new Set().add('a'))).toBe(false);
    });

    it('should return true for falsy values', () => {
      expect(LibUtils.isFalsy(false)).toBe(true);
      expect(LibUtils.isFalsy(0)).toBe(true);
      expect(LibUtils.isFalsy('')).toBe(true);
      expect(LibUtils.isFalsy([])).toBe(true);
      expect(LibUtils.isFalsy({})).toBe(true);
      expect(LibUtils.isFalsy(new Map())).toBe(true);
      expect(LibUtils.isFalsy(new Set())).toBe(true);
    });
  });

  describe('isEmpty', () => {
    it('should return true for empty values', () => {
      expect(LibUtils.isEmpty(false)).toBe(true);
      expect(LibUtils.isEmpty(0)).toBe(true);
      expect(LibUtils.isEmpty('')).toBe(true);
      expect(LibUtils.isEmpty([])).toBe(true);
      expect(LibUtils.isEmpty({})).toBe(true);
      expect(LibUtils.isEmpty(new Map())).toBe(true);
      expect(LibUtils.isEmpty(new Set())).toBe(true);
      expect(LibUtils.isEmpty(null)).toBe(true);
      expect(LibUtils.isEmpty(undefined)).toBe(true);
    });

    it('should return false for non-empty values', () => {
      expect(LibUtils.isEmpty(true)).toBe(false);
      expect(LibUtils.isEmpty(1)).toBe(false);
      expect(LibUtils.isEmpty('hello')).toBe(false);
      expect(LibUtils.isEmpty([1, 2, 3])).toBe(false);
      expect(LibUtils.isEmpty({ a: 1 })).toBe(false);
      expect(LibUtils.isEmpty(new Map().set('a', 1))).toBe(false);
      expect(LibUtils.isEmpty(new Set().add('a'))).toBe(false);
    });
  });

  describe('hasValue', () => {
    it('should return true for non-empty values', () => {
      expect(LibUtils.hasValue(true)).toBe(true);
      expect(LibUtils.hasValue(1)).toBe(true);
      expect(LibUtils.hasValue('hello')).toBe(true);
      expect(LibUtils.hasValue([1, 2, 3])).toBe(true);
      expect(LibUtils.hasValue({ a: 1 })).toBe(true);
      expect(LibUtils.hasValue(new Map().set('a', 1))).toBe(true);
      expect(LibUtils.hasValue(new Set().add('a'))).toBe(true);
    });

    it('should return false for empty values', () => {
      expect(LibUtils.hasValue(false)).toBe(false);
      expect(LibUtils.hasValue(0)).toBe(false);
      expect(LibUtils.hasValue('')).toBe(false);
      expect(LibUtils.hasValue([])).toBe(false);
      expect(LibUtils.hasValue({})).toBe(false);
      expect(LibUtils.hasValue(new Map())).toBe(false);
      expect(LibUtils.hasValue(new Set())).toBe(false);
      expect(LibUtils.hasValue(null)).toBe(false);
      expect(LibUtils.hasValue(undefined)).toBe(false);
    });
  });
});
