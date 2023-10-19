import sqlstring from 'sqlstring';
import { AbstractSqlDialect } from 'nukak/dialect';
import { Scalar } from 'nukak/type';

export class MySqlDialect extends AbstractSqlDialect {
  override escape(value: any): Scalar {
    return sqlstring.escape(value);
  }
}
