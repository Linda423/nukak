import {
  Company,
  InventoryAdjustment,
  Item,
  ItemAdjustment,
  MeasureUnit,
  Profile,
  Spec,
  Tax,
  TaxCategory,
  User,
} from '../test/index.js';
import type { FieldKey, QueryFilter } from '../type/index.js';
import { raw } from '../util/index.js';
import { AbstractSqlDialect } from './abstractSqlDialect.js';

export abstract class AbstractSqlDialectSpec implements Spec {
  constructor(readonly dialect: AbstractSqlDialect) {}

  shouldBeValidEscapeCharacter() {
    expect(this.dialect.escapeIdChar).toBe('`');
  }

  shouldBeginTransaction() {
    expect(this.dialect.beginTransactionCommand).toBe('START TRANSACTION');
  }

  shouldInsertMany() {
    expect(
      this.dialect.insert(User, [
        {
          name: 'Some name 1',
          email: 'someemail1@example.com',
          createdAt: 123,
        },
        {
          name: 'Some name 2',
          email: 'someemail2@example.com',
          createdAt: 456,
        },
        {
          name: 'Some name 3',
          email: 'someemail3@example.com',
          createdAt: 789,
        },
      ]),
    ).toBe(
      'INSERT INTO `User` (`name`, `email`, `createdAt`) VALUES' +
        " ('Some name 1', 'someemail1@example.com', 123)" +
        ", ('Some name 2', 'someemail2@example.com', 456)" +
        ", ('Some name 3', 'someemail3@example.com', 789)",
    );
  }

  shouldInsertOne() {
    expect(
      this.dialect.insert(User, {
        name: 'Some Name',
        email: 'someemail@example.com',
        createdAt: 123,
      }),
    ).toBe("INSERT INTO `User` (`name`, `email`, `createdAt`) VALUES ('Some Name', 'someemail@example.com', 123)");

    expect(
      this.dialect.insert(InventoryAdjustment, {
        date: new Date(2021, 11, 31, 23, 59, 59, 999),
        createdAt: 123,
      }),
    ).toBe("INSERT INTO `InventoryAdjustment` (`date`, `createdAt`) VALUES ('2021-12-31 23:59:59.999', 123)");
  }

  shouldInsertWithOnInsertId() {
    expect(
      this.dialect.insert(TaxCategory, {
        name: 'Some Name',
        createdAt: 123,
      }),
    ).toMatch(/^INSERT INTO `TaxCategory` \(`name`, `createdAt`, `pk`\) VALUES \('Some Name', 123, '.+'\)$/);
  }

  shouldInsertManyWithSpecifiedIdsAndOnInsertIdAsDefault() {
    expect(
      this.dialect.insert(TaxCategory, [
        {
          name: 'Some Name A',
        },
        {
          pk: '50',
          name: 'Some Name B',
        },
        {
          name: 'Some Name C',
        },
        {
          pk: '70',
          name: 'Some Name D',
        },
      ]),
    ).toMatch(
      /^INSERT INTO `TaxCategory` \(`name`, `createdAt`, `pk`\) VALUES \('Some Name A', \d+, '.+'\), \('Some Name B', \d+, '50'\), \('Some Name C', \d+, '.+'\), \('Some Name D', \d+, '70'\)$/,
    );
  }

  shouldUpdate() {
    expect(
      this.dialect.update(
        User,
        { $filter: { name: 'some', creatorId: 123 } },
        {
          name: 'Some Text',
          updatedAt: 321,
        },
      ),
    ).toBe("UPDATE `User` SET `name` = 'Some Text', `updatedAt` = 321 WHERE `name` = 'some' AND `creatorId` = 123");
  }

  shouldFind() {
    expect(
      this.dialect.find(
        User,
        {
          $filter: { id: 123, name: { $ne: 'abc' } },
        },
        ['id'],
      ),
    ).toBe("SELECT `id` FROM `User` WHERE `id` = 123 AND `name` <> 'abc'");

    expect(
      this.dialect.find(
        Profile,
        {
          $filter: { pk: 123, picture: 'abc' },
        },
        ['pk', 'picture', 'companyId'],
      ),
    ).toBe("SELECT `pk`, `image` `picture`, `companyId` FROM `user_profile` WHERE `pk` = 123 AND `image` = 'abc'");

    expect(
      this.dialect.find(
        MeasureUnit,
        {
          $filter: { id: 123, name: 'abc' },
        },
        ['id'],
      ),
    ).toBe("SELECT `id` FROM `MeasureUnit` WHERE `id` = 123 AND `name` = 'abc' AND `deletedAt` IS NULL");
  }

