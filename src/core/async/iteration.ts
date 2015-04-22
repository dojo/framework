// TODO remove this when core/async/Promise is available
export interface Thenable<T> {
	then<U>(
		onFulfilled?: (value?: T) => Promise.Thenable<U> | U,
		onRejected?: (error?: Error) => Promise.Thenable<U> | U
	): Promise.Thenable<U>;
}

// TODO remove this when core/async/Promise is available
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

export interface Filterer<T> extends Mapper<T, boolean> {}

export interface Mapper<T, U> {
	(value: T): (U | Thenable<U>);
}

export interface Operation<T, U> {
	(value: T): Thenable<U>;
}

// TODO implement
export function every<T>(items: Array<T | Thenable<T>>, callback: Filterer<T>): Promise<boolean>;

// TODO implement
export function every<T>(items: Array<T | Thenable<T>>, callback: Filterer<T>): Promise<boolean>;

// TODO implement
export function filter<T>(items: Array<T | Thenable<T>>, callback: Filterer<T>): Promise<T[]>;

// TODO implement
export function find<T>(items: Array<T | Thenable<T>>, callback: Filterer<T>): Promise<T>;

// TODO implement
export function findIndex<T>(items: Array<T | Thenable<T>>, callback: Filterer<T>): Promise<number>;

// TODO implement
export function map<T, U>(items: Array<T | Thenable<T>>, callback: Mapper<T, U>): Promise<U[]>;

// TODO implement
export function reduce<T, U>(items: Array<T | Thenable<T>>, callback: (previousValue: U, currentValue: T) => U,
	initialValue?: U): Promise<U>;

// TODO implement
export function reduceRight<T, U>(items: Array<T | Thenable<T>>, callback: (previousValue: U, currentValue: T) => U,
	initialValue?: U): Promise<U>;

// TODO implement
export function series<T, U>(items: Array<T | Thenable<T>>, operation: Operation<T, U>): Promise<U[]>;

// TODO implement
export function some<T>(items: Array<T | Thenable<T>>, callback: Filterer<T>): Promise<boolean>;
