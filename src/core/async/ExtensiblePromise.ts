import { Thenable } from '@dojo/shim/interfaces';
import { isArrayLike, isIterable, Iterable } from '@dojo/shim/iterator';
import Promise, { Executor } from '@dojo/shim/Promise';
import '@dojo/shim/Symbol';

/**
 * Take a list of values, and if any are ExtensiblePromise objects, insert the wrapped Promise in its place,
 * otherwise use the original object. We use this to help use the native Promise methods like `all` and `race`.
 *
 * @param iterable    The list of objects to iterate over
 * @returns {any[]}    The list of objects, as an array, with ExtensiblePromises being replaced by Promises.
 */
export function unwrapPromises(iterable: Iterable<any> | any[]): any[] {
	const unwrapped: any[] = [];

	if (isArrayLike(iterable)) {
		for (let i = 0; i < iterable.length; i++) {
			const item = iterable[i];
			unwrapped.push(item instanceof ExtensiblePromise ? item._promise : item);
		}
	}
	else {
		for (const item of iterable) {
			unwrapped.push(item instanceof ExtensiblePromise ? item._promise : item);
		}
	}

	return unwrapped;
}

export type DictionaryOfPromises<T> = { [_: string]: T | Promise<T> | Thenable<T> };
export type ListOfPromises<T> = Iterable<(T | Thenable<T>)>;

/**
 * An extensible base to allow Promises to be extended in ES5. This class basically wraps a native Promise object,
 * giving an API like a native promise.
 */
export default class ExtensiblePromise<T> {
	/**
	 * Return a rejected promise wrapped in an ExtensiblePromise
	 *
	 * @param reason    The reason for the rejection
	 * @returns An extensible promise
	 */
	static reject<T>(reason?: any): ExtensiblePromise<never>;

	/**
	 * Return a rejected promise wrapped in an ExtensiblePromise
	 *
	 * @param reason    The reason for the rejection
	 * @returns An extensible promise
	 */
	static reject<T>(reason?: any): ExtensiblePromise<T> {
		return new this((resolve, reject) => reject(reason));
	}

	/**
	 * Return a resolved promise wrapped in an ExtensiblePromise
	 *
	 * @param value The value to resolve the promise with
	 *
	 * @returns An extensible promise
	 */
	static resolve<P extends ExtensiblePromise<void>>(): P;

	/**
	 * Return a resolved promise wrapped in an ExtensiblePromise
	 *
	 * @param value The value to resolve the promise with
	 *
	 * @returns An extensible promise
	 */
	static resolve<T, P extends ExtensiblePromise<T>>(value: T | PromiseLike<T>): P;
	static resolve(value?: any | PromiseLike<any>): ExtensiblePromise<any> {
		return new this((resolve, reject) => resolve(value));
	}

	/**
	 * Return a ExtensiblePromise that resolves when all of the passed in objects have resolved. When used with a key/value
	 * pair, the returned promise's argument is a key/value pair of the original keys with their resolved values.
	 *
	 * @example
	 * ExtensiblePromise.all({ one: 1, two: 2 }).then(results => console.log(results));
	 * // { one: 1, two: 2 }
	 *
	 * @param iterable    An iterable of values to resolve, or a key/value pair of values to resolve. These can be Promises, ExtensiblePromises, or other objects
	 * @returns An extensible promise
	 */
	static all<T>(iterable: DictionaryOfPromises<T>): ExtensiblePromise<{ [key: string]: T }>;

	/**
	 * Return a ExtensiblePromise that resolves when all of the passed in objects have resolved. When used with a key/value
	 * pair, the returned promise's argument is a key/value pair of the original keys with their resolved values.
	 *
	 * @example
	 * ExtensiblePromise.all({ one: 1, two: 2 }).then(results => console.log(results));
	 * // { one: 1, two: 2 }
	 *
	 * @param iterable    An iterable of values to resolve, or a key/value pair of values to resolve. These can be Promises, ExtensiblePromises, or other objects
	 * @returns An extensible promise
	 */
	static all<T>(iterable: (T | Thenable<T>)[]): ExtensiblePromise<T[]>;

