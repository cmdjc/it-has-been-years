export function createScheduler() {
  let now = 0;
  let nextId = 1;
  let pending = new Map();

  const nextDue = (limit) => {
    let best = null;
    for (const [id, entry] of pending) {
      if (entry.due > limit) continue;
      if (best === null || entry.due < best.entry.due || (entry.due === best.entry.due && id < best.id)) best = { id, entry };
    }
    return best;
  };

  return {
    get now() {
      return now;
    },
    after(sec, fn) {
      const id = nextId++;
      pending.set(id, { due: now + sec, fn });
      return id;
    },
    cancel(id) {
      pending.delete(id);
    },
    clear() {
      pending = new Map();
    },
    advance(dt) {
      const target = now + dt;
      for (let next = nextDue(target); next !== null; next = nextDue(target)) {
        pending.delete(next.id);
        now = Math.max(now, next.entry.due);
        next.entry.fn();
      }
      now = target;
    },
  };
}