  shouldBeSecure() {
    expect(
      this.dialect.find(
        User,
        {
          $filter: {
            id: 1,
            something: 1,
          } as any,
          $sort: {
            id: 1,
            something: 1,
          } as any,
        },
        ['id', 'something' as FieldKey<User>],
      ),
    ).toBe('SELECT `id` FROM `User` WHERE `id` = 1 AND `something` = 1 ORDER BY `id`, `something`');

    expect(
      this.dialect.insert(User, {
        name: 'Some Name',
        something: 'anything',
        createdAt: 1,
      } as any),
    ).toBe("INSERT INTO `User` (`name`, `createdAt`) VALUES ('Some Name', 1)");

    expect(
      this.dialect.update(
        User,
        {
          $filter: { something: 'anything' },
        },
        {
          name: 'Some Name',
          something: 'anything',
          updatedAt: 1,
        } as any,
      ),
    ).toBe("UPDATE `User` SET `name` = 'Some Name', `updatedAt` = 1 WHERE `something` = 'anything'");

    expect(
      this.dialect.delete(User, {
        $filter: { something: 'anything' } as any,
      }),
    ).toBe("DELETE FROM `User` WHERE `something` = 'anything'");
  }

  shouldFind$and() {
    const sql = "SELECT `id` FROM `User` WHERE `id` = 123 AND `name` = 'abc'";

    expect(
      this.dialect.find(
        User,
        {
          $filter: { $and: [{ id: 123, name: 'abc' }] },
        },
        ['id'],
      ),
    ).toBe(sql);

    expect(
      this.dialect.find(
        User,
        {
          $filter: { $and: [{ id: 123 }], name: 'abc' },
        },
        { id: 1 },
      ),
    ).toBe(sql);
  }

  shouldFind$or() {
    expect(
      this.dialect.find(
        User,
        {
          $filter: { $or: [{ id: 123 }, { name: 'abc' }] },
        },
        ['id'],
      ),
    ).toBe("SELECT `id` FROM `User` WHERE `id` = 123 OR `name` = 'abc'");

    expect(
      this.dialect.find(
        User,
        {
          $filter: { $or: [{ id: 123 }] },
        },
        ['id'],
      ),
    ).toBe('SELECT `id` FROM `User` WHERE `id` = 123');

    expect(
      this.dialect.find(
        User,
        {
          $filter: { $or: [{ id: 123, name: 'abc' }] },
        },
        { id: 1 },
      ),
    ).toBe("SELECT `id` FROM `User` WHERE `id` = 123 AND `name` = 'abc'");

    expect(
      this.dialect.find(
        User,
        {
          $filter: { $or: [{ id: 123 }], name: 'abc' },
        },
        ['id'],
      ),
    ).toBe("SELECT `id` FROM `User` WHERE `id` = 123 AND `name` = 'abc'");
  }

  shouldFind$not() {
    expect(
      this.dialect.find(
        User,
        {
          $filter: { $not: [{ name: 'Some' }] },
        },
        ['id'],
      ),
    ).toBe("SELECT `id` FROM `User` WHERE NOT `name` = 'Some'");

    expect(
      this.dialect.find(
        Company,
        {
          $filter: { id: { $not: 123 } },
        },
        ['id'],
      ),
    ).toBe('SELECT `id` FROM `Company` WHERE NOT `id` = 123');

    expect(
      this.dialect.find(
        Company,
        {
          $filter: { id: { $not: [123, 456] } },
        },
        ['id'],
      ),
    ).toBe('SELECT `id` FROM `Company` WHERE NOT `id` IN (123, 456)');

    expect(
      this.dialect.find(
        Company,
        {
          $filter: { id: 123, name: { $not: { $startsWith: 'a' } } },
        },
        ['id'],
      ),
    ).toBe("SELECT `id` FROM `Company` WHERE `id` = 123 AND NOT `name` LIKE 'a%'");

    expect(
      this.dialect.find(
        Company,
        {
          $filter: { name: { $not: { $startsWith: 'a', $endsWith: 'z' } } },
        },
        ['id'],
      ),
    ).toBe("SELECT `id` FROM `Company` WHERE NOT (`name` LIKE 'a%' AND `name` LIKE '%z')");

    expect(
      this.dialect.find(
        User,
        {
          $filter: { $not: [{ name: { $like: 'Some', $ne: 'Something' } }] },
        },
        { id: true },
      ),
    ).toBe("SELECT `id` FROM `User` WHERE NOT (`name` LIKE 'Some' AND `name` <> 'Something')");

    expect(
      this.dialect.find(
        User,
        {
          $filter: { $not: [{ name: 'abc' }, { creatorId: 1 }] },
        },
        { id: true },
      ),
    ).toBe("SELECT `id` FROM `User` WHERE NOT (`name` = 'abc' AND `creatorId` = 1)");

    expect(
      this.dialect.find(
        Tax,
        {
          $filter: { companyId: 1, name: { $not: { $startsWith: 'a' } } },
        },
        ['id'],
      ),
    ).toBe("SELECT `id` FROM `Tax` WHERE `companyId` = 1 AND NOT `name` LIKE 'a%'");
  }

  shouldFind$nor() {
    expect(
      this.dialect.find(
        User,
        {
          $filter: { $nor: [{ name: 'Some' }] },
        },
        ['id'],
      ),
    ).toBe("SELECT `id` FROM `User` WHERE NOT `name` = 'Some'");

    expect(
      this.dialect.find(
        User,
        {
          $filter: { $nor: [{ name: { $like: 'Some', $ne: 'Something' } }] },
        },
        { id: true },
      ),
    ).toBe("SELECT `id` FROM `User` WHERE NOT (`name` LIKE 'Some' AND `name` <> 'Something')");

    expect(
      this.dialect.find(
        User,
        {
          $filter: { $nor: [{ name: 'abc' }, { creatorId: 1 }] },
        },
        { id: true },
      ),
    ).toBe("SELECT `id` FROM `User` WHERE NOT (`name` = 'abc' OR `creatorId` = 1)");
  }

