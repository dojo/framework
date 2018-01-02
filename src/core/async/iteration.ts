import * as array from '@dojo/shim/array';
import { isArrayLike, Iterable } from '@dojo/shim/iterator';
import Promise from '@dojo/shim/Promise';
import { Thenable } from '@dojo/shim/interfaces';

function isThenable<T>(value: any): value is Thenable<T> {
	return value && typeof value.then === 'function';
}

type ValuesAndResults<T, U> = { values: T[] | undefined; results: U[] | undefined };

/**
 * Processes all items and then applies the callback to each item and eventually returns an object containing the
 * processed values and callback results
 * @param items a list of synchronous/asynchronous values to process
 * @param callback a callback that maps values to synchronous/asynchronous results
 * @return a list of objects holding the synchronous values and synchronous results.
 */
function processValuesAndCallback<T, U>(
	items: Iterable<T | Promise<T>> | (T | Thenable<T>)[],
	callback: Mapper<T, U>
): Promise<ValuesAndResults<T, U>> {
	return Promise.all(items).then(function(results) {
		const pass: (U | Promise<U>)[] = Array.prototype.map.call(results, callback);
		return Promise.all(pass).then(function(pass) {
			return { values: results, results: pass };
		});
	});
}

/**
 * Finds the index of the next value in a sparse array-like object
 * @param list the sparse array-like object
 * @param offset the starting offset
 * @return the offset of the next index with a value; or -1 if not found
 */
function findNextValueIndex<T>(list: ArrayLike<T>, offset: number = -1): number {
	offset++;
	for (let length = list.length; offset < length; offset++) {
		if (offset in list) {
			return offset;
		}
	}
	return -1;
}

function findLastValueIndex(list: ArrayLike<any>, offset?: number): number {
	offset = (offset === undefined ? list.length : offset) - 1;
	for (; offset >= 0; offset--) {
		if (offset in list) {
			return offset;
		}
	}
	return -1;
}

function generalReduce<T, U>(
	findNextIndex: (list: ArrayLike<any>, offset?: number) => number,
	items: Iterable<T | Promise<T>> | (T | Promise<T>)[],
	callback: Reducer<T, U>,
	initialValue?: U
): Promise<U> {
	const hasInitialValue = arguments.length > 3;
	return Promise.all(items).then(function(results) {
		return new Promise<U>(function(resolve, reject) {
			// As iterators do not have indices like `ArrayLike` objects, the results array
			// is used to determine the next value.
			const list = isArrayLike(items) ? items : results;
			let i: number;
			function next(currentValue: U | undefined): void {
				i = findNextIndex(list, i);
				if (i >= 0) {
					if (results) {
						if (currentValue) {
							const result = callback(currentValue, results[i], i, results);

							if (isThenable(result)) {
								result.then(next, reject);
							} else {
								next(result);
							}
						}
					}
				} else {
					resolve(currentValue);
				}
			}

			let value: U | undefined;
			if (hasInitialValue) {
				value = initialValue;
			} else {
				i = findNextIndex(list);

				if (i < 0) {
					throw new Error('reduce array with no initial value');
				}
				if (results) {
					value = <any>results[i];
				}
			}
			next(value);
		});
	});
}

function testAndHaltOnCondition<T>(
	condition: boolean,
	items: Iterable<T | Promise<T>> | (T | Promise<T>)[],
	callback: Filterer<T>
): Promise<boolean> {
	return Promise.all(items).then(function(results) {
		return new Promise<boolean>(function(resolve) {
			let result: boolean | Thenable<boolean>;
			let pendingCount = 0;
			if (results) {
				for (let i = 0; i < results.length; i++) {
					result = callback(results[i], i, results);
					if (result === condition) {
						return resolve(result);
					} else if (isThenable(result)) {
						pendingCount++;
						result.then(function(result) {
							if (result === condition) {
								resolve(result);
							}
							pendingCount--;
							if (pendingCount === 0) {
								resolve(!condition);
							}
						});
					}
				}
			}
			if (pendingCount === 0) {
				resolve(!condition);
			}
		});
	});
}

/**
 * Test whether all elements in the array pass the provided callback
 * @param items a collection of synchronous/asynchronous values
 * @param callback a synchronous/asynchronous test
 * @return eventually returns true if all values pass; otherwise false
 */
export function every<T>(
	items: Iterable<T | Promise<T>> | (T | Promise<T>)[],
	callback: Filterer<T>
): Promise<boolean> {
	return testAndHaltOnCondition(false, items, callback);
}

