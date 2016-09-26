import global from './support/global';
import has from './support/has';
import { queueMicroTask } from './support/queue';
import { Thenable } from './interfaces';
import { forOf, Iterable } from './iterator';
import './Symbol';

/**
 * The State enum represents the possible states of a promise.
 */
export const enum State {
	Fulfilled,
	Pending,
	Rejected
}

/**
 * Copies an array of values, replacing any PlatformPromises in the copy with unwrapped global.Promises. This is necessary
 * for .all and .race so that the native promise doesn't treat the PlatformPromises like generic thenables.
 */
function unwrapPromises(iterable: Iterable<any> | any[]): any[] {
	const unwrapped: any[] = [];
	forOf(iterable, function (item: any): void {
		unwrapped.push(item instanceof Promise ? item.promise : item);
	});
	return unwrapped;
}

/**
 * Executor is the interface for functions used to initialize a Promise.
 */
export interface Executor<T> {
	/**
	 * The executor for the promise
	 *
	 * @param resolve The resolver callback of the promise
	 * @param reject The rejector callback of the promise
	 */
	(resolve: (value?: T | Thenable<T>) => void, reject: (reason?: any) => void): void;
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
 * PromiseShim is a partial implementation of the ES2015 Promise specification. It relies on Promise to do some safety
 * checks such as verifying that a Promise isn't resolved with itself. This class is exported for testability, and is
 * not intended to be used directly.
 *
 * @borrows Promise.all as PromiseShim.all
 * @borrows Promise.race as PromiseShim.race
 * @borrows Promise.reject as PromiseShim.reject
 * @borrows Promise.resolve as PromiseShim.resolve
 * @borrows Promise#catch as PromiseShim#catch
 * @borrows Promise#then as PromiseShim#then
 */
export class PromiseShim<T> implements Thenable<T> {
	static all<T>(iterable: Iterable<(T | Thenable<T>)> | (T | Thenable<T>)[]): PromiseShim<T[]> {
		return new this(function (resolve, reject) {
			const values: T[] = [];
			let complete = 0;
			let total = 0;
			let populating = true;

			function fulfill(index: number, value: any): void {
				values[index] = value;
				++complete;
				finish();
			}

			function finish(): void {
				if (populating || complete < total) {
					return;
				}
				resolve(values);
			}

			function processItem(index: number, item: (T | Thenable<T>)): void {
				++total;
				if (item instanceof PromiseShim) {
					// If an item PromiseShim rejects, this PromiseShim is immediately rejected with the item
					// PromiseShim's rejection error.
					item.then(fulfill.bind(null, index), reject);
				}
				else {
					PromiseShim.resolve(item).then(fulfill.bind(null, index));
				}
			}

			let i = 0;
			forOf(iterable, function (value: T | Thenable<T>) {
				processItem(i, value);
				i++;
			});
			populating = false;

			finish();
		});
	}

	static race<T>(iterable: Iterable<(T | Thenable<T>)> | (T | Thenable<T>)[]): PromiseShim<T[]> {
		return new this(function (resolve, reject) {
			forOf(iterable, function (item: T | Thenable<T>) {
				if (item instanceof PromiseShim) {
					// If a PromiseShim item rejects, this PromiseShim is immediately rejected with the item
					// PromiseShim's rejection error.
					item.then(resolve, reject);
				}
				else {
					PromiseShim.resolve(item).then(resolve);
				}
			});
		});
	}

	static reject<T>(reason?: Error): PromiseShim<T> {
		return new this(function (resolve, reject) {
			reject(reason);
		});
	}

	static resolve(): PromiseShim<void>;
	static resolve<T>(value: (T | Thenable<T>)): PromiseShim<T>;
	static resolve<T>(value?: any): PromiseShim<T> {
		return new this(function (resolve) {
			resolve(<T> value);
		});
	}