  shouldFind$orAnd$and() {
    expect(
      this.dialect.find(
        User,
        {
          $filter: { creatorId: 1, $or: [{ name: ['a', 'b', 'c'] }, { email: 'abc@example.com' }], id: 1 },
        },
        ['id'],
      ),
    ).toBe(
      "SELECT `id` FROM `User` WHERE `creatorId` = 1 AND (`name` IN ('a', 'b', 'c') OR `email` = 'abc@example.com') AND `id` = 1",
    );

    expect(
      this.dialect.find(
        User,
        {
          $filter: {
            creatorId: 1,
            $or: [{ name: ['a', 'b', 'c'] }, { email: 'abc@example.com' }],
            id: 1,
            email: 'e',
          },
        },
        ['id'],
      ),
    ).toBe(
      'SELECT `id` FROM `User` WHERE `creatorId` = 1' +
        " AND (`name` IN ('a', 'b', 'c') OR `email` = 'abc@example.com') AND `id` = 1 AND `email` = 'e'",
    );

    expect(
      this.dialect.find(
        User,
        {
          $filter: {
            creatorId: 1,
            $or: [{ name: ['a', 'b', 'c'] }, { email: 'abc@example.com' }],
            id: 1,
            email: 'e',
          },
          $sort: { name: 1, createdAt: -1 },
          $skip: 50,
          $limit: 10,
        },
        ['id'],
      ),
    ).toBe(
      'SELECT `id` FROM `User` WHERE `creatorId` = 1' +
        " AND (`name` IN ('a', 'b', 'c') OR `email` = 'abc@example.com')" +
        " AND `id` = 1 AND `email` = 'e'" +
        ' ORDER BY `name`, `createdAt` DESC LIMIT 10 OFFSET 50',
    );

    expect(
      this.dialect.find(
        User,
        {
          $filter: {
            $or: [
              {
                creatorId: 1,
                id: 1,
                email: 'e',
              },
              { name: ['a', 'b', 'c'], email: 'abc@example.com' },
            ],
          },
          $sort: [
            { field: 'name', sort: 'asc' },
            { field: 'createdAt', sort: 'desc' },
          ],
          $skip: 50,
          $limit: 10,
        },
        ['id'],
      ),
    ).toBe(
      "SELECT `id` FROM `User` WHERE (`creatorId` = 1 AND `id` = 1 AND `email` = 'e')" +
        " OR (`name` IN ('a', 'b', 'c') AND `email` = 'abc@example.com')" +
        ' ORDER BY `name`, `createdAt` DESC LIMIT 10 OFFSET 50',
    );
  }

  shouldFindSingle$filter() {
    expect(
      this.dialect.find(
        User,
        {
          $filter: { name: 'some' },
          $limit: 3,
        },
        ['id'],
      ),
    ).toBe("SELECT `id` FROM `User` WHERE `name` = 'some' LIMIT 3");
  }

  shouldFindMultipleComparisonOperators() {
    expect(
      this.dialect.find(
        User,
        {
          $filter: { $or: [{ name: { $eq: 'other', $ne: 'other unwanted' } }, { companyId: 1 }] },
        },
        ['id'],
      ),
    ).toBe("SELECT `id` FROM `User` WHERE (`name` = 'other' AND `name` <> 'other unwanted') OR `companyId` = 1");

    expect(
      this.dialect.find(
        User,
        {
          $filter: { createdAt: { $gte: 123, $lte: 999 } },
          $limit: 10,
        },
        ['id'],
      ),
    ).toBe('SELECT `id` FROM `User` WHERE (`createdAt` >= 123 AND `createdAt` <= 999) LIMIT 10');

    expect(
      this.dialect.find(
        User,
        {
          $filter: { createdAt: { $gt: 123, $lt: 999 } },
          $limit: 10,
        },
        ['id'],
      ),
    ).toBe('SELECT `id` FROM `User` WHERE (`createdAt` > 123 AND `createdAt` < 999) LIMIT 10');
  }

  shouldFind$ne() {
    expect(
      this.dialect.find(
        User,
        {
          $filter: { name: 'some', companyId: { $ne: 5 } },
          $limit: 20,
        },
        ['id'],
      ),
    ).toBe("SELECT `id` FROM `User` WHERE `name` = 'some' AND `companyId` <> 5 LIMIT 20");
  }

  shouldFindIsNull() {
    expect(
      this.dialect.find(
        User,
        {
          $filter: { creatorId: 123, companyId: null },
          $limit: 5,
        },
        ['id'],
      ),
    ).toBe('SELECT `id` FROM `User` WHERE `creatorId` = 123 AND `companyId` IS NULL LIMIT 5');

    expect(
      this.dialect.find(
        User,
        {
          $filter: { creatorId: 123, companyId: { $ne: null } },
          $limit: 5,
        },
        ['id'],
      ),
    ).toBe('SELECT `id` FROM `User` WHERE `creatorId` = 123 AND `companyId` IS NOT NULL LIMIT 5');
  }

