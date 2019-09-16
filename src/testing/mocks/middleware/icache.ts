/* tslint:disable:interface-name */
import { create, invalidator } from '../../../core/vdom';
import { MiddlewareResult } from '../../../core/interfaces';
import Map from '../../../shim/Map';

export function createICacheMock() {
	const map = new Map<any, any>();
	const factory = create({ invalidator });

	const mockICacheFactory = factory(({ middleware: { invalidator } }) => {
		return {
			getOrSet<T = any>(key: any, value: any): T | undefined {
				if (map.has(key)) {
					return this.get(key);
				} else {
					this.set(key, value);
					return undefined;
				}
			},
			get<T = any>(key: any): T | undefined {
				if (map.has(key)) {
					const mapValue = map.get(key);
					if (typeof mapValue === 'function') {
						return undefined;
					} else {
						return mapValue as T;
					}
				}
				return undefined;
			},
			set(key: any, value: any): void {
				if (typeof value === 'function') {
					value = value();
					if (value.then && typeof value.then === 'function') {
						value.then((result: any) => {
							map.set(key, result);
							invalidator();
						});
					}
					map.set(key, value);
				} else {
					map.set(key, value);
					invalidator();
				}
			},
			clear(): void {}
		};
	});

	function mockCache(): MiddlewareResult<any, any, any>;
	function mockCache(key: string): Promise<any>;
	function mockCache(key?: string): Promise<any> | MiddlewareResult<any, any, any> {
		if (key) {
			if (map.has(key)) {
				const mapValue = map.get(key);

				if (mapValue.then && typeof mapValue.then === 'function') {
					return mapValue;
				} else {
					return Promise.resolve(mapValue);
				}
			} else {
				return Promise.resolve(undefined);
			}
		} else {
			return mockICacheFactory();
		}
	}

	return mockCache;
}

export default createICacheMock;
