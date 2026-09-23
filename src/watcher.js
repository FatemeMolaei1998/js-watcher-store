export class Watcher {
  constructor(target, listeners = {}) {
    this.target = target;
    this._listeners = new Map();

    for (const [eventName, fn] of Object.entries(listeners)) {
      this.watch(eventName, fn);
    }
  }

  get(prop) {
    return this.target[prop];
  }

  set(prop, value) {
    const then = this.target[prop];

    if (value === then) {
      return false;
    }

    this.target[prop] = value;

    this._dispatch(prop, {
      name: prop,
      watcher: this,
      target: this.target,
      then,
      now: value,
    });

    return true;
  }

  watch(eventName, fn) {
    if (!this._listeners.has(eventName)) {
      this._listeners.set(eventName, []);
    }

    const listeners = this._listeners.get(eventName);
    listeners.push(fn);

    let active = true;

    return () => {
      if (!active) return;
      active = false;

      const index = listeners.indexOf(fn);
      if (index !== -1) listeners.splice(index, 1);
    };
  }

  raise(eventName, payload) {
    this._dispatch(eventName, payload);
  }

  _dispatch(eventName, payload) {
    const listeners = this._listeners.get(eventName);
    if (!listeners || listeners.length === 0) return;

    // Dispatch over a snapshot so listeners added/removed mid-dispatch
    // don't change which listeners run for this particular event.
    for (const fn of listeners.slice()) {
      try {
        fn.call(this.target, payload);
      } catch (err) {
        console.error(`Watcher: listener for "${eventName}" threw`, err);
      }
    }
  }
}