  shouldFind$in() {
    const sql = "SELECT `id` FROM `User` WHERE `name` = 'some' AND `companyId` IN (1, 2, 3) LIMIT 10";
    expect(
      this.dialect.find(
        User,
        {
          $filter: { name: 'some', companyId: [1, 2, 3] },
          $limit: 10,
        },
        ['id'],
      ),
    ).toBe(sql);
    expect(
      this.dialect.find(
        User,
        {
          $filter: { name: 'some', companyId: { $in: [1, 2, 3] } },
          $limit: 10,
        },
        ['id'],
      ),
    ).toBe(sql);
  }

  shouldFind$nin() {
    expect(
      this.dialect.find(
        User,
        {
          $filter: { name: 'some', companyId: { $nin: [1, 2, 3] } },
          $limit: 10,
        },
        ['id'],
      ),
    ).toBe("SELECT `id` FROM `User` WHERE `name` = 'some' AND `companyId` NOT IN (1, 2, 3) LIMIT 10");
  }

  shouldFind$projectFields() {
    expect(this.dialect.find(User, {}, { id: true, company: true })).toBe(
      'SELECT `User`.`id`, `company`.`id` `company.id`, `company`.`companyId` `company.companyId`, `company`.`creatorId` `company.creatorId`' +
        ', `company`.`createdAt` `company.createdAt`, `company`.`updatedAt` `company.updatedAt`' +
        ', `company`.`name` `company.name`, `company`.`description` `company.description`' +
        ' FROM `User` LEFT JOIN `Company` `company` ON `company`.`id` = `User`.`companyId`',
    );
  }

  shouldFind$projectOneToOne() {
    expect(this.dialect.find(User, {}, { id: true, name: true, profile: ['id', 'picture'] })).toBe(
      'SELECT `User`.`id`, `User`.`name`, `profile`.`pk` `profile.pk`, `profile`.`image` `profile.picture` FROM `User`' +
        ' LEFT JOIN `user_profile` `profile` ON `profile`.`creatorId` = `User`.`id`',
    );

    expect(this.dialect.find(User, {}, { profile: true })).toBe(
      'SELECT `User`.`id`, `profile`.`companyId` `profile.companyId`' +
        ', `profile`.`creatorId` `profile.creatorId`, `profile`.`createdAt` `profile.createdAt`' +
        ', `profile`.`updatedAt` `profile.updatedAt`' +
        ', `profile`.`pk` `profile.pk`, `profile`.`image` `profile.picture`' +
        ' FROM `User` LEFT JOIN `user_profile` `profile` ON `profile`.`creatorId` = `User`.`id`',
    );
  }

  shouldFind$projectManyToOne() {
    expect(
      this.dialect.find(
        Item,
        {
          $limit: 100,
        },
        {
          id: true,
          name: true,
          code: true,
          tax: { $project: ['id', 'name'], $required: true },
          measureUnit: { $project: ['id', 'name', 'categoryId'] },
        },
      ),
    ).toBe(
      'SELECT `Item`.`id`, `Item`.`name`, `Item`.`code`' +
        ', `tax`.`id` `tax.id`, `tax`.`name` `tax.name`' +
        ', `measureUnit`.`id` `measureUnit.id`, `measureUnit`.`name` `measureUnit.name`, `measureUnit`.`categoryId` `measureUnit.categoryId`' +
        ' FROM `Item`' +
        ' INNER JOIN `Tax` `tax` ON `tax`.`id` = `Item`.`taxId`' +
        ' LEFT JOIN `MeasureUnit` `measureUnit` ON `measureUnit`.`id` = `Item`.`measureUnitId`' +
        ' LIMIT 100',
    );
  }

  shouldFind$projectWithAllFieldsAndSpecificFieldsAndFilter() {
    expect(
      this.dialect.find(
        Item,
        {
          $filter: { salePrice: { $gte: 1000 }, name: { $istartsWith: 'A' } },
          $sort: { tax: { name: 1 }, measureUnit: { name: 1 }, createdAt: -1 },
          $limit: 100,
        },
        {
          id: true,
          name: true,
          measureUnit: { $project: ['id', 'name'], $filter: { name: { $ne: 'unidad' } }, $required: true },
          tax: ['id', 'name'],
        },
      ),
    ).toBe(
      'SELECT `Item`.`id`, `Item`.`name`' +
        ', `measureUnit`.`id` `measureUnit.id`, `measureUnit`.`name` `measureUnit.name`' +
        ', `tax`.`id` `tax.id`, `tax`.`name` `tax.name`' +
        ' FROM `Item`' +
        " INNER JOIN `MeasureUnit` `measureUnit` ON `measureUnit`.`id` = `Item`.`measureUnitId` AND `measureUnit`.`name` <> 'unidad' AND `measureUnit`.`deletedAt` IS NULL" +
        ' LEFT JOIN `Tax` `tax` ON `tax`.`id` = `Item`.`taxId`' +
        " WHERE `Item`.`salePrice` >= 1000 AND LOWER(`Item`.`name`) LIKE 'a%'" +
        ' ORDER BY `tax`.`name`, `measureUnit`.`name`, `Item`.`createdAt` DESC LIMIT 100',
    );
  }

