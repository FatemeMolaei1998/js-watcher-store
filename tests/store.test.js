import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Store } from '../src/store.js';

function fakeStorage() {
  const data = new Map();
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
  };
}

test('add/get/has', () => {
  const store = new Store('cart');
  const result = store.add('a', 1);

  assert.equal(result, store);
  assert.equal(store.get('a'), 1);
  assert.equal(store.has('a'), true);
  assert.equal(store.has('b'), false);
});

test('add with an existing key replaces the value and emits "add" again', () => {
  const store = new Store('cart');
  const events = [];
  store.watch('add', (e) => events.push(e));

  store.add('a', 1);
  store.add('a', 2);

  assert.equal(store.get('a'), 2);
  assert.equal(store.size, 1);
  assert.deepEqual(
    events.map((e) => e.value),
    [1, 2],
  );
});

test('delete removes an item and emits its value, no event for missing keys', () => {
  const store = new Store('cart');
  store.add('a', 1);
  const events = [];
  store.watch('delete', (e) => events.push(e));

  store.delete('missing');
  store.delete('a');

  assert.equal(store.has('a'), false);
  assert.equal(events.length, 1);
  assert.deepEqual(events[0], { name: 'delete', key: 'a', value: 1 });
});

test('clear removes everything and emits exactly one "clear" event', () => {
  const store = new Store('cart');
  store.add('a', 1);
  store.add('b', 2);
  let clearEvents = 0;
  let deleteEvents = 0;
  store.watch('clear', () => clearEvents++);
  store.watch('delete', () => deleteEvents++);

  store.clear();

  assert.equal(store.size, 0);
  assert.equal(clearEvents, 1);
  assert.equal(deleteEvents, 0);
});

test('sum, forEach and some', () => {
  const store = new Store('cart');
  store.add('a', 1).add('b', 2).add('c', 3);

  assert.equal(
    store.sum((value) => value),
    6,
  );

  const seen = [];
  store.forEach((value, key) => seen.push([key, value]));
  assert.deepEqual(seen, [
    ['a', 1],
    ['b', 2],
    ['c', 3],
  ]);

  assert.equal(
    store.some((value) => value > 2),
    true,
  );
  assert.equal(
    store.some((value) => value > 10),
    false,
  );
});

test('save writes serialized records, skipping ones serialize opts out of', () => {
  const storage = fakeStorage();
  const store = new Store('cart', {
    storage,
    serialize: (value, key) => (value.hidden ? false : { key, value: value.name }),
  });
  store.add('a', { name: 'apple', hidden: false });
  store.add('b', { name: 'secret', hidden: true });

  store.save();

  assert.deepEqual(JSON.parse(storage.getItem('cart')), [{ key: 'a', value: 'apple' }]);
});

test('save writes an empty array when there is nothing to persist', () => {
  const storage = fakeStorage();
  const store = new Store('cart', { storage });

  store.save();

  assert.equal(storage.getItem('cart'), '[]');
});

test('load restores records in stored order using deserialize', () => {
  const storage = fakeStorage();
  storage.setItem(
    'cart',
    JSON.stringify([
      { key: 'a', value: 1 },
      { key: 'b', value: 2 },
    ]),
  );
  const store = new Store('cart', { storage });

  store.load();

  assert.deepEqual([...store._items], [
    ['a', 1],
    ['b', 2],
  ]);
});

test('load does nothing when there is no stored data', () => {
  const storage = fakeStorage();
  const store = new Store('cart', { storage });
  store.add('a', 1);

  store.load();

  assert.equal(store.size, 1);
  assert.equal(store.get('a'), 1);
});

test('load leaves the store unchanged when the stored JSON is invalid', () => {
  const storage = fakeStorage();
  storage.setItem('cart', '{not valid json');
  const store = new Store('cart', { storage });
  store.add('a', 1);

  assert.doesNotThrow(() => store.load());

  assert.equal(store.size, 1);
  assert.equal(store.get('a'), 1);
});
