import { Result } from '../utils';
import { ACLError } from './acl-errors';
import { ACLMiddleware, ExecuteOptions } from './acl.interfaces';

export abstract class BaseACLMiddleware implements ACLMiddleware {
  abstract execute<T>(
    operation: string,
    domainModel: any,
    options: ExecuteOptions,
    next: () => Promise<Result<T, ACLError>>,
  ): Promise<Result<T, ACLError>>;
}
