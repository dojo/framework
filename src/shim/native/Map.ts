import global from '../support/global';

export interface Map<K, V> {
	clear(): void;
	delete(key: K): boolean;
	forEach(callbackfn: (value: V, index: K, map: Map<K, V>) => void, thisArg?: any): void;
	get(key: K): V | undefined;
	has(key: K): boolean;
	set(key: K, value?: V): this;
	readonly size: number;
}

export interface MapConstructor {
	new (): Map<any, any>;
	new <K, V>(entries?: [K, V][]): Map<K, V>;
	prototype: Map<any, any>;
}

/* tslint:disable-next-line:variable-name */
const Map: MapConstructor = global.Map;

export default Map;
