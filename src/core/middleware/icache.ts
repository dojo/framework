/* tslint:disable:interface-name */
import Map from '../../shim/Map';
import { create, invalidator, destroy } from '../vdom';

const factory = create({ invalidator, destroy });

interface CacheWrapper {
	status: 'pending' | 'resolved';
	value: any;
}

export interface ICacheResult<S = void> {
	getOrSet: {
		<T extends void extends S ? any : keyof S>(
			key: void extends S ? any : T,
			value: void extends S ? () => Promise<T> : () => Promise<S[T]>,
			invalidate?: boolean
		): void extends S ? undefined | T : undefined | S[T];
		<T extends void extends S ? any : keyof S>(
			key: void extends S ? any : T,
			value: void extends S ? () => T : () => S[T],
			invalidate?: boolean
		): void extends S ? T : S[T];
		<T extends void extends S ? any : keyof S>(
			key: void extends S ? any : T,
			value: void extends S ? T : S[T],
			invalidate?: boolean
		): void extends S ? T : S[T];
	};
	get<T extends void extends S ? any : keyof S>(
		key: void extends S ? any : T
	): void extends S ? T | undefined : S[T] | undefined;
	set: {
		<T extends void extends S ? any : keyof S>(
			key: void extends S ? any : T,
			value: void extends S ? () => Promise<T> : () => Promise<S[T]>,
			invalidate?: boolean
		): void;
		<T extends void extends S ? any : keyof S>(
			key: void extends S ? any : T,
			value: void extends S ? () => T : () => S[T],
			invalidate?: boolean
		): void;
		<T extends void extends S ? any : keyof S>(
			key: void extends S ? any : T,
			value: void extends S ? T : S[T],
			invalidate?: boolean
		): void;
	};
	has<T extends void extends S ? any : keyof S>(key: void extends S ? any : T): boolean;
	delete<T extends void extends S ? any : keyof S>(key: void extends S ? any : T, invalidate?: boolean): void;
	clear(invalidate?: boolean): void;
}

export function createICacheMiddleware<S = void>() {
	const icache = factory(
		({ middleware: { invalidator, destroy } }): ICacheResult<S> => {
			const cacheMap = new Map<string, CacheWrapper>();
			destroy(() => {
				cacheMap.clear();
			});
			return {
				getOrSet(key: any, value: any, invalidate = true): any | undefined {
					let cachedValue = cacheMap.get(key);
					if (!cachedValue) {
						this.set(key, value, invalidate);
					}
					cachedValue = cacheMap.get(key);
					if (!cachedValue || cachedValue.status === 'pending') {
						return undefined;
					}
					return cachedValue.value;
				},
				get(key: any): any {
					const cachedValue = cacheMap.get(key);
					if (!cachedValue || cachedValue.status === 'pending') {
						return undefined;
					}
					return cachedValue.value;
				},
				set(key: any, value: any, invalidate = true): void {
					if (typeof value === 'function') {
						value = value();
						if (value && typeof value.then === 'function') {
							cacheMap.set(key, {
								status: 'pending',
								value
							});
							value.then((result: any) => {
								const cachedValue = cacheMap.get(key);
								if (cachedValue && cachedValue.value === value) {
									cacheMap.set(key, {
										status: 'resolved',
										value: result
									});
									invalidate && invalidator();
								}
							});
							return;
						}
					}
					cacheMap.set(key, {
						status: 'resolved',
						value
					});
					invalidate && invalidator();
				},
				has(key: any) {
					return cacheMap.has(key);
				},
				delete(key: any, invalidate = true) {
					cacheMap.delete(key);
					invalidate && invalidator();
				},
				clear(invalidate = true): void {
					cacheMap.clear();
					invalidate && invalidator();
				}
			};
		}
	);
	return icache;
}

export const icache = createICacheMiddleware();

export default icache;
