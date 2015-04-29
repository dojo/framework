import nextTick from './nextTick';
import global from './global';
import has, { add as hasAdd } from './has';

/**
 * Return true if a given value meets Promise's definition of "iterable".
 */
function isIterable(value: any) {
	return Array.isArray(value);
}

/**
 * Return true if a given value has a `then` method.
 */
export function isThenable(value: any) {
	return value && typeof value.then === 'function';
}

/**
 * Executor is the interface for functions used to initialize a Promise.
 */
export interface Executor<T> {
	(resolve: (value?: T | Thenable<T>) => void, reject: (reason?: any) => void): void;
}

/**
 * Thenable represents any object with a callable `then` property.
 */
export interface Thenable<T> {
	then<U>(onFulfilled?: (value?: T) => U | Thenable<U>, onRejected?: (error?: any) => U | Thenable<U>): Thenable<U>;
}

/**
 * PromiseShim is an implementation of the ES2015 Promise specification.
 */
export class PromiseShim<T> implements Thenable<T> {
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
	static all<T>(items: (T | Thenable<T>)[]): PromiseShim<T[]> {
		return new this((
			resolve: (value: any) => void,
			reject: (reason: any) => void
		): void => {
			let values: T[] = [];
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
					item.then(fulfill.bind(null, index), reject.bind(null));
				}
				else {
					PromiseShim.resolve(item).then(fulfill.bind(null, index));
				}
			}

			if (!isIterable(items)) {
				throw new Error('invalid argument');
			}

			let count = items.length;
			for (let i = 0; i < count; ++i) {
				// Handle sparse arrays
				if (i in items) {
					processItem(i, items[i]);
				}
			}
			populating = false;

			finish();
		});
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
	static race<T>(items: (T | Thenable<T>)[]): PromiseShim<T> {
		return new this((
			resolve: (value: any) => void,
			reject: (reason: any) => void
		): void => {
			if (!isIterable(items)) {
				throw new Error('invalid argument');
			}

			let count = items.length;
			let item: (T | Thenable<T>);

			for (let i = 0; i < count; ++i) {
				// Handle sparse arrays
				if (i in items) {
					item = items[i];

					if (item instanceof PromiseShim) {
						// If a PromiseShim item rejects, this PromiseShim is immediately rejected with the item
						// PromiseShim's rejection error.
						item.then(resolve.bind(null), reject.bind(null));
					}
					else {
						PromiseShim.resolve(item).then(resolve.bind(null));
					}
				}
			}
		});
	}

	/**
	 * Creates a new promise that is rejected with the given error.
	 */
	static reject<T>(reason?: any): PromiseShim<T> {
		return new this((
			resolve: (value: T) => void,
			reject: (reason: any) => void
		): void => {
			reject(reason);
		});
	}

	/**
	 * Creates a new promise that is resolved with the given value. If the passed value is already a PromiseShim, it
	 * will be returned as-is.
	 */
	static resolve<T>(value: (T | Thenable<T>)): PromiseShim<T> {
		if (value instanceof PromiseShim) {
			return value;
		}
		return new this((resolve: (value: T) => void): void => {
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
		let isResolved = (): boolean => {
			return this.state !== State.Pending || isChained;
		};

		/**
		 * Callbacks that should be invoked once the asynchronous operation has completed.
		 */
		let callbacks: Array<() => void> = [];

		/**
		 * Initially pushes callbacks onto a queue for execution once this promise settles. After the promise settles,
		 * enqueues callbacks for execution on the next event loop turn.
		 */
		let whenFinished = (callback: () => void): void => {
			callbacks.push(callback);
		};

		/**
		 * Schedules a callback for execution during the next round through the event loop.
		 *
		 * @method
		 * @param callback The callback to execute on the next turn through the event loop.
		 */
		function enqueue(callback: (...args: any[]) => any): void {
			nextTick(callback);
		}

		/**
		 * Settles this promise.
		 *
		 * @param newState The resolved state for this promise.
		 * @param {T|Error} value The resolved value for this promise.
		 */
		let settle = (newState: State, value: any): void => {
			// A promise can only be settled once.
			if (this.state !== State.Pending) {
				return;
			}

			this.state = newState;
			this.resolvedValue = value;
			whenFinished = enqueue;

			// Only enqueue a callback runner if there are callbacks so that initially fulfilled Promises don't have to
			// wait an extra turn.
			if (callbacks.length > 0) {
				enqueue((): void => {
					let count = callbacks.length;
					for (let i = 0; i < count; ++i) {
						callbacks[i].call(null);
					}
					callbacks = null;
				});
			}
		};

		/**
		 * Resolves this promise.
		 *
		 * @param newState The resolved state for this promise.
		 * @param {T|Error} value The resolved value for this promise.
		 */
		let resolve = (newState: State, value: any): void => {
			if (isResolved()) {
				return;
			}

			if (value === this) {
				settle(State.Rejected, new TypeError('Cannot chain a promise to itself'));
			}
			else if (isThenable(value)) {
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
			onRejected?: (reason?: any) => (U | PromiseShim<U>)
		): PromiseShim<U> => {
			return new PromiseShim<U>((
				resolve: (value?: U) => void,
				reject: (reason?: any) => void
			): void => {
				// whenFinished initially queues up callbacks for execution after the promise has settled. Once the
				// promise has settled, whenFinished will schedule callbacks for execution on the next turn through the
				// event loop.
				whenFinished((): void => {
					let callback: (value?: any) => any = this.state === State.Rejected ? onRejected : onFulfilled;

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

	/**
	 * Adds a callback to the promise to be invoked when the asynchronous operation throws an error.
	 */
	catch<U>(onRejected: (reason?: any) => (U | Thenable<U>)): PromiseShim<U> {
		return this.then<U>(null, onRejected);
	}

	/**
	 * Adds a callback to the promise to be invoked when the asynchronous operation completes successfully.
	 */
	then<U>(
		onFulfilled?: (value?: T) => (U | Thenable<U>),
		onRejected?: (reason?: any) => (U | Thenable<U>)
	): PromiseShim<U> { return null; }
}

/**
 * The State enum represents the possible states of a promise.
 */
enum State {
	Fulfilled,
	Pending,
	Rejected
}

/**
 * Copy an array of values, replacing any PlatformPromises in the copy with unwrapped global.Promises. This is necessary
 * for .all and .race so that the native promise doesn't treat the PlatformPromises like generic thenables.
 */
function unwrapPromises(items: any[]): any[] {
	let unwrapped: typeof items = [];
	let count = items.length;
	for (let i = 0; i < count; i++) {
		let item = items[i];
		unwrapped[i] = item instanceof PlatformPromise ? item.promise : item;
	}
	return unwrapped;
}

/**
 * PromiseConstructor points to the promise constructor this platform should use.
 */
hasAdd('promise', typeof global.Promise !== 'undefined');
let PromiseConstructor = has('promise') ? global.Promise : PromiseShim;

/**
 * PlatformPromise is a very thin wrapper around either a native promise implementation or PromiseShim.
 */
export class PlatformPromise<T> implements Thenable<T> {
	static all<T>(items: (T | Thenable<T>)[]): PlatformPromise<T[]> {
		return this.copy(PromiseConstructor.all(unwrapPromises(items)));
	}

	static race<T>(items: (T | Thenable<T>)[]): PlatformPromise<T> {
		return this.copy(PromiseConstructor.race(unwrapPromises(items)));
	}

	static reject<T>(reason: Error): PlatformPromise<any> {
		return this.copy(PromiseConstructor.reject(reason));
	}

	static resolve(): PlatformPromise<void>;
	static resolve<T>(value: (T | Thenable<T>)): PlatformPromise<T>;
	static resolve<T>(value?: any): PlatformPromise<T> {
		if (value instanceof PlatformPromise) {
			return value;
		}
		return this.copy(PromiseConstructor.resolve(value));
	}

	/**
	 * Copy another PlatformPromise, taking on its inner state.
	 */
	protected static copy<U>(other: PlatformPromise<U>): PlatformPromise<U> {
		var promise = Object.create(this.prototype, {
			promise: { value: other instanceof PromiseConstructor ? other : other.promise }
		});
		return promise;
	}

	constructor(executor: Executor<T>) {
		let createResolve = (resolve: (value?: T | Thenable<T>) => void, reject: (reason?: any) => void) => {
			return (value: any) => {
				if (value === this) {
					reject(new TypeError('Cannot chain a promise to itself'));
				}
				else {
					resolve(value);
				}
			};
		};
		// Create safe executor that verifies that the the resolution value isn't this promise. Since any incoming
		// promise should be wrapped, the native resolver can't automatically detect self-resolution.
		let safeExecutor: Executor<T> = (resolve, reject) => {
			(<Executor<T>> executor)(createResolve(resolve, reject), reject);
		};

		this.promise = new PromiseConstructor(safeExecutor);
	}

	private promise: any;

	catch<U>(onRejected: (reason?: Error) => (U | Thenable<U>)): PlatformPromise<U> {
		return this.then<U>(null, onRejected);
	}

	then<U>(
		onFulfilled?: (value?: T) => (U | Thenable<U>),
		onRejected?: (reason?: Error) => (U | Thenable<U>)
	): PlatformPromise<U> {
		return PlatformPromise.copy(this.promise.then(onFulfilled, onRejected));
	}
}

export default PlatformPromise;
