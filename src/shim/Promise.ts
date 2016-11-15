import { Thenable } from 'dojo-interfaces/shim';
import global from './support/global';
import { queueMicroTask } from './support/queue';
import { forOf, Iterable } from './iterator';
import './Symbol';
import { hasClass } from './support/decorators';

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

module Shim {

	/**
	 * The State enum represents the possible states of a promise.
	 */
	export const enum State {
		Fulfilled,
		Pending,
		Rejected
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
	 * Promise is a partial implementation of the ES2015 Promise specification. It relies on Promise to do some safety
	 * checks such as verifying that a Promise isn't resolved with itself. This class is exported for testability, and is
	 * not intended to be used directly.
	 *
	 * @borrows Promise.all as Promise.all
	 * @borrows Promise.race as Promise.race
	 * @borrows Promise.reject as Promise.reject
	 * @borrows Promise.resolve as Promise.resolve
	 * @borrows Promise#catch as Promise#catch
	 * @borrows Promise#then as Promise#then
	 */
	export class Promise<T> implements Thenable<T> {
		static all<T>(iterable: Iterable<(T | Thenable<T>)> | (T | Thenable<T>)[]): Promise<T[]> {
			return new this(function (resolve, reject) {
				const values: T[] = [];
				let complete = 0;
				let total = 0;
				let populating = true;

				function fulfill(index: number, value: any): void {
					values[ index ] = value;
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
					if (item instanceof Promise) {
						// If an item Promise rejects, this Promise is immediately rejected with the item
						// Promise's rejection error.
						item.then(fulfill.bind(null, index), reject);
					}
					else {
						Promise.resolve(item).then(fulfill.bind(null, index));
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

		static race<T>(iterable: Iterable<(T | Thenable<T>)> | (T | Thenable<T>)[]): Promise<T[]> {
			return new this(function (resolve, reject) {
				forOf(iterable, function (item: T | Thenable<T>) {
					if (item instanceof Promise) {
						// If a Promise item rejects, this Promise is immediately rejected with the item
						// Promise's rejection error.
						item.then(resolve, reject);
					}
					else {
						Promise.resolve(item).then(resolve);
					}
				});
			});
		}

		static reject<T>(reason?: any): Promise<T> {
			return new this(function (resolve, reject) {
				reject(reason);
			});
		}

		static resolve(): Promise<void>;
		static resolve<T>(value: (T | Thenable<T>)): Promise<T>;
		static resolve<T>(value?: any): Promise<T> {
			return new this(function (resolve) {
				resolve(<T> value);
			});
		}

		/**
		 * Creates a new Promise.
		 *
		 * @constructor
		 *
		 * @param executor
		 * The executor function is called immediately when the Promise is instantiated. It is responsible for
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
			 * @param {T|any} value The resolved value for this promise.
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
								callbacks[ i ].call(null);
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
			 * @param {T|any} value The resolved value for this promise.
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

			this.then = <U>(onFulfilled?: (value?: T) => (U | Promise<U>),
							onRejected?: (reason?: any) => (U | Promise<U>)): Promise<U> => {
				return new Promise<U>((resolve, reject) => {
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

		catch<U>(onRejected: (reason: any) => (U | Thenable<U>)): Promise<U> {
			return this.then<U>(undefined, onRejected);
		}

		/**
		 * The current state of this promise.
		 */
		private state = State.Pending;

		/**
		 * The resolved value for this promise.
		 *
		 * @type {T|any}
		 */
		private resolvedValue: any;

		then: <U>(onFulfilled?: (value: T) => (U | Thenable<U>), onRejected?: (reason: any) => (U | Thenable<U>)) => Promise<U>;

		[Symbol.toStringTag]: string = 'Promise';
	}
}

@hasClass('es6-promise', global.Promise, Shim.Promise)
export default class Promise<T> implements Thenable<T> {
	/**
	 * Creates a new Promise.
	 *
	 * @constructor
	 *
	 * @param executor
	 * The executor function is called immediately when the Promise is instantiated. It is responsible for
	 * starting the asynchronous operation when it is invoked.
	 *
	 * The executor must call either the passed `resolve` function when the asynchronous operation has completed
	 * successfully, or the `reject` function when the operation fails.
	 */
	/* istanbul ignore next */
	constructor(executor: Executor<T>) {
	}

	/**
	 * Converts an iterable object containing promises into a single promise that resolves to a new iterable object
	 * containing the fulfilled values of all the promises in the iterable, in the same order as the Promises in the
	 * iterable. Iterable values that are not promises are converted to promises using Promise.resolve.
	 *
	 * @example
	 * Promise.all([ Promise.resolve('foo'), 'bar' ]).then(function (value) {
	 *     value[0] === 'foo'; // true
	 *     value[1] === 'bar'; // true
	 * });
	 *
	 * @example
	 * Promise.all({
	 *     foo: Promise.resolve('foo'),
	 *     bar: 'bar'
	 * }).then((value) => {
	 *     value.foo === 'foo'; // true
	 *     value.bar === 'bar'; // true
	 * });
	 */
	/* istanbul ignore next */
	static all<T>(iterable: Iterable<(T | Thenable<T>)> | (T | Thenable<T>)[]): Promise<T[]> {
		throw new Error();
	};

	/**
	 * Converts an iterable object containing promises into a single promise that resolves or rejects as soon as one of
	 * the promises in the iterable resolves or rejects, with the value of the resolved or rejected promise. Values in
	 * the iterable that are not Promises are converted to Promises with Promise.resolve.
	 *
	 * @example
	 * Promise.race([ Promise.resolve('foo'), Promise.resolve('bar') ]).then((value) => {
	 *     value === 'foo'; // true
	 * });
	 *
	 * @example
	 * Promise.race({
	 *     foo: Promise.resolve('foo'),
	 *     bar: Promise.resolve('bar')
	 * }).then((value) => {
	 *     value === 'foo'; // true
	 * });
	 */
	/* istanbul ignore next */
	static race<T>(iterable: Iterable<(T | Thenable<T>)> |  (T | Thenable<T>)[]): Promise<T> {
		throw new Error();
	}

	/**
	 * Creates a new promise that is rejected with the given error.
	 */
	/* istanbul ignore next */
	static reject<T>(reason?: any): Promise<any> {
		throw new Error();
	}

	/**
	 * Creates a new promise that is resolved with the given value.
	 */
	static resolve(): Promise<void>;
	static resolve<T>(value: (T | Thenable<T>)): Promise<T>;
	/* istanbul ignore next */
	static resolve<T>(value?: any): Promise<T> {
		throw new Error();
	}

	/**
	 * Adds a callback to the promise to be invoked when the asynchronous operation throws an error.
	 */
	catch<U>(onRejected: (reason: any) => (U | Thenable<U>)): Promise<U>;
	/* istanbul ignore next */
	catch<U>(onRejected: (reason: any) => void): Promise<U> {
		throw new Error();
	}

	then<U>(onFulfilled?: (value: T) => U | Thenable<U> | undefined | null, onRejected?: (reason: any) => void): Promise<U>;
	/* istanbul ignore next */
	then<U>(onFulfilled?: (value: T) => U | Thenable<U> | undefined | null, onRejected?: (reason: any) => (U | Thenable<U>)): Promise<U> {
		throw new Error();
	}
}