  shouldVirtualField() {
    expect(
      this.dialect.find(
        Item,
        {
          $filter: {
            tagsCount: { $gte: 10 },
          },
        },
        {
          id: 1,
        },
      ),
    ).toBe(
      'SELECT `id` FROM `Item` WHERE (SELECT COUNT(*) `count` FROM `ItemTag` WHERE `ItemTag`.`itemId` = `id`) >= 10',
    );

    expect(
      this.dialect.find(
        Item,
        {
          $limit: 100,
        },
        {
          id: 1,
          name: 1,
          code: 1,
          tagsCount: 1,
          measureUnit: {
            $project: { id: 1, name: 1, categoryId: 1, category: ['name'] },
          },
        },
      ),
    ).toBe(
      'SELECT `Item`.`id`, `Item`.`name`, `Item`.`code`' +
        ', (SELECT COUNT(*) `count` FROM `ItemTag` WHERE `ItemTag`.`itemId` = `Item`.`id`) `tagsCount`' +
        ', `measureUnit`.`id` `measureUnit.id`, `measureUnit`.`name` `measureUnit.name`, `measureUnit`.`categoryId` `measureUnit.categoryId`' +
        ', `measureUnit.category`.`id` `measureUnit.category.id`, `measureUnit.category`.`name` `measureUnit.category.name`' +
        ' FROM `Item` LEFT JOIN `MeasureUnit` `measureUnit` ON `measureUnit`.`id` = `Item`.`measureUnitId`' +
        ' LEFT JOIN `MeasureUnitCategory` `measureUnit.category` ON `measureUnit.category`.`id` = `measureUnit`.`categoryId`' +
        ' LIMIT 100',
    );
  }

  shouldFind$projectDeep() {
    expect(
      this.dialect.find(
        Item,
        {
          $limit: 100,
        },
        {
          id: 1,
          name: 1,
          code: 1,
          measureUnit: {
            $project: { id: 1, name: 1, categoryId: 1, category: ['name'] },
          },
        },
      ),
    ).toBe(
      'SELECT `Item`.`id`, `Item`.`name`, `Item`.`code`' +
        ', `measureUnit`.`id` `measureUnit.id`' +
        ', `measureUnit`.`name` `measureUnit.name`, `measureUnit`.`categoryId` `measureUnit.categoryId`' +
        ', `measureUnit.category`.`id` `measureUnit.category.id`, `measureUnit.category`.`name` `measureUnit.category.name`' +
        ' FROM `Item` LEFT JOIN `MeasureUnit` `measureUnit` ON `measureUnit`.`id` = `Item`.`measureUnitId`' +
        ' LEFT JOIN `MeasureUnitCategory` `measureUnit.category` ON `measureUnit.category`.`id` = `measureUnit`.`categoryId`' +
        ' LIMIT 100',
    );

    expect(
      this.dialect.find(
        Item,
        {
          $limit: 100,
        },
        {
          id: true,
          name: true,
          code: true,
          measureUnit: {
            $project: { id: true, name: true, category: { $project: { id: true, name: true } } },
          },
        },
      ),
    ).toBe(
      'SELECT `Item`.`id`, `Item`.`name`, `Item`.`code`, `measureUnit`.`id` `measureUnit.id`' +
        ', `measureUnit`.`name` `measureUnit.name`, `measureUnit.category`.`id` `measureUnit.category.id`' +
        ', `measureUnit.category`.`name` `measureUnit.category.name`' +
        ' FROM `Item` LEFT JOIN `MeasureUnit` `measureUnit` ON `measureUnit`.`id` = `Item`.`measureUnitId`' +
        ' LEFT JOIN `MeasureUnitCategory` `measureUnit.category` ON `measureUnit.category`.`id` = `measureUnit`.`categoryId`' +
        ' LIMIT 100',
    );

    expect(
      this.dialect.find(
        ItemAdjustment,
        {
          $limit: 100,
        },
        {
          id: true,
          buyPrice: true,
          number: true,
          item: {
            $project: {
              id: true,
              name: true,
              measureUnit: {
                $project: { id: true, name: true, category: ['id', 'name'] },
              },
            },
            $required: true,
          },
        },
      ),
    ).toBe(
      'SELECT `ItemAdjustment`.`id`, `ItemAdjustment`.`buyPrice`, `ItemAdjustment`.`number`' +
        ', `item`.`id` `item.id`, `item`.`name` `item.name`' +
        ', `item.measureUnit`.`id` `item.measureUnit.id`, `item.measureUnit`.`name` `item.measureUnit.name`' +
        ', `item.measureUnit.category`.`id` `item.measureUnit.category.id`, `item.measureUnit.category`.`name` `item.measureUnit.category.name`' +
        ' FROM `ItemAdjustment`' +
        ' INNER JOIN `Item` `item` ON `item`.`id` = `ItemAdjustment`.`itemId`' +
        ' LEFT JOIN `MeasureUnit` `item.measureUnit` ON `item.measureUnit`.`id` = `item`.`measureUnitId`' +
        ' LEFT JOIN `MeasureUnitCategory` `item.measureUnit.category` ON `item.measureUnit.category`.`id` = `item.measureUnit`.`categoryId`' +
        ' LIMIT 100',
    );
  }

