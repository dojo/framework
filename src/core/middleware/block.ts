import { create, defer } from '../vdom';
import cache from './cache';
import icache from './icache';

const blockFactory = create({ defer, cache, icache });

export const block = blockFactory(({ middleware: { cache, icache, defer } }) => {
	let id = 1;
	return {
		run<T extends (...args: any[]) => any>(module: T) {
			return (...args: any[]): (ReturnType<T> extends Promise<infer U> ? U : ReturnType<T>) | null => {
				const argsString = JSON.stringify(args);
				const moduleId = cache.get(module) || id++;
				cache.set(module, moduleId);
				const cachedValue = icache.getOrSet(`${moduleId}-${argsString}`, async () => {
					const run = Promise.resolve(module(...args));
					defer.pause();
					const result = await run;
					defer.resume();
					return result;
				});
				return cachedValue || null;
			};
		}
	};
});

export default block;
