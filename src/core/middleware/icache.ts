/* tslint:disable:interface-name */
import Map from '../../shim/Map';
import Set from '../../shim/Set';
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
			value: void extends S ? (value: T | undefined) => Promise<T> : (value: S[T] | undefined) => Promise<S[T]>,
			invalidate?: boolean
		): void extends S ? T | undefined : S[T] | undefined;
		<T extends void extends S ? any : keyof S>(
			key: void extends S ? any : T,
			value: void extends S ? (value: T | undefined) => T : (value: S[T] | undefined) => S[T],
			invalidate?: boolean
		): void extends S ? T : S[T];
		<T extends void extends S ? any : keyof S>(
			key: void extends S ? any : T,
			value: void extends S ? T : S[T],
			invalidate?: boolean
		): void extends S ? T : S[T];
	};
	has<T extends void extends S ? any : keyof S>(key: void extends S ? any : T): boolean;
	delete<T extends void extends S ? any : keyof S>(key: void extends S ? any : T, invalidate?: boolean): void;
	clear(invalidate?: boolean): void;
	pending<T extends void extends S ? any : keyof S>(key: void extends S ? any : T): boolean;
}

const icacheFactory = factory(
	({ middleware: { invalidator, destroy } }): ICacheResult<any> => {
		const cacheMap = new Map<string, CacheWrapper>();
		const pendingKeys = new Set<string>();
		destroy(() => {
			cacheMap.clear();
		});

		const api: any = {
			get: (key: any): any => {
				const cachedValue = cacheMap.get(key);
				if (!cachedValue || cachedValue.status === 'pending') {
					return undefined;
				}
				return cachedValue.value;
			}
		};

		api.set = (key: any, value: any, invalidate: boolean = true): any => {
			const current = api.get(key);
			if (typeof value === 'function') {
				value = value(current);
				if (value && typeof value.then === 'function') {
					const currentStatus = cacheMap.get(key);
					cacheMap.set(key, {
						status: 'pending',
						value
					});
					if (pendingKeys.has(key) && (!currentStatus || currentStatus.status !== 'pending')) {
						invalidate && invalidator();
					}
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
					return undefined;
				}
			}
			cacheMap.set(key, {
				status: 'resolved',
				value
			});
			invalidate && invalidator();
			return value;
		};
		api.has = (key: any) => {
			return cacheMap.has(key);
		};
		api.delete = (key: any, invalidate: boolean = true) => {
			cacheMap.delete(key);
			pendingKeys.delete(key);
			invalidate && invalidator();
		};
		api.clear = (invalidate: boolean = true): void => {
			cacheMap.clear();
			pendingKeys.clear();
			invalidate && invalidator();
		};
		api.getOrSet = (key: any, value: any, invalidate: boolean = true): any | undefined => {
			let cachedValue = cacheMap.get(key);
			if (!cachedValue) {
				api.set(key, value, invalidate);
			}
			cachedValue = cacheMap.get(key);
			if (!cachedValue || cachedValue.status === 'pending') {
				return undefined;
			}
			return cachedValue.value;
		};
		api.pending = (key: any): boolean => {
			pendingKeys.add(key);
			let cachedValue = cacheMap.get(key);
			return Boolean(cachedValue && cachedValue.status === 'pending');
		};
		return api;
	}
);

export const createICacheMiddleware = <S = void>() => icacheFactory.withType<ICacheResult<S>>();

export const icache = createICacheMiddleware();

export default icache;
