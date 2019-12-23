import has from './../has';
import { create } from '../vdom';
import icache from './icache';

const factory = create({ icache });

export const cache = factory(({ middleware: { icache } }) => {
	if (has('dojo-debug')) {
		console.warn(
			'The cache middleware has been deprecated. Please use the icache middleware instead, for details please see the documentation https://dojo.io/learn/middleware/available-middleware#icache'
		);
	}
	return {
		get<T = any>(key: any): T | undefined {
			return icache.get(key);
		},
		set<T = any>(key: any, value: T): void {
			icache.set(key, value, false);
		},
		has(key: any): boolean {
			return icache.has(key);
		},
		delete(key: any): void {
			icache.delete(key);
		},
		clear(): void {
			icache.clear();
		}
	};
});

export default cache;
