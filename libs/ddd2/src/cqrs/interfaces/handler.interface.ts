import { ICommand } from './command.interface';
import { IQuery } from './query.interface';

export interface ICommandHandler<TCommand extends ICommand> {
  execute(command: TCommand): Promise<void>;
}

export interface IQueryHandler<TQuery extends IQuery<TResult>, TResult> {
  execute(query: TQuery): Promise<TResult>;
}
