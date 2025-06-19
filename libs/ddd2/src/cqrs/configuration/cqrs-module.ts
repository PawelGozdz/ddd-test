import { CQRSConfiguration } from './cqrs-configuration';
import { CQRSOptions } from './cqrs-options.interface';

export class CQRSModule {
  static create(options: CQRSOptions = {}): CQRSConfiguration {
    return new CQRSConfiguration(options);
  }

  static createBasic(): CQRSConfiguration {
    return new CQRSConfiguration({
      commandBusType: 'basic',
      queryBusType: 'basic',
    });
  }

  static createEnhanced(): CQRSConfiguration {
    return new CQRSConfiguration({
      commandBusType: 'enhanced',
      queryBusType: 'enhanced',
    });
  }
}
