import { AsyncLocalStorage } from 'node:async_hooks';

const storage = new AsyncLocalStorage<unknown>();

/** Run `callback` with `tx` as the current transaction: repositories pick it up with getTx(). */
export function runInTransaction<R>(tx: unknown, callback: () => Promise<R>): Promise<R> {
  return storage.run(tx, callback);
}

/** The transaction of the current async context, or undefined outside of runInTransaction. */
export function getTx<T = unknown>(): T | undefined {
  return storage.getStore() as T | undefined;
}
