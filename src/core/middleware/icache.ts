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
			value: void extends S ? () => Promise<T> : () => Promise<S[T]>
		): void extends S ? undefined | T : undefined | S[T];
		<T extends void extends S ? any : keyof S>(
			key: void extends S ? any : T,
			value: void extends S ? () => T : () => S[T]
		): void extends S ? T : S[T];
		<T extends void extends S ? any : keyof S>(
			key: void extends S ? any : T,
			value: void extends S ? T : S[T]
		): void extends S ? T : S[T];
	};
	get<T extends void extends S ? any : keyof S>(
		key: void extends S ? any : T
	): void extends S ? T | undefined : S[T] | undefined;
	set<T extends void extends S ? any : keyof S>(
		key: void extends S ? any : T,
		value: void extends S ? T : S[T]
	): void;
	clear(): void;
}

export function createICacheMiddleware<S = void>() {
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
