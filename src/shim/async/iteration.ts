/**
 * Test whether all elements in the array pass the provided callback
 * @param items a collection of synchronous/asynchronous values
 * @param callback a synchronous/asynchronous test
 */
export function every<T>(items: (T | Promise<T>)[], callback: Filterer<T>): Promise<boolean> {
	return Promise.all<T>(items).then(function (results) {
		return new Promise<boolean>(function(resolve) {
			var result: (boolean | Thenable<boolean>);
			var pendingCount = 0;
			for (var i = 0; i < results.length; i++) {
				result = callback(results[i], i, results);
				if (result === false) {
					return resolve(false);
				}
				else if ((<Thenable<boolean>> result).then) {
					pendingCount++;
					(<Thenable<boolean>> result).then(function (result) {
						if (result === false) {
							resolve(false);
						}
						pendingCount--;
						if (pendingCount === 0) {
							resolve(true);
						}
					})
				}
			}
			if (pendingCount === 0) {
				resolve(true);
			}
		})
	});
}

// TODO implement
//export function filter<T>(items: Array<T | Thenable<T>>, callback: Filterer<T>): Promise<T[]>;

// TODO implement
//export function find<T>(items: Array<T | Thenable<T>>, callback: Filterer<T>): Promise<T>;

// TODO implement
//export function findIndex<T>(items: Array<T | Thenable<T>>, callback: Filterer<T>): Promise<number>;

// TODO implement
//export function map<T, U>(items: Array<T | Thenable<T>>, callback: Mapper<T, U>): Promise<U[]>;

// TODO implement
//export function reduce<T, U>(items: Array<T | Thenable<T>>, callback: (previousValue: U, currentValue: T) => U,
//	initialValue?: U): Promise<U>;

// TODO implement
//export function reduceRight<T, U>(items: Array<T | Thenable<T>>, callback: (previousValue: U, currentValue: T) => U,
//	initialValue?: U): Promise<U>;

// TODO implement
//export function series<T, U>(items: Array<T | Thenable<T>>, operation: Operation<T, U>): Promise<U[]>;

// TODO implement
//export function some<T>(items: Array<T | Thenable<T>>, callback: Filterer<T>): Promise<boolean>;



// TODO remove this when core/async/Promise is available
export interface Thenable<T> {
	then<U>(
		onFulfilled?: (value?: T) => Thenable<U> | U,
		onRejected?: (error?: Error) => Thenable<U> | U
	): Thenable<U>;
}

export interface Filterer<T> extends Mapper<T, boolean> {}

export interface Mapper<T, U> {
	(value: T, index: number, array: T[]): (U | Thenable<U>);
}

export interface Operation<T, U> {
	(value: T): Thenable<U>;
}


// TODO Remove es6 reference path once async/Promise is available
/**
 * Represents the completion of an asynchronous operation
 */
interface Promise<T> {
	/**
	 * Attaches callbacks for the resolution and/or rejection of the Promise.
	 * @param onfulfilled The callback to execute when the Promise is resolved.
	 * @param onrejected The callback to execute when the Promise is rejected.
	 * @returns A Promise for the completion of which ever callback is executed.
	 */
	then<TResult>(onfulfilled?: (value: T) => TResult | Promise<TResult>, onrejected?: (reason: any) => TResult | Promise<TResult>): Promise<TResult>;

	/**
	 * Attaches a callback for only the rejection of the Promise.
	 * @param onrejected The callback to execute when the Promise is rejected.
	 * @returns A Promise for the completion of the callback.
	 */
	catch(onrejected?: (reason: any) => T | Promise<T>): Promise<T>;
}

interface PromiseConstructor {
	/**
	 * A reference to the prototype.
	 */
	prototype: Promise<any>;

	/**
	 * Creates a new Promise.
	 * @param init A callback used to initialize the promise. This callback is passed two arguments:
	 * a resolve callback used resolve the promise with a value or the result of another promise,
	 * and a reject callback used to reject the promise with a provided reason or error.
	 */
	new <T>(init: (resolve: (value?: T | Promise<T>) => void, reject: (reason?: any) => void) => void): Promise<T>;

	<T>(init: (resolve: (value?: T | Promise<T>) => void, reject: (reason?: any) => void) => void): Promise<T>;

	/**
	 * Creates a Promise that is resolved with an array of results when all of the provided Promises
	 * resolve, or rejected when any Promise is rejected.
	 * @param values An array of Promises.
	 * @returns A new Promise.
	 */
	all<T>(values: (T | Promise<T>)[]): Promise<T[]>;

	/**
	 * Creates a Promise that is resolved with an array of results when all of the provided Promises
	 * resolve, or rejected when any Promise is rejected.
	 * @param values An array of values.
	 * @returns A new Promise.
	 */
	all(values: Promise<void>[]): Promise<void>;

	/**
	 * Creates a Promise that is resolved or rejected when any of the provided Promises are resolved
	 * or rejected.
	 * @param values An array of Promises.
	 * @returns A new Promise.
	 */
	race<T>(values: (T | Promise<T>)[]): Promise<T>;

	/**
	 * Creates a new rejected promise for the provided reason.
	 * @param reason The reason the promise was rejected.
	 * @returns A new rejected Promise.
	 */
	reject(reason: any): Promise<void>;

	/**
	 * Creates a new rejected promise for the provided reason.
	 * @param reason The reason the promise was rejected.
	 * @returns A new rejected Promise.
	 */
	reject<T>(reason: any): Promise<T>;

	/**
	 * Creates a new resolved promise for the provided value.
	 * @param value A promise.
	 * @returns A promise whose internal state matches the provided promise.
	 */
	resolve<T>(value: T | Promise<T>): Promise<T>;

	/**
	 * Creates a new resolved promise .
	 * @returns A resolved promise.
	 */
	resolve(): Promise<void>;
}

declare var Promise: PromiseConstructor;