  shouldFind$limit() {
    expect(
      this.dialect.find(
        User,
        {
          $filter: 9,
          $limit: 1,
        },
        ['id'],
      ),
    ).toBe('SELECT `id` FROM `User` WHERE `id` = 9 LIMIT 1');

    expect(
      this.dialect.find(
        User,
        {
          $filter: 9,
          $limit: 1,
        },
        { id: 1, name: 1, creatorId: 1 },
      ),
    ).toBe('SELECT `id`, `name`, `creatorId` FROM `User` WHERE `id` = 9 LIMIT 1');

    expect(
      this.dialect.find(
        User,
        {
          $filter: { name: 'something', creatorId: 123 },
          $limit: 1,
        },
        ['id'],
      ),
    ).toBe("SELECT `id` FROM `User` WHERE `name` = 'something' AND `creatorId` = 123 LIMIT 1");

    expect(
      this.dialect.find(
        User,
        {
          $limit: 25,
        },
        ['id', 'name', 'creatorId'],
      ),
    ).toBe('SELECT `id`, `name`, `creatorId` FROM `User` LIMIT 25');
  }

  shouldFind$skip() {
    expect(
      this.dialect.find(
        User,
        {
          $skip: 30,
        },
        { id: 1, name: 1, creatorId: 1 },
      ),
    ).toBe('SELECT `id`, `name`, `creatorId` FROM `User` OFFSET 30');
  }

  shouldFind$project() {
    expect(this.dialect.find(User, {}, { password: false })).toBe(
      'SELECT `id`, `companyId`, `creatorId`, `createdAt`, `updatedAt`, `name`, `email` FROM `User`',
    );

    expect(this.dialect.find(User, {}, { name: 0, password: 0 })).toBe(
      'SELECT `id`, `companyId`, `creatorId`, `createdAt`, `updatedAt`, `email` FROM `User`',
    );

    expect(this.dialect.find(User, {}, { id: 1, name: 1, password: 0 })).toBe('SELECT `id`, `name` FROM `User`');

    expect(this.dialect.find(User, {}, { id: 1, name: 0, password: 0 })).toBe('SELECT `id` FROM `User`');

    expect(
      this.dialect.find(
        User,
        {
          $filter: { name: 'something' },
        },
        [raw('*'), raw('LOG10(numberOfVotes + 1) * 287014.5873982681 + createdAt', 'hotness')],
      ),
    ).toBe(
      "SELECT *, LOG10(numberOfVotes + 1) * 287014.5873982681 + createdAt `hotness` FROM `User` WHERE `name` = 'something'",
    );
  }

  shouldDelete() {
    expect(this.dialect.delete(User, { $filter: 123 })).toBe('DELETE FROM `User` WHERE `id` = 123');
    expect(() => this.dialect.delete(User, { $filter: 123 }, { softDelete: true })).toThrow(
      "'User' has not enabled 'softDelete'",
    );
    expect(this.dialect.delete(User, { $filter: 123 }, { softDelete: false })).toBe(
      'DELETE FROM `User` WHERE `id` = 123',
    );
    expect(this.dialect.delete(MeasureUnit, { $filter: 123 })).toMatch(
      /^UPDATE `MeasureUnit` SET `deletedAt` = \d+ WHERE `id` = 123 AND `deletedAt` IS NULL$/,
    );
    expect(this.dialect.delete(MeasureUnit, { $filter: 123 }, { softDelete: true })).toMatch(
      /^UPDATE `MeasureUnit` SET `deletedAt` = \d+ WHERE `id` = 123 AND `deletedAt` IS NULL$/,
    );
    expect(this.dialect.delete(MeasureUnit, { $filter: 123 }, { softDelete: false })).toBe(
      'DELETE FROM `MeasureUnit` WHERE `id` = 123',
    );
  }

  shouldFind$projectRaw() {
    expect(
      this.dialect.find(
        User,
        {
          $filter: { name: 'something' },
        },
        [raw(() => 'createdAt', 'hotness')],
      ),
    ).toBe("SELECT createdAt `hotness` FROM `User` WHERE `name` = 'something'");

    expect(
      this.dialect.find(
        User,
        {
          $filter: { name: 'something' },
        },
        [raw('*'), raw('LOG10(numberOfVotes + 1) * 287014.5873982681 + createdAt', 'hotness')],
      ),
    ).toBe(
      "SELECT *, LOG10(numberOfVotes + 1) * 287014.5873982681 + createdAt `hotness` FROM `User` WHERE `name` = 'something'",
    );
  }

