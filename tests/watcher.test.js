import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Watcher } from '../src/watcher.js';

test('get returns the current property value', () => {
  const watcher = new Watcher({ price: 10 });
  assert.equal(watcher.get('price'), 10);
});

test('set updates the value and returns true when the value changes', () => {
  const watcher = new Watcher({ price: 10 });
  const changed = watcher.set('price', 20);

  assert.equal(changed, true);
  assert.equal(watcher.target.price, 20);
});

test('set does nothing and returns false for a strictly equal value', () => {
  const watcher = new Watcher({ price: 10 });
  let called = false;
  watcher.watch('price', () => (called = true));

  const changed = watcher.set('price', 10);

  assert.equal(changed, false);
  assert.equal(called, false);
});

test('set emits an event with name/watcher/target/then/now', () => {
  const target = { price: 10 };
  const watcher = new Watcher(target);
  let event;
  watcher.watch('price', (e) => (event = e));

  watcher.set('price', 20);

  assert.deepEqual(event, {
    name: 'price',
    watcher,
    target,
    then: 10,
    now: 20,
  });
});

test('listeners run in registration order', () => {
  const watcher = new Watcher({ price: 10 });
  const order = [];
  watcher.watch('price', () => order.push('first'));
  watcher.watch('price', () => order.push('second'));

  watcher.set('price', 20);

  assert.deepEqual(order, ['first', 'second']);
});

test('normal function listeners are bound to watcher.target', () => {
  const target = { price: 10 };
  const watcher = new Watcher(target);
  let self;
  watcher.watch('price', function () {
    self = this;
  });

  watcher.set('price', 20);

  assert.equal(self, target);
});

test('unwatch removes the listener', () => {
  const watcher = new Watcher({ price: 10 });
  let calls = 0;
  const unwatch = watcher.watch('price', () => calls++);

  unwatch();
  watcher.set('price', 20);

  assert.equal(calls, 0);
});

test('calling unwatch multiple times is safe', () => {
  const watcher = new Watcher({ price: 10 });
  const unwatch = watcher.watch('price', () => {});

  assert.doesNotThrow(() => {
    unwatch();
    unwatch();
    unwatch();
  });
});

test('raise emits a custom event and is a no-op without listeners', () => {
  const watcher = new Watcher({});
  let received;
  watcher.watch('custom', (payload) => (received = payload));

  assert.doesNotThrow(() => watcher.raise('unheard', { any: 'thing' }));

  watcher.raise('custom', { any: 'thing' });
  assert.deepEqual(received, { any: 'thing' });
});

test('a throwing listener does not stop later listeners from running', () => {
  const watcher = new Watcher({ price: 10 });
  let secondRan = false;
  watcher.watch('price', () => {
    throw new Error('boom');
  });
  watcher.watch('price', () => (secondRan = true));

  assert.doesNotThrow(() => watcher.set('price', 20));
  assert.equal(secondRan, true);
});
