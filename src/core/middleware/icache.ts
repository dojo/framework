/* tslint:disable:interface-name */
import { create, invalidator } from '../vdom';
import cache from './cache';

const factory = create({ cache, invalidator });

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
	delete<T extends void extends S ? any : keyof S>(key: void extends S ? any : T): void;
	clear(): void;
}

export function createICacheMiddleware<S = void>() {
	const icache = factory(
		({ middleware: { invalidator, cache } }): ICacheResult<S> => {
			return {
				getOrSet(key: any, value: any, invalidate = true): any | undefined {
					let cachedValue = cache.get<CacheWrapper>(key);
					if (!cachedValue) {
						this.set(key, value, invalidate);
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
				set(key: any, value: any, invalidate = true): void {
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
									invalidate && invalidator();
								}
							});
							return;
						}
					}
					cache.set(key, {
						status: 'resolved',
						value
					});
					invalidate && invalidator();
				},
				has(key: any) {
					return cache.has(key);
				},
				delete(key: any) {
					cache.delete(key);
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
