/* eslint-disable no-promise-executor-return */
import { v4 as uuidV4, validate } from 'uuid';

type UUID = 'v4';

export class LibUtils {
  static getUUID(type?: UUID) {
    if (type === 'v4') {
      return uuidV4();
    }

    return uuidV4();
  }

  static isEmpty(input: unknown): boolean {
    return !this.isTruthy(input);
  }

  static hasValue(input: unknown): boolean {
    return this.isTruthy(input);
  }

  static isNotEmpty(input: unknown): boolean {
    return this.isTruthy(input);
  }

  static isTruthy(input: unknown): boolean {
    if (typeof input === 'boolean') {
      return input;
    }
    if (typeof input === 'number') {
      return input !== 0 && !Number.isNaN(input);
    }
    if (typeof input === 'string') {
      return input.length > 0;
    }
    if (input === null || input === undefined) {
      return false;
    }

    if (input instanceof Map) {
      return input.size > 0;
    }
    if (input instanceof Set) {
      return input.size > 0;
    }

    if (typeof input === 'object') {
      if (Array.isArray(input)) {
        return input.length > 0;
      }
      if (input instanceof Date) {
        return !Number.isNaN(input.getTime());
      }
      return Object.keys(input).length > 0;
    }

    return false;
  }

  static isFalsy(input: unknown): boolean {
    return !this.isTruthy(input);
  }

  static async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  static isValidUUID(value: string): boolean {
    return validate(value);
  }

  static isValidInteger(value: number): boolean {
    return Number.isInteger(value) && value >= 0;
  }

  static isValidBigInt(value: string): boolean {
    if (!value.match(/^\d+$/)) {
      return false;
    }

    try {
      BigInt(value);
      return true;
    } catch {
      return false;
    }
  }

  static isValidTextId(value: string): boolean {
    return Boolean(value.match(/^[a-zA-Z0-9_-]+$/));
  }

  static normalizeIdToString(value: string | number | bigint): string {
    if (typeof value === 'bigint') {
      return value.toString();
    }
    if (typeof value === 'number') {
      return value.toString();
    }
    return value;
  }

  static deepEqual(obj1: unknown, obj2: unknown): boolean {
    if (obj1 === obj2) {
      return true; // Primitives and reference equality
    }
  
    if (typeof obj1 !== 'object' || typeof obj2 !== 'object' || obj1 === null || obj2 === null) {
      return false; // If not objects or one is null
    }
  
    const keys1 = Object.keys(obj1 as object);
    const keys2 = Object.keys(obj2 as object);
  
    if (keys1.length !== keys2.length) {
      return false; // Different number of keys
    }
  
    for (const key of keys1) {
      if (!keys2.includes(key)) {
        return false; // Key exists in obj1 but not in obj2
      }
  
      const val1 = (obj1 as Record<string, unknown>)[key];
      const val2 = (obj2 as Record<string, unknown>)[key];
  
      // Recursively compare nested objects
      if (!this.deepEqual(val1, val2)) {
        return false;
      }
    }
  
    return true;
  }
}