	/**
	 * Return a ExtensiblePromise that resolves when all of the passed in objects have resolved. When used with a key/value
	 * pair, the returned promise's argument is a key/value pair of the original keys with their resolved values.
	 *
	 * @example
	 * ExtensiblePromise.all({ one: 1, two: 2 }).then(results => console.log(results));
	 * // { one: 1, two: 2 }
	 *
	 * @param iterable    An iterable of values to resolve, or a key/value pair of values to resolve. These can be Promises, ExtensiblePromises, or other objects
	 * @returns An extensible promise
	 */
	static all<T>(iterable: T | Thenable<T>): ExtensiblePromise<T[]>;

	/**
	 * Return a ExtensiblePromise that resolves when all of the passed in objects have resolved. When used with a key/value
	 * pair, the returned promise's argument is a key/value pair of the original keys with their resolved values.
	 *
	 * @example
	 * ExtensiblePromise.all({ one: 1, two: 2 }).then(results => console.log(results));
	 * // { one: 1, two: 2 }
	 *
	 * @param iterable    An iterable of values to resolve, or a key/value pair of values to resolve. These can be Promises, ExtensiblePromises, or other objects
	 * @returns An extensible promise
	 */
	static all<T>(iterable: ListOfPromises<T>): ExtensiblePromise<T[]>;

	/**
	 * Return a ExtensiblePromise that resolves when all of the passed in objects have resolved. When used with a key/value
	 * pair, the returned promise's argument is a key/value pair of the original keys with their resolved values.
	 *
	 * @example
	 * ExtensiblePromise.all({ one: 1, two: 2 }).then(results => console.log(results));
	 * // { one: 1, two: 2 }
	 *
	 * @param iterable    An iterable of values to resolve, or a key/value pair of values to resolve. These can be Promises, ExtensiblePromises, or other objects
	 * @returns An extensible promise
	 */
	static all<T>(iterable: DictionaryOfPromises<T> | ListOfPromises<T>): ExtensiblePromise<T[] | { [key: string]: T }> {
		if (!isArrayLike(iterable) && !isIterable(iterable)) {
			const promiseKeys = Object.keys(iterable);

			return new this((resolve, reject) => {
				Promise.all(promiseKeys.map(key => iterable[key])).then((promiseResults: T[]) => {
					const returnValue: { [key: string]: T} = {};

					promiseResults.forEach((value: T, index: number) => {
						returnValue[promiseKeys[index]] = value;
					});

					resolve(returnValue);
				}, reject);
			});
		}

		return new this((resolve, reject) => {
			Promise.all(unwrapPromises(<Iterable<T>> iterable)).then(resolve, reject);
		});
	}

	/**
	 * Return a ExtensiblePromise that resolves when one of the passed in objects have resolved
	 *
	 * @param iterable    An iterable of values to resolve. These can be Promises, ExtensiblePromises, or other objects
	 * @returns {ExtensiblePromise}
	 */
	static race<T>(iterable: Iterable<(T | PromiseLike<T>)> | (T | PromiseLike<T>)[]): ExtensiblePromise<T> {
		return new this((resolve, reject) => {
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
	catch<TResult = never>(onRejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): ExtensiblePromise<T | TResult> {
		return this.then(undefined, onRejected);
	}

	/**
	 * Adds a callback to be invoked when the wrapped Promise resolves or is rejected.
	 *
	 * @param {Function} onFulfilled   A function to call to handle the resolution. The paramter to the function will be the resolved value, if any.
	 * @param {Function} onRejected    A function to call to handle the error. The parameter to the function will be the caught error.
	 *
	 * @returns {ExtensiblePromise}
	 */
	then<TResult1 = T, TResult2 = never>(
		onFulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
		onRejected?: ((reason: any) => TResult2 | PromiseLike<TResult2> | void) | undefined | null
	): ExtensiblePromise<TResult1 | TResult2> {
		const executor: Executor<TResult1> = (resolve, reject) => {
			function handler(rejected: boolean, valueOrError: T | TResult1 | Error) {
				const callback: ((value: any) => any) | null | undefined = rejected ? onRejected : onFulfilled;

				if (typeof callback === 'function') {
					try {
						resolve(callback(valueOrError));
					}
					catch (error) {
						reject(error);
					}
				}
				else if (rejected) {
					reject(valueOrError);
				}
				else {
					resolve(valueOrError as TResult1);
				}
			}

			this._promise.then(handler.bind(null, false), handler.bind(null, true));
		};

		return new (this.constructor as typeof ExtensiblePromise)(executor);
	}

	readonly [Symbol.toStringTag]: 'Promise';
}
