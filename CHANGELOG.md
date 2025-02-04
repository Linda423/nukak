# Changelog

All notable changes to this project will be documented in this file. Please add new changes to the top.

date format is [yyyy-mm-dd]

## [0.4.0] - 2023-11-06

- move project inside query parameter [#63](https://github.com/rogerpadilla/nukak/pull/63)

## [0.3.3] - 2023-10-25

- Update usage example in the README.md.

## [0.3.2] - 2023-10-24

- Improve usage examples in the README.md, and make the overview section more concise.

## [0.3.1] - 2023-10-19

1. Remove `$group` and `$having` as they detriment type safety as currently implemented (support may be redesigned later if required).
2. Improve type safety of `$project` operator.
3. Improve type safety of `$filter` operator.
4. Remove projection operators (`$count`, `$min`, `$max`, `$min`, and `$sum`) as they detriment type safety as currently implemented. This can be done via Virtual fields instead as currently supported for better type safety.

## [0.3.0] - 2023-10-18

- Add support for `transaction` operations using a QuerierPool.
  Automatically wraps the code of the callback inside a transaction, and auto-releases the querier after running.
- Update dependencies.

  ```ts
  const ids = await querierPool.transaction(async (querier) => {
    const data = await querier.findMany(...);
    const ids = await querier.insertMany(...);
    return ids;
  });
  ```

## [0.2.21] 2023-04-15

- fix(nukak-browser): check if ids are returned before use $in to delete them.

- Reuse community open-source npm packages to escape literal-values according to each DB vendor.

## [0.2.0] 2023-01-02

- Move projection to a new parameter to improve type inference of the results.

- Support dynamic operations while projecting fields, and move `$project` as an independent parameter in the `find*` functions [#55](https://github.com/rogerpadilla/nukak/pull/55).
