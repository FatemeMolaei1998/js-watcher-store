import { Watcher } from './watcher.js';

const defaultSerialize = (value, key) => ({ key, value });
const defaultDeserialize = (record, store) => store.add(record.key, record.value);

export class Store {
  constructor(name, options = {}) {
    this.name = name;
    this._items = new Map();
    this._watcher = new Watcher(this);

    this._storage =
      options.storage ?? (typeof localStorage !== 'undefined' ? localStorage : undefined);
    this._serialize = options.serialize ?? defaultSerialize;
    this._deserialize = options.deserialize ?? defaultDeserialize;
  }

  add(key, value) {
    this._items.set(key, value);
    this._watcher.raise('add', { name: 'add', key, value });
    return this;
  }

  get(key) {
    return this._items.get(key);
  }

  has(key) {
    return this._items.has(key);
  }

  delete(key) {
    if (!this._items.has(key)) return this;

    const value = this._items.get(key);
    this._items.delete(key);
    this._watcher.raise('delete', { name: 'delete', key, value });
    return this;
  }

  clear() {
    this._items.clear();
    this._watcher.raise('clear', { name: 'clear' });
    return this;
  }

  get size() {
    return this._items.size;
  }

  sum(fn) {
    let total = 0;
    for (const [key, value] of this._items) {
      total += fn(value, key);
    }
    return total;
  }

  forEach(fn) {
    for (const [key, value] of this._items) {
      fn(value, key);
    }
  }

  some(fn) {
    for (const [key, value] of this._items) {
      if (fn(value, key)) return true;
    }
    return false;
  }

  watch(eventName, fn) {
    return this._watcher.watch(eventName, fn);
  }

  save() {
    if (!this._storage) return;

    const records = [];
    for (const [key, value] of this._items) {
      const record = this._serialize(value, key);
      if (record === null || record === undefined || record === false) continue;
      records.push(record);
    }

    this._storage.setItem(this.name, JSON.stringify(records));
  }

  load() {
    if (!this._storage) return;

    const raw = this._storage.getItem(this.name);
    if (raw === null || raw === undefined) return;

    let records;
    try {
      records = JSON.parse(raw);
    } catch {
      return;
    }

    if (!Array.isArray(records)) return;

    for (const record of records) {
      this._deserialize(record, this);
    }
  }
}