/**
 * Returns an array of elements which pass the provided callback
 * @param items a collection of synchronous/asynchronous values
 * @param callback a synchronous/asynchronous test
 * @return eventually returns a new array with only values that have passed
 */
export function filter<T>(items: Iterable<T | Promise<T>> | (T | Promise<T>)[], callback: Filterer<T>): Promise<T[]> {
	return processValuesAndCallback(items, callback).then(function(result) {
		let arr: T[] = [];
		if (result && result.results && result.values) {
			for (let i = 0; i < result.results.length; i++) {
				result.results[i] && arr.push(result.values[i]);
			}
		}
		return arr;
	});
}

/**
 * Find the first value matching a filter function
 * @param items a collection of synchronous/asynchronous values
 * @param callback a synchronous/asynchronous test
 * @return a promise eventually containing the item or undefined if a match is not found
 */
export function find<T>(
	items: Iterable<T | Promise<T>> | (T | Promise<T>)[],
	callback: Filterer<T>
): Promise<T | undefined> {
	const list = isArrayLike(items) ? items : array.from(items);
	return findIndex(list, callback).then<T | undefined>(function(i) {
		return i !== undefined && i >= 0 ? list[i] : undefined;
	});
}

/**
 * Find the first index with a value matching the filter function
 * @param items a collection of synchronous/asynchronous values
 * @param callback a synchronous/asynchronous test
 * @return a promise eventually containing the index of the matching item or -1 if a match is not found
 */
export function findIndex<T>(
	items: Iterable<T | Promise<T>> | (T | Thenable<T>)[],
	callback: Filterer<T>
): Promise<number> {
	// TODO we can improve this by returning immediately
	return processValuesAndCallback(items, callback).then(function(result: ValuesAndResults<T, boolean>) {
		if (result && result.results) {
			for (let i = 0; i < result.results.length; i++) {
				if (result.results[i]) {
					return i;
				}
			}
		}
		return -1;
	});
}

/**
 * transform a list of items using a mapper function
 * @param items a collection of synchronous/asynchronous values
 * @param callback a synchronous/asynchronous transform function
 * @return a promise eventually containing a collection of each transformed value
 */
export function map<T, U>(
	items: Iterable<T | Promise<T>> | (T | Promise<T>)[],
	callback: Mapper<T, U>
): Promise<U[] | null | undefined> {
	return processValuesAndCallback(items, callback).then(function(result) {
		return result ? result.results : null;
	});
}

/**
 * reduce a list of items down to a single value
 * @param items a collection of synchronous/asynchronous values
 * @param callback a synchronous/asynchronous reducer function
 * @param [initialValue] the first value to pass to the callback
 * @return a promise eventually containing a value that is the result of the reduction
 */
export function reduce<T, U>(
	this: any,
	items: Iterable<T | Promise<T>> | (T | Promise<T>)[],
	callback: Reducer<T, U>,
	initialValue?: U
): Promise<U> {
	const args: any[] = <any[]>array.from(arguments);
	args.unshift(findNextValueIndex);
	return generalReduce.apply(this, args);
}

export function reduceRight<T, U>(
	this: any,
	items: Iterable<T | Promise<T>> | (T | Promise<T>)[],
	callback: Reducer<T, U>,
	initialValue?: U
): Promise<U> {
	const args: any[] = <any[]>array.from(arguments);
	args.unshift(findLastValueIndex);
	return generalReduce.apply(this, args);
}

export function series<T, U>(
	items: Iterable<T | Promise<T>> | (T | Promise<T>)[],
	operation: Mapper<T, U>
): Promise<U[]> {
	return generalReduce(
		findNextValueIndex,
		items,
		function(previousValue, currentValue: T, index: number, array: T[]) {
			const result = operation(currentValue, index, array);

			if (isThenable(result)) {
				return result.then(function(value) {
					previousValue.push(value);
					return previousValue;
				});
			}

			previousValue.push(result);
			return previousValue;
		},
		[] as U[]
	);
}

export function some<T>(
	items: Iterable<T | Promise<T>> | Array<T | Promise<T>>,
	callback: Filterer<T>
): Promise<boolean> {
	return testAndHaltOnCondition(true, items, callback);
}

export interface Filterer<T> extends Mapper<T, boolean> {}

export interface Mapper<T, U> {
	(value: T, index: number, array: T[]): U | Thenable<U>;
}

export interface Reducer<T, U> {
	(previousValue: U, currentValue: T, index: number, array: T[]): U | Thenable<U>;
}
