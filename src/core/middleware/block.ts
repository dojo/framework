import { create, invalidator, defer } from '../vdom';
import cache from './cache';

const blockFactory = create({ invalidator, defer, cache });

export const block = blockFactory(({ middleware: { invalidator, cache, defer } }) => {
	return {
		run<T extends (...args: any[]) => any>(module: T) {
			return (...args: any[]): (ReturnType<T> extends Promise<infer U> ? U : ReturnType<T>) | null => {
				const argsString = JSON.stringify(args);
				let valueMap = cache.get(module);
				if (valueMap) {
					const cachedValue = valueMap.get(argsString);
					if (cachedValue !== undefined) {
						return cachedValue;
					}
				}
				const result = module(...args);
				if (result && typeof result.then === 'function') {
					defer.pause();
					result.then((result: any) => {
						defer.resume();
						valueMap = cache.get(module);
						if (!valueMap) {
							valueMap = new Map();
							cache.set(module, valueMap);
						}
						valueMap.set(argsString, result);
						invalidator();
					});
					return null;
				}
				return result;
			};
		}
	};
});

export default block;