  shouldFind$filterRaw() {
    expect(
      this.dialect.find(
        Item,
        {
          $filter: { $and: [{ companyId: 1 }, raw('SUM(salePrice) > 500')] },
        },
        ['creatorId'],
      ),
    ).toBe('SELECT `creatorId` FROM `Item` WHERE `companyId` = 1 AND SUM(salePrice) > 500');

    expect(
      this.dialect.find(
        Item,
        {
          $filter: { $or: [{ companyId: 1 }, 5, raw('SUM(salePrice) > 500')] },
        },
        ['id'],
      ),
    ).toBe('SELECT `id` FROM `Item` WHERE `companyId` = 1 OR `id` = 5 OR SUM(salePrice) > 500');

    expect(
      this.dialect.find(
        Item,
        {
          $filter: { $or: [1, raw('SUM(salePrice) > 500')] },
        },
        ['id'],
      ),
    ).toBe('SELECT `id` FROM `Item` WHERE `id` = 1 OR SUM(salePrice) > 500');

    expect(
      this.dialect.find(
        Item,
        {
          $filter: { $or: [raw('SUM(salePrice) > 500'), 1, { companyId: 1 }] },
        },
        ['id'],
      ),
    ).toBe('SELECT `id` FROM `Item` WHERE SUM(salePrice) > 500 OR `id` = 1 OR `companyId` = 1');

    expect(
      this.dialect.find(
        Item,
        {
          $filter: { $and: [raw('SUM(salePrice) > 500')] },
        },
        ['id'],
      ),
    ).toBe('SELECT `id` FROM `Item` WHERE SUM(salePrice) > 500');

    expect(
      this.dialect.find(
        Item,
        {
          $filter: raw('SUM(salePrice) > 500'),
        },
        ['id'],
      ),
    ).toBe('SELECT `id` FROM `Item` WHERE SUM(salePrice) > 500');

    expect(
      this.dialect.find(
        Item,
        {
          $filter: { $or: [[1, 2], { code: 'abc' }] },
        },
        ['creatorId'],
      ),
    ).toBe("SELECT `creatorId` FROM `Item` WHERE `id` IN (1, 2) OR `code` = 'abc'");
  }

  shouldFind$startsWith() {
    expect(
      this.dialect.find(
        User,
        {
          $filter: { name: { $startsWith: 'Some' } },
          $sort: [
            { field: 'name', sort: 'asc' },
            { field: 'createdAt', sort: 'desc' },
          ],
          $skip: 0,
          $limit: 50,
        },
        ['id'],
      ),
    ).toBe("SELECT `id` FROM `User` WHERE `name` LIKE 'Some%' ORDER BY `name`, `createdAt` DESC LIMIT 50 OFFSET 0");

    expect(
      this.dialect.find(
        User,
        {
          $filter: { name: { $startsWith: 'Some', $ne: 'Something' } },
          $sort: { name: 1, id: -1 },
          $skip: 0,
          $limit: 50,
        },
        { id: true },
      ),
    ).toBe(
      "SELECT `id` FROM `User` WHERE (`name` LIKE 'Some%' AND `name` <> 'Something') ORDER BY `name`, `id` DESC LIMIT 50 OFFSET 0",
    );
  }

  shouldFind$istartsWith() {
    expect(
      this.dialect.find(
        User,
        {
          $filter: { name: { $istartsWith: 'Some' } },
          $sort: { name: 1, id: -1 },
          $skip: 0,
          $limit: 50,
        },
        ['id'],
      ),
    ).toBe("SELECT `id` FROM `User` WHERE LOWER(`name`) LIKE 'some%' ORDER BY `name`, `id` DESC LIMIT 50 OFFSET 0");

    expect(
      this.dialect.find(
        User,
        {
          $filter: { name: { $istartsWith: 'Some', $ne: 'Something' } },
          $sort: { name: 1, id: -1 },
          $skip: 0,
          $limit: 50,
        },
        { id: true },
      ),
    ).toBe(
      "SELECT `id` FROM `User` WHERE (LOWER(`name`) LIKE 'some%' AND `name` <> 'Something') ORDER BY `name`, `id` DESC LIMIT 50 OFFSET 0",
    );
  }

  shouldFind$endsWith() {
    expect(
      this.dialect.find(
        User,
        {
          $filter: { name: { $endsWith: 'Some' } },
          $sort: { name: 1, id: -1 },
          $skip: 0,
          $limit: 50,
        },
        ['id'],
      ),
    ).toBe("SELECT `id` FROM `User` WHERE `name` LIKE '%Some' ORDER BY `name`, `id` DESC LIMIT 50 OFFSET 0");

    expect(
      this.dialect.find(
        User,
        {
          $filter: { name: { $endsWith: 'Some', $ne: 'Something' } },
          $sort: { name: 1, id: -1 },
          $skip: 0,
          $limit: 50,
        },
        ['id'],
      ),
    ).toBe(
      "SELECT `id` FROM `User` WHERE (`name` LIKE '%Some' AND `name` <> 'Something') ORDER BY `name`, `id` DESC LIMIT 50 OFFSET 0",
    );
  }

  shouldFind$iendsWith() {
    expect(
      this.dialect.find(
        User,
        {
          $filter: { name: { $iendsWith: 'Some' } },
          $sort: { name: 1, id: -1 },
          $skip: 0,
          $limit: 50,
        },
        ['id'],
      ),
    ).toBe("SELECT `id` FROM `User` WHERE LOWER(`name`) LIKE '%some' ORDER BY `name`, `id` DESC LIMIT 50 OFFSET 0");

    expect(
      this.dialect.find(
        User,
        {
          $filter: { name: { $iendsWith: 'Some', $ne: 'Something' } },
          $sort: { name: 1, id: -1 },
          $skip: 0,
          $limit: 50,
        },
        ['id'],
      ),
    ).toBe(
      "SELECT `id` FROM `User` WHERE (LOWER(`name`) LIKE '%some' AND `name` <> 'Something') ORDER BY `name`, `id` DESC LIMIT 50 OFFSET 0",
    );
  }

