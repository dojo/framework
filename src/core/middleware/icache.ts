import { create, invalidator } from '../vdom';
import cache from './cache';

const factory = create({ cache, invalidator });

interface CacheWrapper<T = any> {
	status: 'pending' | 'resolved';
	value: T;
}

export interface IcacheResult {
	getOrSet: {
		<T>(key: any, value: () => Promise<T>): undefined;
		<T>(key: any, value: () => T): T;
		<T>(key: any, value: T): T;
	};
	get<T = any>(key: any): T | undefined;
	set(key: any, value: any): void;
	clear(): void;
}

export const icache = factory(
	({ middleware: { invalidator, cache } }): IcacheResult => {
		return {
			getOrSet<T = any>(key: any, value: any): T | undefined {
				let cachedValue = cache.get<CacheWrapper<T>>(key);
				if (!cachedValue) {
					this.set(key, value);
				}
				cachedValue = cache.get<CacheWrapper<T>>(key);
				if (!cachedValue || cachedValue.status === 'pending') {
					return undefined;
				}
				return cachedValue.value;
			},
			get<T = any>(key: any): T | undefined {
				const cachedValue = cache.get<CacheWrapper<T>>(key);
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
							const cachedValue = cache.get<CacheWrapper<any>>(key);
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

export default icache;