	/**
	 * Creates a new PromiseShim.
	 *
	 * @constructor
	 *
	 * @param executor
	 * The executor function is called immediately when the PromiseShim is instantiated. It is responsible for
	 * starting the asynchronous operation when it is invoked.
	 *
	 * The executor must call either the passed `resolve` function when the asynchronous operation has completed
	 * successfully, or the `reject` function when the operation fails.
	 */
	constructor(executor: Executor<T>) {
		/**
		 * If true, the resolution of this promise is chained ("locked in") to another promise.
		 */
		let isChained = false;

		/**
		 * Whether or not this promise is in a resolved state.
		 */
		const isResolved = (): boolean => {
			return this.state !== State.Pending || isChained;
		};

		/**
		 * Callbacks that should be invoked once the asynchronous operation has completed.
		 */
		let callbacks: null | (Array<() => void>) = [];

		/**
		 * Initially pushes callbacks onto a queue for execution once this promise settles. After the promise settles,
		 * enqueues callbacks for execution on the next event loop turn.
		 */
		let whenFinished = function (callback: () => void): void {
			if (callbacks) {
				callbacks.push(callback);
			}
		};

		/**
		 * Settles this promise.
		 *
		 * @param newState The resolved state for this promise.
		 * @param {T|Error} value The resolved value for this promise.
		 */
		const settle = (newState: State, value: any): void => {
			// A promise can only be settled once.
			if (this.state !== State.Pending) {
				return;
			}

			this.state = newState;
			this.resolvedValue = value;
			whenFinished = queueMicroTask;

			// Only enqueue a callback runner if there are callbacks so that initially fulfilled Promises don't have to
			// wait an extra turn.
			if (callbacks && callbacks.length > 0) {
				queueMicroTask(function (): void {
					if (callbacks) {
						let count = callbacks.length;
						for (let i = 0; i < count; ++i) {
							callbacks[i].call(null);
						}
						callbacks = null;
					}
				});
			}
		};

		/**
		 * Resolves this promise.
		 *
		 * @param newState The resolved state for this promise.
		 * @param {T|Error} value The resolved value for this promise.
		 */
		const resolve = (newState: State, value: any): void => {
			if (isResolved()) {
				return;
			}

			if (isThenable(value)) {
				value.then(
					settle.bind(null, State.Fulfilled),
					settle.bind(null, State.Rejected)
				);
				isChained = true;
			}
			else {
				settle(newState, value);
			}
		};

		this.then = <U>(
			onFulfilled?: (value?: T) => (U | PromiseShim<U>),
			onRejected?: (reason?: Error) => (U | PromiseShim<U>)
		): PromiseShim<U> => {
			return new PromiseShim<U>((resolve, reject) => {
				// whenFinished initially queues up callbacks for execution after the promise has settled. Once the
				// promise has settled, whenFinished will schedule callbacks for execution on the next turn through the
				// event loop.
				whenFinished(() => {
					const callback: ((value?: any) => any) | undefined = this.state === State.Rejected ? onRejected : onFulfilled;

					if (typeof callback === 'function') {
						try {
							resolve(callback(this.resolvedValue));
						}
						catch (error) {
							reject(error);
						}
					}
					else if (this.state === State.Rejected) {
						reject(this.resolvedValue);
					}
					else {
						resolve(this.resolvedValue);
					}
				});
			});
		};

		try {
			(<Executor<T>> executor)(
				resolve.bind(null, State.Fulfilled),
				resolve.bind(null, State.Rejected)
			);
		}
		catch (error) {
			settle(State.Rejected, error);
		}
	}

	/**
	 * The current state of this promise.
	 */
	private state = State.Pending;

	/**
	 * The resolved value for this promise.
	 *
	 * @type {T|Error}
	 */
	private resolvedValue: any;

	then: <U>(
		onFulfilled?: (value: T) => (U | Thenable<U>),
		onRejected?: (reason: Error) => (U | Thenable<U>)
	) => PromiseShim<U>;

	[Symbol.toStringTag]: string = 'Promise';
}

/**
 * PlatformPromise is a very thin wrapper around either a native promise implementation or PromiseShim.
 */
export default class Promise<T> implements Thenable<T> {
	/**
	 * Points to the promise constructor this platform should use.
	 */
	/* tslint:disable-next-line:variable-name */
	static PromiseConstructor = has('es6-promise') ? global.Promise : PromiseShim;

	/**
	 * Converts an iterable object containing promises into a single promise that resolves to a new iterable object
	 * containing the fulfilled values of all the promises in the iterable, in the same order as the Promises in the
	 * iterable. Iterable values that are not promises are converted to promises using PromiseShim.resolve.
	 *
	 * @example
	 * PromiseShim.all([ PromiseShim.resolve('foo'), 'bar' ]).then(function (value) {
	 *     value[0] === 'foo'; // true
	 *     value[1] === 'bar'; // true
	 * });
	 *
	 * @example
	 * PromiseShim.all({
	 *     foo: PromiseShim.resolve('foo'),
	 *     bar: 'bar'
	 * }).then((value) => {
	 *     value.foo === 'foo'; // true
	 *     value.bar === 'bar'; // true
	 * });
	 */
	static all<T>(iterable: Iterable<(T | Thenable<T>)> | (T | Thenable<T>)[]): Promise<T[]> {
		return this.copy(Promise.PromiseConstructor.all(unwrapPromises(iterable)));
	}

	/**
	 * Converts an iterable object containing promises into a single promise that resolves or rejects as soon as one of
	 * the promises in the iterable resolves or rejects, with the value of the resolved or rejected promise. Values in
	 * the iterable that are not Promises are converted to Promises with PromiseShim.resolve.
	 *
	 * @example
	 * PromiseShim.race([ PromiseShim.resolve('foo'), PromiseShim.resolve('bar') ]).then((value) => {
	 *     value === 'foo'; // true
	 * });
	 *
	 * @example
	 * PromiseShim.race({
	 *     foo: PromiseShim.resolve('foo'),
	 *     bar: PromiseShim.resolve('bar')
	 * }).then((value) => {
	 *     value === 'foo'; // true
	 * });
	 */
	static race<T>(iterable: Iterable<(T | Thenable<T>)> |  (T | Thenable<T>)[]): Promise<T> {
		return this.copy(Promise.PromiseConstructor.race(unwrapPromises(iterable)));
	}

