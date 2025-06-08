import { Result } from '../utils';
import {
  ACLContextId,
  ExternalSystemInfo,
  IAntiCorruptionLayer,
  TranslationError,
} from './anti-corruption-layer.interfaces';

/**
 * Test helper for ACL implementations
 */
export class ACLTestHelper<TDomain, TExternal> {
  constructor(private acl: IAntiCorruptionLayer<TDomain, TExternal>) {}

  /**
   * Test round-trip translation (domain -> external -> domain)
   */
  async testRoundTripTranslation(
    originalDomain: TDomain,
    domainComparator: (original: TDomain, roundTrip: TDomain) => boolean,
  ): Promise<Result<void, Error>> {
    // Translate to external
    const toExternalResult = this.acl.translateToExternal(originalDomain);
    if (toExternalResult.isFailure) {
      return Result.fail(
        new Error(`To external failed: ${toExternalResult.error.message}`),
      );
    }

    // Translate back to domain
    const toDomainResult = this.acl.translateFromExternal(
      toExternalResult.value,
    );
    if (toDomainResult.isFailure) {
      return Result.fail(
        new Error(`From external failed: ${toDomainResult.error.message}`),
      );
    }

    // Compare results
    if (!domainComparator(originalDomain, toDomainResult.value)) {
      return Result.fail(
        new Error('Round-trip translation failed - models do not match'),
      );
    }

    return Result.ok();
  }

  /**
   * Test translation with invalid input
   */
  async testInvalidInputHandling(
    invalidDomain: TDomain,
    expectedErrorPattern: RegExp,
  ): Promise<Result<void, Error>> {
    const result = this.acl.translateToExternal(invalidDomain);

    if (result.isSuccess) {
      return Result.fail(
        new Error('Expected translation to fail but it succeeded'),
      );
    }

    if (!expectedErrorPattern.test(result.error.message)) {
      return Result.fail(
        new Error(
          `Error message doesn't match pattern. Got: ${result.error.message}`,
        ),
      );
    }

    return Result.ok();
  }

  /**
   * Test bulk translation performance
   */
  async testBulkTranslationPerformance(
    domainModels: TDomain[],
    maxExpectedTimeMs: number,
  ): Promise<Result<{ timeMs: number; successCount: number }, Error>> {
    const startTime = Date.now();
    let successCount = 0;

    for (const model of domainModels) {
      const result = this.acl.translateToExternal(model);
      if (result.isSuccess) {
        successCount++;
      }
    }

    const timeMs = Date.now() - startTime;

    if (timeMs > maxExpectedTimeMs) {
      return Result.fail(
        new Error(
          `Translation took ${timeMs}ms, expected < ${maxExpectedTimeMs}ms`,
        ),
      );
    }

    return Result.ok({ timeMs, successCount });
  }

  /**
   * Generate test report
   */
  async generateTestReport(
    testCases: Array<{
      name: string;
      domainModel: TDomain;
      expectedSuccess: boolean;
    }>,
  ): Promise<ACLTestReport> {
    const results: TestCaseResult[] = [];

    for (const testCase of testCases) {
      const startTime = Date.now();
      const translationResult = this.acl.translateToExternal(
        testCase.domainModel,
      );
      const timeMs = Date.now() - startTime;

      const success = translationResult.isSuccess === testCase.expectedSuccess;

      results.push({
        name: testCase.name,
        success,
        timeMs,
        error: translationResult.isFailure
          ? translationResult.error.message
          : undefined,
        expectedSuccess: testCase.expectedSuccess,
        actualSuccess: translationResult.isSuccess,
      });
    }

    const successCount = results.filter((r) => r.success).length;
    const totalTime = results.reduce((sum, r) => sum + r.timeMs, 0);

    return {
      aclContext: this.acl.getContextId().value,
      externalSystem: this.acl.getExternalSystemInfo().systemName,
      totalTests: results.length,
      successfulTests: successCount,
      failedTests: results.length - successCount,
      totalTimeMs: totalTime,
      averageTimeMs: totalTime / results.length,
      results,
      generatedAt: new Date(),
    };
  }
}

/**
 * Mock ACL implementation for testing
 */
export class MockACL<TDomain, TExternal>
  implements IAntiCorruptionLayer<TDomain, TExternal>
{
  private toExternalMock?: (
    domain: TDomain,
  ) => Result<TExternal, TranslationError>;
  private fromExternalMock?: (
    external: TExternal,
  ) => Result<TDomain, TranslationError>;

  constructor(
    private contextId: ACLContextId,
    private externalSystemInfo: ExternalSystemInfo,
  ) {}

  /**
   * Setup mock for toExternal translation
   */
  mockToExternal(
    fn: (domain: TDomain) => Result<TExternal, TranslationError>,
  ): this {
    this.toExternalMock = fn;
    return this;
  }

  /**
   * Setup mock for fromExternal translation
   */
  mockFromExternal(
    fn: (external: TExternal) => Result<TDomain, TranslationError>,
  ): this {
    this.fromExternalMock = fn;
    return this;
  }

  translateToExternal(
    domainModel: TDomain,
  ): Result<TExternal, TranslationError> {
    if (!this.toExternalMock) {
      return Result.fail(
        TranslationError.forToExternal(
          'Mock not configured for toExternal',
          domainModel,
          this.contextId,
        ),
      );
    }
    return this.toExternalMock(domainModel);
  }

  translateFromExternal(
    externalModel: TExternal,
  ): Result<TDomain, TranslationError> {
    if (!this.fromExternalMock) {
      return Result.fail(
        TranslationError.forFromExternal(
          'Mock not configured for fromExternal',
          externalModel,
          this.contextId,
        ),
      );
    }
    return this.fromExternalMock(externalModel);
  }

  getContextId(): ACLContextId {
    return this.contextId;
  }

  getExternalSystemInfo(): ExternalSystemInfo {
    return { ...this.externalSystemInfo };
  }
}

export interface TestCaseResult {
  name: string;
  success: boolean;
  timeMs: number;
  error?: string;
  expectedSuccess: boolean;
  actualSuccess: boolean;
}

export interface ACLTestReport {
  aclContext: string;
  externalSystem: string;
  totalTests: number;
  successfulTests: number;
  failedTests: number;
  totalTimeMs: number;
  averageTimeMs: number;
  results: TestCaseResult[];
  generatedAt: Date;
}
