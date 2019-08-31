/* tslint:disable:interface-name */
import { create, invalidator } from '../vdom';
import cache from './cache';

const factory = create({ cache, invalidator });

interface CacheWrapper {
	status: 'pending' | 'resolved';
	value: any;
}

export interface ICacheResult<S = null> {
	getOrSet: {
		<T extends null extends S ? any : keyof S>(
			key: null extends S ? any : T,
			value: null extends S ? () => Promise<T> : () => Promise<S[T]>
		): null extends S ? undefined | T : undefined | S[T];
		<T extends null extends S ? any : keyof S>(
			key: null extends S ? any : T,
			value: null extends S ? () => T : () => S[T]
		): null extends S ? T : S[T];
		<T extends null extends S ? any : keyof S>(
			key: null extends S ? any : T,
			value: null extends S ? T : S[T]
		): null extends S ? T : S[T];
	};
	get<T extends null extends S ? any : keyof S>(
		key: null extends S ? any : T
	): null extends S ? T | undefined : S[T] | undefined;
	set<T extends null extends S ? any : keyof S>(
		key: null extends S ? any : T,
		value: null extends S ? T : S[T]
	): void;
	clear(): void;
}

export function createICacheMiddleware<S = any>() {
	const icache = factory(
		({ middleware: { invalidator, cache } }): ICacheResult<S> => {
			return {
				getOrSet(key: any, value: any): any | undefined {
					let cachedValue = cache.get<CacheWrapper>(key);
					if (!cachedValue) {
						this.set(key, value);
					}
					cachedValue = cache.get<CacheWrapper>(key);
					if (!cachedValue || cachedValue.status === 'pending') {
						return undefined;
					}
					return cachedValue.value;
				},
				get(key: any): any {
					const cachedValue = cache.get<CacheWrapper>(key);
					if (!cachedValue || cachedValue.status === 'pending') {
						return undefined;
					}
					return cachedValue.value;
				},
				set(key: any, value: any): void {
					if (typeof value === 'function') {
						value = value();
						if (value && typeof value.then === 'function') {
							cache.set(key, {
								status: 'pending',
								value
							});
							value.then((result: any) => {
								const cachedValue = cache.get<CacheWrapper>(key);
								if (cachedValue && cachedValue.value === value) {
									cache.set(key, {
										status: 'resolved',
										value: result
									});
									invalidator();
								}
							});
							return;
						}
					}
					cache.set(key, {
						status: 'resolved',
						value
					});
					invalidator();
				},
				clear(): void {
					cache.clear();
				}
			};
		}
	);
	return icache;
}

export const icache = createICacheMiddleware();

export default icache;
