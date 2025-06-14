import { IACLAdapter, IEnhancedACLAdapter } from './acl.interfaces';
import { BaseACLRegistry } from './base-acl-registry';
import { ContextACLRegistry } from './context-acl-registry';

export interface ImportOptions {
  overwriteConflicts?: boolean;
  validateAdapters?: boolean;
}

export interface ImportResult {
  imported: string[];
  skipped: string[];
  conflicts: Array<{ contextName: string; reason: string }>;
}

export class ACLRegistry extends BaseACLRegistry {
  protected getRegistryName(): string {
    return 'GlobalACLRegistry';
  }

  importFromContext(
    contextRegistry: ContextACLRegistry,
    options: ImportOptions = {},
  ): ImportResult {
    const result: ImportResult = { imported: [], skipped: [], conflicts: [] };
    const sourceAdapters = contextRegistry.exportAdapters();

    for (const [contextName, adapter] of sourceAdapters) {
      if (this.hasContext(contextName)) {
        if (options.overwriteConflicts) {
          this.register(contextName, adapter, { source: 'import' });
          result.imported.push(contextName);
        } else {
          result.conflicts.push({ contextName, reason: 'Already registered' });
          result.skipped.push(contextName);
        }
      } else {
        this.register(contextName, adapter, { source: 'import' });
        result.imported.push(contextName);
      }
    }

    return result;
  }

  registerDirect<TDomain, TExternal>(
    contextName: string,
    adapter: IACLAdapter<TDomain, TExternal>,
    description?: string,
  ): this {
    return this.register(contextName, adapter, {
      description,
      source: 'direct',
      version: '1.0.0',
    });
  }

  registerEnhanced<TDomain, TExternal>(
    contextName: string,
    adapter: IEnhancedACLAdapter<TDomain, TExternal>,
    description?: string,
  ): this {
    return this.register(contextName, adapter, {
      description,
      source: 'enhanced',
      version: '1.0.0',
    });
  }
}
