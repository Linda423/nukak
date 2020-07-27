<!-- [![build status](https://travis-ci.org/rogerpadilla/onql.svg?branch=master)](https://travis-ci.org/rogerpadilla/onql?branch=master) -->
<!-- [![coverage status](https://coveralls.io/repos/rogerpadilla/onql/badge.svg?branch=master)](https://coveralls.io/r/rogerpadilla/onql?branch=master) -->
<!-- [![dependencies status](https://david-dm.org/rogerpadilla/onql/status.svg)](https://david-dm.org/rogerpadilla/onql/status.svg) -->
<!-- [![dev dependencies status](https://david-dm.org/rogerpadilla/onql/dev-status.svg)](https://david-dm.org/rogerpadilla/onql/dev-status.svg) -->
<!-- [![npm downloads](https://img.shields.io/npm/dm/onql.svg)](https://www.npmjs.com/package/onql) -->
<!-- [![npm version](https://badge.fury.io/js/onql.svg)](https://www.npmjs.com/onql) -->

# `{*}` onql

onql is a plug & play ORM library, with an expressible (and type-safe) JSON syntax allowing to query/update different databases in a minimalistic way.

onql's dream is to achieve what [GraphQL](https://graphql.org/learn) achieved but in a much simpler way (no need for [additional servers](https://graphql.org/learn/execution) nor [a new language](https://graphql.org/learn/queries)); onql's JSON syntax allows to retrieve what is necessary from the data-sources; it can be used with (and without) any backend/frontend framework (like express, restify, react, angular...). onql's syntax is inspired by MongoDb, JPA, and GraphQL.

## Table of Contents

1. [Features](#features)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Frequently Asked Questions](#faq)
5. [License](#license)

## <a name="features"></a>:battery: Features

- supports on-demand `populate` (at multiple levels), `projection` of fields/columns (at multiple levels), complex `filtering` (at multiple levels), `grouping`,
  and `pagination`.
- declarative and imperative `transactions`
- generic and custom `repositories`
- `relations` between entities
- supports `inheritance` patterns
- connection pooling
- supports Postgres, MySQL, MariaDB, SQLite (experimental), MongoDB (experimental), more soon...
- code is readable, short, performant and flexible
- plugins form frameworks: express, more soon...

## <a name="installation"></a>:ship: Installation

1. Install the npm package:

   `npm install @onql/core --save` or `yarn add @onql/core`

2. Make sure to enable the following properties in the `tsconfig.json` file of your `TypeScript` project: `experimentalDecorators` and `emitDecoratorMetadata`

3. Install a database driver according to your database:

   - for MySQL or MariaDB

     `npm install mysql2 --save` (alternatively, `mysql` or `mariadb` can be used)

   - for PostgreSQL or CockroachDB

     `npm install pg --save`

   - for SQLite (experimental)

     `npm install sqlite3 --save`

   - for MongoDB (experimental)

     `npm install mongodb --save`

## <a name="configuration"></a>Steps to use:

- Declare the entities (notice that inheritance between entities is optional)

```typescript
/**
 * an abstract class can (optionally) be used as a template for the entities (so boilerplate code is reduced)
 */

export abstract class BaseEntity {
  @IdColumn()
  id?: number;
  /**
   * different relations between entities are supported
   */
  @ManyToOne({ type: () => Company })
  company?: number | Company;
  @ManyToOne({ type: () => User })
  user?: number | User;
  /**
   * 'onInsert' callback can be used to specify a custom mechanism for
   * obtaining the value of a column when inserting:
   */
  @Column({ onInsert: () => Date.now() })
  createdAt?: number;
  /**
   * 'onUpdate' callback can be used to specify a custom mechanism for
   * obtaining the value of a column when updating:
   */
  @Column({ onUpdate: () => Date.now() })
  updatedAt?: number;
  @Column()
  status?: number;
}

@Entity()
export class Company extends BaseEntity {
  @Column()
  name?: string;
  @Column()
  description?: string;
}

/**
 * a custom name can be specified for the corresponding table/document
 */
@Entity({ name: 'user_profile' })
export class Profile extends BaseEntity {
  /**
   * a custom name can be specified for the corresponding column
   */
  @IdColumn({ name: 'pk' })
  id?: number;
  @Column({ name: 'image' })
  picture?: string;
}

@Entity()
export class User extends BaseEntity {
  @Column()
  name?: string;
  @Column()
  email?: string;
  @Column()
  password?: string;
  @OneToOne({ mappedBy: 'user' })
  @Column()
  profile?: Profile;
}

@Entity()
export class TaxCategory extends BaseEntity {
  /**
   * Any entity can specify its own ID Column and still inherit the others
   * columns/relations from its parent entity.
   * 'onInsert' callback can be used to specify a custom mechanism for
   * auto-generating the primary-key's value when inserting:
   * import { v4 as uuidv4 } from 'uuid';
   */
  @IdColumn({ onInsert: () => uuidv4() })
  pk?: string;
  @Column()
  name?: string;
  @Column()
  description?: string;
}

@Entity()
export class Tax extends BaseEntity {
  @Column()
  name?: string;
  @Column()
  percentage?: number;
  @ManyToOne()
  @Column()
  category?: TaxCategory;
  @Column()
  description?: string;
}
```

- initialize `onql` configuration:

```typescript
import { initOnql } from 'onql';
import { GenericServerRepository } from 'onql/repository';
// `pg` is for postgres driver, other databases are supported.
initOnql({ datasource: { driver: 'pg' }, defaultRepositoryClass: GenericServerRepository });
```

- your logic will look like this:

```typescript
try {
  await querier.beginTransaction();

  // create one user
  const generatedId: number = await querier.insertOne(User, {
    name: 'Some Name',
    email1: { picture: 'abc1@example.com' },
    profile: { picture: 'abc1' },
  });

  // create multiple users in a batch
  const generatedIds: number[] = await querier.insert(User, [
    {
      name: 'Another Name',
      email: { picture: 'abc2@example.com' },
      profile: { picture: 'abc2' },
      company: 123,
    },
    {
      name: 'One More Name',
      email: { picture: 'abc3@example.com' },
      profile: { picture: 'abc3' },
      company: 123,
    },
  ]);

  // find users
  const users: User[] = await querier.find(User, {
    populate: { profile: null }, // retrieve all fields for 'profile'
    filter: { company: 123 },
    limit: 100,
  });

  // update users
  const updatedRows: number = await querier.updateOneById(User, generatedId, { company: 123 });

  // removed users
  const updatedRows: number = await querier.removeOneById(User, generatedId);

  // count users
  const count: number = await querier.count(User, { company: 3 });

  await querier.commit();
} catch (error) {
  await querier.rollback();
} finally {
  await querier.release();
}
```
