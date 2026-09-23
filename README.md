# Watcher & Store

This is my submission for the Watcher + Store part of the take-home. I left
out the cafe ordering app on purpose — the task said to focus on this two
pieces, so that's what I spent my time on.

Two classes, plain JS, no libraries, no build step:

- `src/watcher.js` — wraps an object and fires an event when one of its
  properties actually change.
- `src/store.js` — a key/value collection built on top of Watcher, with
  save/load.

Tests are living next to them in `tests/`, one file per class.

## How it works

Watcher takes an object (target) and gives you get/set for its
properties. set checks the new value against what's already there using
===; if it's same, nothing happens and it returns false. If it's
different, it writes the value first, then run whatever listeners are
registered for that property name, in the order they were added.

Store is a Map under the hood — it doesn't use Watcher's get/set,
those are really meant for single property, not a whole collection of keys.
What it does borrow from Watcher is the event handling: Store makes its
own Watcher internally (new Watcher(this)) and use that for
watch()/add/delete/clear events, instead of me writing the whole
listener/unwatch thing a second time again. Bonus of doing it this way:
since the watcher's target is the store itself, `this` inside a store
listener is the store, which is what I want as a user of this.

## My personal decisions that were open in the doc

There were a handful of things the brief didn't pin down. I went with the
most simple option I could defend in each case, not the most clever one.

If a listener throw, I catch it and log it with `console.error`, then keep
going to the next listener. Otherwise, one broken listener could be stop
everyone else downstream from finding out about a change that already
happened.

If a listener add or remove another listener while an event is being
handled, I dispatch over a copy of the listener array that I take right
before the loop start. So a change made mid-dispatch only affect the next
time that event fires, not the one that currently running. This seemed like
the option that less likely to surprise someone.

For equality, I used ===, straight from the doc. Worth to flag: that means
setting NaN when the value is already NaN still count as a change
(NaN === NaN is false), and swap in a new array/object with same
contents count as a change too, because it's comparing the references. I
didn't add deep equality — it wasn't asked, and it needed a lot more than an hour.

Calling add() with a key that already in the store overwrite the old value
and fire add again. Basically same behavior like Map.set. I didn't like
the alternative of throw an error (too strict for a simple store) or keeping
the old value silently (that one is worse, honestly — you call add(), it
returns this like it worked, and your new value just gone).

load() merge into whatever already in the store rather than clear it
first — it just replay the saved records through add(). If I make it
clear the store automatically that's a pretty surprising side effect for a
method who's whole job is restore what was saved.

I already answer this above but to spell it out: Store reuse Watcher for
its events instead of have its own separate listener system. No reason to
maintain same logic on two place.

Persistence is fully manual — nothing call save() for you. add,
delete and clear never touch the storage by their own. Auto-saving on
every mutation would mean re-serialize the whole store on every single
add() call, which felt like a bad default even if it's more
comfortable.

## Tests

Just `node:test`, nothing is installed for it. I covered the things that
listed as required in the doc — get/set, the event payload shape, listener
order, `this` binding, unwatch (including call it twice), add/delete/clear,
size, save/load, and what happen with broken JSON — plus a couple of the
decisions above where the behavior is not obvious just from reading the
spec (duplicate key on add, a listener that throw without taking down the
others).

I keep it to that. I didn't try to chase full coverage or test every
possible combination — just enough for show that the code actually works.

## Running it

```
npm test
```

## What's not handled

- No infinite-loop protection if a listener keep re-triggering its own event.
- If there is no storage (no localStorage around, and nothing passed in),
  save()/load() do nothing quietly instead of throw an error.
- The default serialize/deserialize is just JSON.stringify/JSON.parse,
  so anything that not survive JSON (functions, Maps, etc.) need a custom
  serialize/deserialize to be passed.

## If I had more time

I would want a test that cover specifically a listener removing another
listener mid-dispatch — that's the one behavior here that's most hard to
verify just from reading the code. I would also look for add a optional
batched save mode, but I didn't want to change the default behavior from
what the doc actually ask for.
