import { Thenable } from 'dojo-shim/interfaces';
import { Executor } from 'dojo-shim/Promise';
import ExtensiblePromise from './ExtensiblePromise';

/**
 * Describe the internal state of a task.
 */
export declare const enum State {
	Fulfilled = 0,
	Pending = 1,
	Rejected = 2,
	Canceled = 3
}

/**
 * A type guard that determines if `value` is a `Task`
 * @param value The value to guard
 */
export function isTask<T>(value: any): value is Task<T> {
	return Boolean(value && typeof value.cancel === 'function' && Array.isArray(value.children) && isThenable(value));
}

/**
 * Returns true if a given value has a `then` method.
 * @param {any} value The value to check if is Thenable
 * @returns {is Thenable<T>} A type guard if the value is thenable
 */
export function isThenable<T>(value: any): value is Thenable<T> {
	return value && typeof value.then === 'function';
}

/**
 * Task is an extension of Promise that supports cancellation and the Task#finally method.
 */
export default class Task<T> extends ExtensiblePromise<T> {
	/**
	 * Return a resolved task.
	 *
	 * @param value The value to resolve with
	 *
	 * @return {Task}
	 */
	public static resolve(): Task<void>;
	public static resolve<T>(value: (T | Thenable<T>)): Task<T>;
	public static resolve<T>(value?: any): Task<T> {
		return new this<T>((resolve, reject) => resolve(value));
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
	 * The state of the task
	 */
	protected _state: State;

	get state() {
		return this._state;
	}

	/**
	 * @constructor
	 *
	 * Create a new task. Executor is run immediately. The canceler will be called when the task is canceled.
	 *
	 * @param executor Method that initiates some task
	 * @param canceler Method to call when the task is canceled
	 *
	 */
	constructor(executor: Executor<T>, canceler?: () => void) {
		// we have to initialize these to avoid a compiler error of using them before they are initialized
		let superResolve: (value?: T | Thenable<T> | undefined) => void = () => {};
		let superReject: (reason?: any) => void = () => {};

		super((resolve, reject) => {
			superResolve = resolve;
			superReject = reject;
		});

		this._state = State.Pending;

		this.children = [];
		this.canceler = () => {
			if (canceler) {
				canceler();
			}
			this._cancel();
		};

		// Don't let the Task resolve if it's been canceled
		try {
			executor(
				(value) => {
					if (this._state === State.Canceled) {
						return;
					}
					this._state = State.Fulfilled;
					superResolve(value);
				},
				(reason) => {
					if (this._state === State.Canceled) {
						return;
					}
					this._state = State.Rejected;
					superReject(reason);
				}
			);
		}
		catch (reason) {
			this._state = State.Rejected;
			superReject(reason);
		}
	}

	/**
	 * Propagates cancellation down through a Task tree. The Task's state is immediately set to canceled. If a Thenable
	 * finally task was passed in, it is resolved before calling this Task's finally callback; otherwise, this Task's
	 * finally callback is immediately executed. `_cancel` is called for each child Task, passing in the value returned
	 * by this Task's finally callback or a Promise chain that will eventually resolve to that value.
	 */
	private _cancel(finallyTask?: void | Thenable<any>): void {
		this._state = State.Canceled;

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

	/**
	 * Allows for cleanup actions to be performed after resolution of a Promise.
	 */
	finally(callback: () => void | Thenable<any>): Task<T> {
		// if this task is already canceled, call the task
		if (this._state === State.Canceled) {
			return Task.resolve(callback());
		}

		const task = this.then<any>(
			value => Task.resolve(callback()).then(() => value),
			reason => Task.resolve(callback()).then(() => {
				throw reason;
			})
		);

		// Keep a reference to the callback; it will be called if the Task is canceled
		task._finally = callback;
		return task;
	}

	/**
	 * Adds a callback to be invoked when the Task resolves or is rejected.
	 *
	 * @param {Function} onFulfilled   A function to call to handle the resolution. The paramter to the function will be the resolved value, if any.
	 * @param {Function} onRejected    A function to call to handle the error. The parameter to the function will be the caught error.
	 *
	 * @returns {ExtensiblePromise}
	 */
	then<U>(onFulfilled?: (value?: T) => U | Thenable<U>, onRejected?: (error: Error) => U | Thenable<U>): this {
		// FIXME
		// tslint:disable-next-line:no-var-keyword
		var task = super.then<U>(
			// Don't call the onFulfilled or onRejected handlers if this Task is canceled
			function (value) {
				if (task._state === State.Canceled) {
					return;
				}
				if (onFulfilled) {
					return onFulfilled(value);
				}
				return <any> value;
			},
			function (error) {
				if (task._state === State.Canceled) {
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
}
