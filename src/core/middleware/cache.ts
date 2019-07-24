import { create, destroy } from '../vdom';
import Map from '../../shim/Map';

const factory = create({ destroy });

export const cache = factory(({ middleware: { destroy } }) => {
	const cacheMap = new Map<string, any>();
	destroy(() => {
		cacheMap.clear();
	});
	return {
		get<T = any>(key: any): T | undefined {
			return cacheMap.get(key);
		},
		set<T = any>(key: any, value: T): void {
			cacheMap.set(key, value);
		},
		clear(): void {
			cacheMap.clear();
		}
	};
});

export default cache;
