import { Thenable } from './interfaces';
import global from './global';
import { queueMicroTask } from './support/queue';
import { Iterable } from './iterator';
import './Symbol';
import has from './support/has';

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
	(resolve: (value?: T | PromiseLike<T>) => void, reject: (reason?: any) => void): void;
}

export let ShimPromise: typeof Promise = global.Promise;

export const isThenable = function isThenable<T>(value: any): value is PromiseLike<T> {
	return value && typeof value.then === 'function';
};

if (!has('es6-promise')) {
	const enum State {
		Fulfilled,
		Pending,
		Rejected
	}

	global.Promise = ShimPromise = class Promise<T> implements Thenable<T> {
		static all(iterable: Iterable<(any | PromiseLike<any>)> | (any | PromiseLike<any>)[]): Promise<any> {
			return new this(function (resolve, reject) {
				const values: any[] = [];
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

				function processItem(index: number, item: any): void {
					++total;
					if (isThenable(item)) {
						// If an item Promise rejects, this Promise is immediately rejected with the item
						// Promise's rejection error.
						item.then(fulfill.bind(null, index), reject);
					}
					else {
						Promise.resolve(item).then(fulfill.bind(null, index));
					}
				}

				let i = 0;
				for (const value of iterable) {
					processItem(i, value);
					i++;
				}
				populating = false;

				finish();
			});
		}

		static race<T>(iterable: Iterable<(T | PromiseLike<T>)> | (T | PromiseLike<T>)[]): Promise<T[]> {
			return new this(function (resolve: (value?: any) => void, reject) {
				for (const item of iterable) {
					if (item instanceof Promise) {
						// If a Promise item rejects, this Promise is immediately rejected with the item
						// Promise's rejection error.
						item.then(resolve, reject);
					}
					else {
						Promise.resolve(item).then(resolve);
					}
				}
			});
		}

		static reject(reason?: any): Promise<never> {
			return new this(function (resolve, reject) {
				reject(reason);
			});
		}

		static resolve(): Promise<void>;
		static resolve<T>(value: (T | PromiseLike<T>)): Promise<T>;
		static resolve<T>(value?: any): Promise<T> {
			return new this(function (resolve) {
				resolve(<T> value);
			});
		}

		static [Symbol.species]: PromiseConstructor = ShimPromise as PromiseConstructor;

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

			this.then = <TResult1 = T, TResult2 = never>(onFulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
					onRejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): Promise<TResult1 | TResult2> => {
				return new Promise((resolve, reject) => {
					// whenFinished initially queues up callbacks for execution after the promise has settled. Once the
					// promise has settled, whenFinished will schedule callbacks for execution on the next turn through the
					// event loop.
					whenFinished(() => {
						const callback: ((value?: any) => any) | undefined | null = this.state === State.Rejected ? onRejected : onFulfilled;

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
				executor(
					resolve.bind(null, State.Fulfilled),
					resolve.bind(null, State.Rejected)
				);
			}
			catch (error) {
				settle(State.Rejected, error);
			}
		}

		catch<TResult = never>(onRejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): Promise<T | TResult> {
			return this.then(undefined, onRejected);
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

		then: <TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null) => Promise<TResult1 | TResult2>;

		[Symbol.toStringTag]: 'Promise' = 'Promise';
	};
}

export default ShimPromise;
