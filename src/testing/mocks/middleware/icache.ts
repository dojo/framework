import { create, invalidator, destroy } from '../../../core/vdom';
import { DefaultMiddlewareResult } from '../../../core/interfaces';
import { icache } from '../../../core/middleware/icache';
import Map from '../../../shim/Map';

export function createICacheMock() {
	const map = new Map<string, any>();
	const factory = create({ destroy, invalidator });
	const mockICacheFactory = factory(({ id, middleware, properties, children }) => {
		const { callback } = icache();
		const icacheMiddleware = callback({
			id,
			middleware: { invalidator: middleware.invalidator, destroy: middleware.destroy },
			properties,
			children
		});
		const setter = icacheMiddleware.set;

		icacheMiddleware.set = (key: any, value: any) => {
			if (typeof value === 'function') {
				value = value();
				if (value && typeof value.then === 'function') {
					map.set(key, value);
					setter(key, () => value);
					return;
				}
			}

			setter(key, value);
		};

		return icacheMiddleware;
	});

	function mockCache(): DefaultMiddlewareResult;
	function mockCache(key: string): Promise<any>;
	function mockCache(key?: string): Promise<any> | DefaultMiddlewareResult {
		if (key) {
			if (map.has(key)) {
				return map.get(key);
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
