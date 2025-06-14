import { IACLAdapter } from './acl.interfaces';
import { BaseACLRegistry } from './base-acl-registry';

export class ContextACLRegistry extends BaseACLRegistry {
  constructor(private readonly contextName: string) {
    super();
  }

  public getRegistryName(): string {
    return `ContextACLRegistry(${this.contextName})`;
  }

  registerLocal<TDomain, TExternal>(
    targetContextName: string,
    adapter: IACLAdapter<TDomain, TExternal>,
    description?: string,
  ): this {
    return this.register(targetContextName, adapter, {
      description,
      source: 'module',
      version: '1.0.0',
    });
  }
}
