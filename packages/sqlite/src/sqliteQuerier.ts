import { mapRows, BaseSqlQuerier } from '@uql/core/sql';
import { getMeta } from '@uql/core/entity/decorator';
import { Query, QueryFilter, QueryOptions, Type } from '@uql/core/type';
import { Sqlit3Connection } from './sqlite3Connection';
import { SqliteDialect } from './sqliteDialect';

export class SqliteQuerier extends BaseSqlQuerier {
  constructor(readonly conn: Sqlit3Connection) {
    super(new SqliteDialect(), conn);
  }

  async query<E>(query: string): Promise<E> {
    const res = await this.conn.query(query);
    return res as unknown as E;
  }

  async insertMany<E>(entity: Type<E>, bodies: E[]) {
    const query = this.dialect.insert(entity, bodies);
    const res = await this.conn.run(query);
    const meta = getMeta(entity);
    return bodies.map((body, index) =>
      body[meta.id.property] ? body[meta.id.property] : res.lastID - res.changes + index + 1
    );
  }

  async updateMany<E>(entity: Type<E>, filter: QueryFilter<E>, body: E) {
    const query = this.dialect.update(entity, filter, body);
    const res = await this.conn.run(query);
    return res.changes;
  }

  async findMany<E>(entity: Type<E>, qm: Query<E>, opts?: QueryOptions) {
    const query = this.dialect.find(entity, qm, opts);
    const res = await this.query<E[]>(query);
    const founds = mapRows(res);
    await this.populateToManyRelations(entity, founds, qm.populate);
    return founds;
  }

  async removeMany<E>(entity: Type<E>, filter: QueryFilter<E>) {
    const query = this.dialect.remove(entity, filter);
    const res = await this.conn.run(query);
    return res.changes;
  }
}
