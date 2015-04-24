var array = {
	map: Array.prototype.map
};

function processValuesAndCallback<T, U>(items: (T | Promise<T>)[], callback: Mapper<T, U>): Promise<{ values: T[]; results: U[] }> {
	return Promise.all<T>(items)
		.then(function (results) {
			var pass: (U | Promise<U>)[] = array.map.call(results, callback);
			return Promise.all<U>(pass)
				.then<{ values: T[]; results: U[] }>(function (pass) {
					return { values: results, results: pass };
				});
		});
}

//function reduceAndCallback<T, U>(items: (T | Promise<T>)[], callback: Reducer<T, U>,
//								 initialValue: U, step?: number = 1): Promise<U> {
//
//}

/**
 * Test whether all elements in the array pass the provided callback
 * @param items a collection of synchronous/asynchronous values
 * @param callback a synchronous/asynchronous test
 * @return eventually returns true if all values pass; otherwise false
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
					});
				}
			}
			if (pendingCount === 0) {
				resolve(true);
			}
		});
	});
}

/**
 * Returns an array of elements which pass the provided callback
 * @param items a collection of synchronous/asynchronous values
 * @param callback a synchronous/asynchronous test
 * @return eventually returns a new array with only values that have passed
 */
export function filter<T>(items: (T | Promise<T>)[], callback: Filterer<T>): Promise<T[]> {
	return processValuesAndCallback(items, callback).then<T[]>(function ({ results, values }) {
		var arr: T[] = [];
		for (var i = 0; i < results.length; i++) {
			results[i] && arr.push(values[i]);
		}
		return arr;
	});
}

export function find<T>(items: (T | Promise<T>)[], callback: Filterer<T>): Promise<T> {
	return findIndex<T>(items, callback).then(function (i) {
		return i >= 0 ? items[i] : undefined;
	});
}

export function findIndex<T>(items: (T | Promise<T>)[], callback: Filterer<T>): Promise<number> {
	// TODO we can improve this by returning immediately
	return processValuesAndCallback(items, callback).then<number>(function ({ results, values }) {
		for (var i = 0; i < results.length; i++) {
			if (results[i]) {
				return i;
			}
		}
		return -1;
	});
}

export function map<T, U>(items: (T | Promise<T>)[], callback: Mapper<T, U>): Promise<U[]> {
	return processValuesAndCallback<T, U>(items, callback)
			.then<U[]>(function ({ results, values}) {
				return results;
			});
}

//export function reduce<T, U>(items: (T | Promise<T>)[], callback: Reducer<T, U>,
//							initialValue?: U): Promise<U> {
//	return Promise.all<T>(items)
//		.then(function (results) {
//			var value: U = initialValue;
//			for (var i = 0; i < results.length; i++) {
//				value = callback(value, results[i]);
//			}
//			return value;
//		});
//}

// TODO implement
//export function reduceRight<T, U>(items: Array<T | Thenable<T>>, callback: (previousValue: U, currentValue: T) => U,
//	initialValue?: U): Promise<U> {
//	return reduceAndCallback<T, U>(items, callback, initialValue, -1);
//}

// TODO implement
//export function series<T, U>(items: Array<T | Thenable<T>>, operation: Operation<T, U>): Promise<U[]>;

// TODO implement
//export function some<T>(items: Array<T | Thenable<T>>, callback: Filterer<T>): Promise<boolean>;

export interface Filterer<T> extends Mapper<T, boolean> {}

export interface Mapper<T, U> {
	(value: T, index: number, array: T[]): (U | Thenable<U>);
}

export interface Reducer<T, U> {
	(previousValue: U, currentValue: T, index: number, array: T[]): (U | Thenable<U>)
}

export interface Operation<T, U> {
	(value: T): Thenable<U>;
}
