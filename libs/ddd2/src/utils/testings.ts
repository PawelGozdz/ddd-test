export function safeRun<T, E = Error>(fn: () => Promise<T>): Promise<readonly [T | undefined, E | undefined]>;
export function safeRun<T, E = Error>(fn: () => T): readonly [T | undefined, E | undefined];
export function safeRun<T, E = Error>(fn: () => T | Promise<T>): readonly [T | undefined, E | undefined] | Promise<readonly [T | undefined, E | undefined]> {
  try {
    const result = fn();
    
    if (result instanceof Promise) {
      return result
        .then(value => [value, undefined] as const)
        .catch(error => [undefined, error as E] as const);
    }
    
    return [result, undefined] as const;
  } catch (error) {
    return [undefined, error as E] as const;
  }
}