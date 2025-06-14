import { Result } from '../utils';
import { ACLError } from './acl-errors';
import { ExecuteOptions, IACLAdapter } from './acl.interfaces';
import { ACLRegistrationMetadata, BaseACLRegistry } from './base-acl-registry';

export interface ACLVersionMetadata extends ACLRegistrationMetadata {
  version: string;
  isLatest: boolean;
  deprecated: boolean;
  deprecationReason?: string;
  compatibleWith?: string[];
}

export class VersionedACLRegistry extends BaseACLRegistry {
  private versionedAdapters = new Map<
    string,
    Map<string, IACLAdapter<any, any>>
  >();
  private latestVersions = new Map<string, string>();

  protected getRegistryName(): string {
    return 'VersionedACLRegistry';
  }

  registerVersioned<TDomain, TExternal>(
    contextName: string,
    version: string,
    adapter: IACLAdapter<TDomain, TExternal>,
    metadata?: Partial<ACLVersionMetadata>,
  ): this {
    if (!this.isValidVersion(version)) {
      throw new Error(`Invalid version format: ${version}`);
    }

    if (!this.versionedAdapters.has(contextName)) {
      this.versionedAdapters.set(contextName, new Map());
    }

    const contextVersions = this.versionedAdapters.get(contextName)!;
    contextVersions.set(version, adapter);

    this.updateLatestVersion(contextName, version);
    super.register(contextName, adapter, {
      ...metadata,
      version,
      source: 'versioned',
    });

    return this;
  }

  get<TDomain, TExternal>(
    contextName: string,
    version?: string,
  ): IACLAdapter<TDomain, TExternal> | undefined {
    const contextVersions = this.versionedAdapters.get(contextName);
    if (!contextVersions) return undefined;

    const targetVersion = version || this.getLatestVersion(contextName);
    return targetVersion ? contextVersions.get(targetVersion) : undefined;
  }

  getVersions(contextName: string): string[] {
    const contextVersions = this.versionedAdapters.get(contextName);
    return contextVersions
      ? Array.from(contextVersions.keys()).sort(this.compareVersions)
      : [];
  }

  getLatestVersion(contextName: string): string | undefined {
    return this.latestVersions.get(contextName);
  }

  private updateLatestVersion(contextName: string, newVersion: string): void {
    const currentLatest = this.latestVersions.get(contextName);
    if (!currentLatest || this.compareVersions(newVersion, currentLatest) > 0) {
      this.latestVersions.set(contextName, newVersion);
    }
  }

  private isValidVersion(version: string): boolean {
    const semverRegex = /^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9\-\.]+))?$/;
    return semverRegex.test(version);
  }

  private compareVersions(a: string, b: string): number {
    const parseVersion = (v: string) => {
      const parts = v.split('-')[0].split('.').map(Number);
      return {
        major: parts[0] || 0,
        minor: parts[1] || 0,
        patch: parts[2] || 0,
      };
    };

    const vA = parseVersion(a);
    const vB = parseVersion(b);

    if (vA.major !== vB.major) return vA.major - vB.major;
    if (vA.minor !== vB.minor) return vA.minor - vB.minor;
    return vA.patch - vB.patch;
  }
}

export class VersionedACLAdapter<TDomain, TExternal, TResult = any> {
  constructor(
    private registry: VersionedACLRegistry,
    private defaultContextName: string,
  ) {}

  async execute(
    operation: string,
    domainModel: TDomain,
    options?: ExecuteOptions,
  ): Promise<Result<TResult, ACLError>> {
    const adapter = this.resolveAdapter(options?.version);
    return adapter.execute(operation, domainModel);
  }

  getAvailableVersions(): string[] {
    return this.registry.getVersions(this.defaultContextName);
  }

  private resolveAdapter(
    version?: string,
  ): IACLAdapter<TDomain, TExternal, TResult> {
    const targetVersion =
      version || this.registry.getLatestVersion(this.defaultContextName);
    const adapter = this.registry.get<TDomain, TExternal>(
      this.defaultContextName,
      targetVersion,
    );

    if (!adapter) {
      throw new Error(
        `ACL adapter not found for context: ${this.defaultContextName}, version: ${targetVersion}`,
      );
    }

    return adapter;
  }
}