	/**
	 * Creates a new promise that is rejected with the given error.
	 */
	static reject<T>(reason: Error): Promise<any> {
		return this.copy(Promise.PromiseConstructor.reject(reason));
	}

	/**
	 * Creates a new promise that is resolved with the given value. If the passed value is already a PromiseShim, it
	 * will be returned as-is.
	 */
	static resolve(): Promise<void>;
	static resolve<T>(value: (T | Thenable<T>)): Promise<T>;
	static resolve<T>(value?: any): Promise<T> {
		if (value instanceof Promise) {
			return value;
		}
		return this.copy(Promise.PromiseConstructor.resolve(value));
	}

	/**
	 * Copies another Promise, taking on its inner state.
	 */
	protected static copy<U>(other: Promise<U>): Promise<U> {
		const promise = Object.create(this.prototype, {
			promise: { value: other instanceof Promise.PromiseConstructor ? other : other.promise }
		});

		promise._state = State.Pending;
		promise.promise.then(
			function () { promise._state = State.Fulfilled; },
			function () { promise._state = State.Rejected; }
		);

		return promise;
	}

	/**
	 * Creates a new Promise.
	 *
	 * @constructor
	 *
	 * @param executor
	 * The executor function is called immediately when the PromiseShim is instantiated. It is responsible for
	 * starting the asynchronous operation when it is invoked.
	 *
	 * The executor must call either the passed `resolve` function when the asynchronous operation has completed
	 * successfully, or the `reject` function when the operation fails.
	 */
	constructor(executor: Executor<T>) {
		// Wrap the executor to verify that the the resolution value isn't this promise. Since any incoming promise
		// should be wrapped, the native resolver can't automatically detect self-resolution.
		this.promise = new Promise.PromiseConstructor(<Executor<T>> ((resolve, reject) => {
			executor(
				(value) => {
					if (value === this) {
						reject(new TypeError('Cannot chain a promise to itself'));
					}
					else {
						resolve(value);
					}
				},
				function (reason): void {
					reject(reason);
				}
			);
		}));

		this._state = State.Pending;
		this.promise.then(
			() => { this._state = State.Fulfilled; },
			() => { this._state = State.Rejected; }
		);
	}

	/**
	 * An object wrapped by this class that actually implements the Promise API.
	 */
	promise: any;

	/**
	 * The internal state of this promise. This may be updated directly by subclasses.
	 */
	protected _state: State;

	/**
	 * Adds a callback to the promise to be invoked when the asynchronous operation throws an error.
	 */
	catch<U>(onRejected: (reason: Error) => (U | Thenable<U>)): Promise<U>;
	catch<U>(onRejected: (reason: Error) => void): Promise<U> {
		return this.then<U>(null, onRejected);
	}

	/**
	 * Allows for cleanup actions to be performed after resolution of a Promise.
	 */
	finally(callback: () => void | Thenable<any>): Promise<T> {
		// Handler to be used for fulfillment and rejection; whether it was fulfilled or rejected is explicitly
		// indicated by the first argument
		function handler(rejected: boolean, valueOrError: any) {
			// If callback throws, the handler will throw
			const result = callback();
			if (isThenable(result)) {
				// If callback returns a Thenable that rejects, return the rejection. Otherwise, return or throw the
				// incoming value as appropriate when the Thenable resolves.
				return Promise.resolve(result).then(function () {
					if (rejected) {
						throw valueOrError;
					}
					return valueOrError;
				});
			}
			else {
				// If callback returns a non-Thenable, return or throw the incoming value as appropriate.
				if (rejected) {
					throw valueOrError;
				}
				return valueOrError;
			}
		};

		return this.then<T>(handler.bind(null, false), handler.bind(null, true));
	}

	/**
	 * The current Promise state.
	 */
	get state(): State {
		return this._state;
	}

	/**
	 * Adds a callback to the promise to be invoked when the asynchronous operation completes successfully.
	 */
	then<U>(onFulfilled?: ((value: T) => (U | Thenable<U> | null | undefined)) | null | undefined, onRejected?: (reason: Error) => void): Promise<U>;
	then<U>(onFulfilled?: ((value: T) => (U | Thenable<U> | null | undefined)) | null | undefined, onRejected?: (reason: Error) => (U | Thenable<U>)): Promise<U> {
		return (<typeof Promise> this.constructor).copy(this.promise.then(onFulfilled, onRejected));
	}
}
