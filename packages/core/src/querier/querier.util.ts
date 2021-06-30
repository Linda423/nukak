import { EntityMeta, FieldKey, QueryProject, CascadeType, RelationKey, FieldOptions, Key } from '@uql/core/type';
import { getKeys } from '@uql/core/util';

type CallbackKey = keyof Pick<FieldOptions, 'onInsert' | 'onUpdate' | 'onDelete'>;

export function getPersistable<E>(meta: EntityMeta<E>, payload: E, callbackKey: CallbackKey): E {
  return getPersistables(meta, payload, callbackKey)[0];
}

export function getPersistables<E>(meta: EntityMeta<E>, payload: E | E[], callbackKey: CallbackKey): E[] {
  const payloads = fillOnFields(meta, payload, callbackKey);
  const persistableKeys = getKeys(payloads[0]).filter((key) => meta.fields[key]) as FieldKey<E>[];
  return payloads.map((it) =>
    persistableKeys.reduce((acc, key) => {
      acc[key] = it[key];
      return acc;
    }, {} as E)
  );
}

function fillOnFields<E>(meta: EntityMeta<E>, payload: E | E[], callbackKey: CallbackKey): E[] {
  const payloads = Array.isArray(payload) ? payload : [payload];
  const keys = getKeys(meta.fields).filter((col) => meta.fields[col][callbackKey]);
  return payloads.map((it) => {
    for (const key of keys) {
      if (it[key] === undefined) {
        it[key] = meta.fields[key][callbackKey]();
      }
    }
    return it;
  });
}

export function getPersistableRelations<E>(meta: EntityMeta<E>, payload: E, action: CascadeType): RelationKey<E>[] {
  const keys = getKeys(payload);
  return keys.filter((key) => {
    const relOpts = meta.relations[key as RelationKey<E>];
    return relOpts && isCascadable(action, relOpts.cascade);
  }) as RelationKey<E>[];
}

export function isCascadable(action: CascadeType, configuration?: boolean | readonly CascadeType[]): boolean {
  if (typeof configuration === 'boolean') {
    return configuration;
  }
  return configuration?.includes(action);
}

export function getProjectRelations<E>(meta: EntityMeta<E>, project: QueryProject<E>): RelationKey<E>[] {
  const keys = getProjectKeys(project);
  return keys.filter((key) => meta.relations[key as RelationKey<E>]) as RelationKey<E>[];
}

export function hasProjectRelations<E>(meta: EntityMeta<E>, project: QueryProject<E>): boolean {
  const keys = getProjectKeys(project);
  return keys.some((key) => meta.relations[key as RelationKey<E>]);
}

function getProjectKeys<E>(project: QueryProject<E>): Key<E>[] {
  if (Array.isArray(project)) {
    return project.filter((it) => typeof it !== 'function') as Key<E>[];
  }
  return getKeys(project).filter((key) => project[key]) as Key<E>[];
}
