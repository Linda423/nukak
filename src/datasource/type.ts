import { Query, QueryOptions, QueryOne, QueryFilter, QueryPopulate } from '../type/query';

export interface QuerierPoolConnection {
  query<T>(sql: string): Promise<T>;
  release(): void | Promise<void>;
}

export interface QuerierPool {
  getQuerier(): Promise<Querier>;
}

export interface QuerierPoolOptions {
  host?: string;
  user?: string;
  password?: string;
  database?: string;
  port?: number;
}

export type QuerierDriver = 'mysql' | 'mysql2' | 'pg';

export type QuerierOptions = { driver: QuerierDriver } & QuerierPoolOptions;

/**
 * Use a class to be able to detect instances at runtime (via instanceof).
 */
export abstract class Querier {
  abstract insertOne<T>(type: { new (): T }, body: T): Promise<any>;
  abstract updateOne<T>(type: { new (): T }, filter: QueryFilter<T>, body: T): Promise<number>;
  abstract update<T>(type: { new (): T }, filter: QueryFilter<T>, body: T): Promise<number>;
  abstract findOne<T>(type: { new (): T }, qm: QueryOne<T>, opts?: QueryOptions): Promise<T>;
  abstract find<T>(type: { new (): T }, qm: Query<T>, opts?: QueryOptions): Promise<T[]>;
  abstract count<T>(type: { new (): T }, filter: QueryFilter<T>): Promise<number>;
  abstract removeOne<T>(type: { new (): T }, filter: QueryFilter<T>): Promise<number>;
  abstract remove<T>(type: { new (): T }, filter: QueryFilter<T>): Promise<number>;
  abstract hasOpenTransaction(): boolean;
  abstract beginTransaction(): Promise<void>;
  abstract commit(): Promise<void>;
  abstract rollback(): Promise<void>;
  abstract release(): Promise<void>;
}
