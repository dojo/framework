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