  shouldFind$includes() {
    expect(
      this.dialect.find(
        User,
        {
          $filter: { name: { $includes: 'Some' } },
          $sort: { name: 1, id: -1 },
          $skip: 0,
          $limit: 50,
        },
        ['id'],
      ),
    ).toBe("SELECT `id` FROM `User` WHERE `name` LIKE '%Some%' ORDER BY `name`, `id` DESC LIMIT 50 OFFSET 0");

    expect(
      this.dialect.find(
        User,
        {
          $filter: { name: { $includes: 'Some', $ne: 'Something' } },
          $sort: { name: 1, id: -1 },
          $skip: 0,
          $limit: 50,
        },
        ['id'],
      ),
    ).toBe(
      "SELECT `id` FROM `User` WHERE (`name` LIKE '%Some%' AND `name` <> 'Something') ORDER BY `name`, `id` DESC LIMIT 50 OFFSET 0",
    );
  }

  shouldFind$iincludes() {
    expect(
      this.dialect.find(
        User,
        {
          $filter: { name: { $iincludes: 'Some' } },
          $sort: { name: 1, id: -1 },
          $skip: 0,
          $limit: 50,
        },
        ['id'],
      ),
    ).toBe("SELECT `id` FROM `User` WHERE LOWER(`name`) LIKE '%some%' ORDER BY `name`, `id` DESC LIMIT 50 OFFSET 0");

    expect(
      this.dialect.find(
        User,
        {
          $filter: { name: { $iincludes: 'Some', $ne: 'Something' } },
          $sort: { name: 1, id: -1 },
          $skip: 0,
          $limit: 50,
        },
        ['id'],
      ),
    ).toBe(
      "SELECT `id` FROM `User` WHERE (LOWER(`name`) LIKE '%some%' AND `name` <> 'Something') ORDER BY `name`, `id` DESC LIMIT 50 OFFSET 0",
    );
  }

  shouldFind$like() {
    expect(
      this.dialect.find(
        User,
        {
          $filter: { name: { $like: 'Some' } },
          $sort: { name: 1, id: -1 },
          $skip: 0,
          $limit: 50,
        },
        ['id'],
      ),
    ).toBe("SELECT `id` FROM `User` WHERE `name` LIKE 'Some' ORDER BY `name`, `id` DESC LIMIT 50 OFFSET 0");

    expect(
      this.dialect.find(
        User,
        {
          $filter: { name: { $like: 'Some', $ne: 'Something' } },
          $sort: { name: 1, id: -1 },
          $skip: 0,
          $limit: 50,
        },
        { id: true },
      ),
    ).toBe(
      "SELECT `id` FROM `User` WHERE (`name` LIKE 'Some' AND `name` <> 'Something') ORDER BY `name`, `id` DESC LIMIT 50 OFFSET 0",
    );
  }

  shouldFind$ilike() {
    expect(
      this.dialect.find(
        User,
        {
          $filter: { name: { $ilike: 'Some' } },
          $sort: { name: 1, id: -1 },
          $skip: 0,
          $limit: 50,
        },
        ['id'],
      ),
    ).toBe("SELECT `id` FROM `User` WHERE LOWER(`name`) LIKE 'some' ORDER BY `name`, `id` DESC LIMIT 50 OFFSET 0");

    expect(
      this.dialect.find(
        User,
        {
          $filter: { name: { $ilike: 'Some', $ne: 'Something' } },
          $sort: { name: 1, id: -1 },
          $skip: 0,
          $limit: 50,
        },
        { id: true },
      ),
    ).toBe(
      "SELECT `id` FROM `User` WHERE (LOWER(`name`) LIKE 'some' AND `name` <> 'Something') ORDER BY `name`, `id` DESC LIMIT 50 OFFSET 0",
    );
  }

  shouldFind$regex() {
    expect(
      this.dialect.find(
        User,
        {
          $filter: { name: { $regex: '^some' } },
        },
        ['id'],
      ),
    ).toBe("SELECT `id` FROM `User` WHERE `name` REGEXP '^some'");
  }

  shouldFind$text() {
    expect(
      this.dialect.find(
        Item,
        {
          $filter: { $text: { $fields: ['name', 'description'], $value: 'some text' }, companyId: 1 },
          $limit: 30,
        },
        { id: true },
      ),
    ).toBe(
      "SELECT `id` FROM `Item` WHERE MATCH(`name`, `description`) AGAINST('some text') AND `companyId` = 1 LIMIT 30",
    );

    expect(
      this.dialect.find(
        User,
        {
          $filter: {
            $text: { $fields: ['name'], $value: 'something' },
            name: { $ne: 'other unwanted' },
            companyId: 1,
          },
          $limit: 10,
        },
        { id: 1 },
      ),
    ).toBe(
      "SELECT `id` FROM `User` WHERE MATCH(`name`) AGAINST('something') AND `name` <> 'other unwanted' AND `companyId` = 1 LIMIT 10",
    );
  }
}
