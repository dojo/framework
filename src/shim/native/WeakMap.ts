import global from '../support/global';

export interface WeakMap<K, V> {
	clear(): void;
	delete(key: K): boolean;
	get(key: K): V;
	has(key: K): boolean;
	set(key: K, value?: V): this;
}

export interface WeakMapConstructor {
	new (): WeakMap<any, any>;
	new <K, V>(entries?: [K, V][]): WeakMap<K, V>;
	prototype: WeakMap<any, any>;
}

/* tslint:disable-next-line:variable-name */
const WeakMap: WeakMapConstructor = global.WeakMap;

export default WeakMap;
