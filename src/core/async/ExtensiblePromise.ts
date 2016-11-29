import { Iterable, forOf } from 'dojo-shim/iterator';
import Promise, { Executor } from 'dojo-shim/Promise';
import { Thenable } from 'dojo-shim/interfaces';

/**
 * Take a list of values, and if any are ExtensiblePromise objects, insert the wrapped Promise in its place,
 * otherwise use the original object. We use this to help use the native Promise methods like `all` and `race`.
 *
 * @param iterable    The list of objects to iterate over
 * @returns {any[]}    The list of objects, as an array, with ExtensiblePromises being replaced by Promises.
 */
function unwrapPromises(iterable: Iterable<any> | any[]): any[] {
	const unwrapped: any[] = [];
	forOf(iterable, function (item: any): void {
		unwrapped.push(item instanceof ExtensiblePromise ? item._promise : item);
	});
	return unwrapped;
}

/**
 * An extensible base to allow Promises to be extended in ES5. This class basically wraps a native Promise object,
 * giving an API like a native promise.
 */
export default class ExtensiblePromise<T> {
	/**
	 * Return a rejected promise wrapped in an ExtensiblePromise
	 *
	 * @param {Error?} reason    The reason for the rejection
	 * @returns {ExtensiblePromise}
	 */
	static reject<T>(reason?: Error): any {
		return new this<T>((resolve, reject) => reject(reason));
	}

	/**
	 * Return a resolved promise wrapped in an ExtensiblePromise
	 *
	 * @param value The value to resolve the promise with
	 *
	 * @returns {ExtensiblePromise}
	 */
	static resolve(): any;
	static resolve<T>(value: (T | Thenable<T>)): any;
	static resolve<T>(value?: any): any {
		return new this<T>((resolve, reject) => resolve(value));
	}

	/**
	 * Return a ExtensiblePromise that resolves when all of the passed in objects have resolved
	 *
	 * @param iterable    An iterable of values to resolve. These can be Promises, ExtensiblePromises, or other objects
	 * @returns {ExtensiblePromise}
	 */
	static all<F extends ExtensiblePromise<T>, T>(iterable: Iterable<(T | Thenable<T>)> | (T | Thenable<T>)[]): F {
		return <F> new this((resolve, reject) => {
			Promise.all(unwrapPromises(iterable)).then(resolve, reject);
		});
	}

	/**
	 * Return a ExtensiblePromise that resolves when one of the passed in objects have resolved
	 *
	 * @param iterable    An iterable of values to resolve. These can be Promises, ExtensiblePromises, or other objects
	 * @returns {ExtensiblePromise}
	 */
	static race<F extends ExtensiblePromise<T>, T>(iterable: Iterable<(T | Thenable<T>)> | (T | Thenable<T>)[]): F {
		return <F> new this((resolve, reject) => {
			Promise.race(unwrapPromises(iterable)).then(resolve, reject);
		});
	}

	/**
	 * @type {Promise}
	 * The wrapped promise
	 */
	readonly _promise: Promise<T>;

	/**
	 * Creates a new extended Promise.
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
		this._promise = new Promise<T>(executor);
	}

	/**
	 * Adds a callback to be invoked when the wrapped Promise is rejected.
	 *
	 * @param {Function} onRejected A function to call to handle the error. The parameter to the function will be the caught error.
	 *
	 * @returns {ExtensiblePromise}
	 */
	catch<U>(onRejected: (reason: Error) => (U | Thenable<U>)): this;
	catch<U>(onRejected: (reason: Error) => void): this {
		return this.then<U>(undefined, onRejected);
	}

	/**
	 * Adds a callback to be invoked when the wrapped Promise resolves or is rejected.
	 *
	 * @param {Function} onFulfilled   A function to call to handle the resolution. The paramter to the function will be the resolved value, if any.
	 * @param {Function} onRejected    A function to call to handle the error. The parameter to the function will be the caught error.
	 *
	 * @returns {ExtensiblePromise}
	 */
	then<U>(onFulfilled?: ((value: T) => (U | Thenable<U> | undefined)) | undefined, onRejected?: (reason: Error) => void): this;
	then<U>(onFulfilled?: ((value: T) => (U | Thenable<U> | undefined)) | undefined, onRejected?: (reason: Error) => (U | Thenable<U>)): this {
		let e: Executor<U> = (resolve, reject) => {
			function handler(rejected: boolean, valueOrError: T | U | Error) {
				const callback: ((value: T | U | Error) => (U | Thenable<U> | void)) | undefined = rejected ? onRejected : onFulfilled;

				if (typeof callback === 'function') {
					try {
						resolve(<U> callback(<T> valueOrError));
					}
					catch (error) {
						reject(error);
					}
				}
				else if (rejected) {
					reject(valueOrError);
				}
				else {
					resolve(<U> valueOrError);
				}
			}

			this._promise.then(handler.bind(null, false), handler.bind(null, true));
		};

		return new (<{ new(executor: Executor<U>): any }> this.constructor)(e);
	}
}
