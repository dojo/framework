import global from '../support/global';

export interface Set<T> {
	add(value: T): this;
	clear(): void;
	delete(value: T): boolean;
	forEach(callbackfn: (value: T, index: T, set: Set<T>) => void, thisArg?: any): void;
	has(value: T): boolean;
	size: number;
}

export interface SetConstructor {
	new (): Set<any>;
	new <T>(values?: T[]): Set<T>;
	prototype: Set<any>;
}

/* tslint:disable-next-line:variable-name */
const Set: SetConstructor = global.Set;

export default Set;
