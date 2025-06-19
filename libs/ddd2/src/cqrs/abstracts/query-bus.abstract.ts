import { IQuery, IQueryHandler } from '../interfaces';
import { ICQRSMiddleware } from '../middleware';

export abstract class IQueryBus {
  abstract register<T extends IQuery<R>, R>(
    queryType: any,
    handler: IQueryHandler<T, R>,
  ): void;
  abstract registerFactory<T extends IQuery<R>, R>(
    queryType: any,
    factory: () => IQueryHandler<T, R>,
  ): void;
  abstract use(middleware: ICQRSMiddleware): this;
  abstract discoverHandlers(): void;
  abstract execute<T extends IQuery<R>, R>(query: T): Promise<R>;
}
