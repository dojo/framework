import { Iterable } from 'dojo-shim/iterator';
import Promise, { Executor, State, isThenable } from 'dojo-shim/Promise';
import { Thenable } from 'dojo-shim/interfaces';

/* tslint:disable-next-line:variable-name */
export const Canceled = <State> 4;

/**
 * A type guard that determines if `value` is a `Task`
 * @param value The value to guard
 */
export function isTask<T>(value: any): value is Task<T> {
	return Boolean(value && typeof value.cancel === 'function' && Array.isArray(value.children) && isThenable(value));
}

/**
 * Task is an extension of Promise that supports cancelation.
 */
export default class Task<T> extends Promise<T> {
	static all<T>(iterator: Iterable<(T | Thenable<T>)> | (T | Thenable<T>)[]): Task<T[]> {
		return <any> super.all(iterator);
	}

	static race<T>(iterator: Iterable<(T | Thenable<T>)> | (T | Thenable<T>)[]): Task<T> {
		return <any> super.race(iterator);
	}

	static reject<T>(reason: Error): Task<any> {
		return <any> super.reject(reason);
	}

	static resolve(): Task<void>;
	static resolve<T>(value: (T | Thenable<T>)): Task<T>;
	static resolve<T>(value?: any): Task<T> {
		return new this((resolve) => {
			resolve(value);
		});
	}

	protected static copy<U>(other: Promise<U>): Task<U> {
		const task = <Task<U>> super.copy(other);
		task.children = [];
		task.canceler = other instanceof Task ? other.canceler : function () {};
		return task;
	}

	constructor(executor: Executor<T>, canceler?: () => void) {
		super((resolve, reject) => {
			// Don't let the Task resolve if it's been canceled
			executor(
				(value) => {
					if (this._state === Canceled) {
						return;
					}
					resolve(value);
				},
				(reason) => {
					if (this._state === Canceled) {
						return;
					}
					reject(reason);
				}
			);
		});

		this.children = [];
		this.canceler = () => {
			if (canceler) {
				canceler();
			}
			this._cancel();
		};
	}

	/**
	 * A cancelation handler that will be called if this task is canceled.
	 */
	private canceler: () => void;

	/**
	 * Children of this Task (i.e., Tasks that were created from this Task with `then` or `catch`).
	 */
	private children: Task<any>[];

	/**
	 * The finally callback for this Task (if it was created by a call to `finally`).
	 */
	private _finally: () => void | Thenable<any>;

	/**
	 * Propagates cancelation down through a Task tree. The Task's state is immediately set to canceled. If a Thenable
	 * finally task was passed in, it is resolved before calling this Task's finally callback; otherwise, this Task's
	 * finally callback is immediately executed. `_cancel` is called for each child Task, passing in the value returned
	 * by this Task's finally callback or a Promise chain that will eventually resolve to that value.
	 */
	private _cancel(finallyTask?: void | Thenable<any>): void {
		this._state = Canceled;

		const runFinally = () => {
			try {
				return this._finally();
			}
			catch (error) {
				// Any errors in a `finally` callback are completely ignored during cancelation
			}
		};

		if (this._finally) {
			if (isThenable(finallyTask)) {
				finallyTask = (<Thenable<any>> finallyTask).then(runFinally, runFinally);
			}
			else {
				finallyTask = runFinally();
			}
		}

		this.children.forEach(function (child) {
			child._cancel(finallyTask);
		});
	}

	/**
	 * Immediately cancels this task if it has not already resolved. This Task and any descendants are synchronously set
	 * to the Canceled state and any `finally` added downstream from the canceled Task are invoked.
	 */
	cancel(): void {
		if (this._state === State.Pending) {
			this.canceler();
		}
	}

	finally(callback: () => void | Thenable<any>): Task<T> {
		const task = <Task<T>> super.finally(callback);
		// Keep a reference to the callback; it will be called if the Task is canceled
		task._finally = callback;
		return task;
	}

	then<U>(onFulfilled?: (value: T | undefined) => U | Thenable<U>,  onRejected?: (error: Error | undefined) => U | Thenable<U>): Task<U> {
		// FIXME
		// tslint:disable-next-line:no-var-keyword
		var task = <Task<U>> super.then<U>(
			// Don't call the onFulfilled or onRejected handlers if this Task is canceled
			function (value) {
				if (task._state === Canceled) {
					return;
				}
				if (onFulfilled) {
					return onFulfilled(value);
				}
				return <any> value;
			},
			function (error) {
				if (task._state === Canceled) {
					return;
				}
				if (onRejected) {
					return onRejected(error);
				}
				throw error;
			}
		);

		task.canceler = () => {
			// If task's parent (this) hasn't been resolved, cancel it; downward propagation will start at the first
			// unresolved parent
			if (this._state === State.Pending) {
				this.cancel();
			}
			// If task's parent has been resolved, propagate cancelation to the task's descendants
			else {
				task._cancel();
			}
		};

		// Keep track of child Tasks for propogating cancelation back down the chain
		this.children.push(task);

		return task;
	}

	catch<U>(onRejected: (reason?: Error) => (U | Thenable<U>)): Task<U> {
		return <any> super.catch(onRejected);
	}
}
