import { create, defer, decrementBlockCount, incrementBlockCount } from '../vdom';
import icache from './icache';

const blockFactory = create({ defer, icache });

export const block = blockFactory(({ middleware: { icache, defer } }) => {
	let id = 1;
	return <T extends (...args: any[]) => any>(module: T) => {
		return (...args: Parameters<T>): (ReturnType<T> extends Promise<infer U> ? U : ReturnType<T>) | null => {
			const argsString = JSON.stringify(args);
			const moduleId = icache.get(module) || id++;
			icache.set(module, moduleId, false);
			const cachedValue = icache.getOrSet(`${moduleId}-${argsString}`, async () => {
				incrementBlockCount();
				const run = module(...args);
				defer.pause();
				const result = await run;
				decrementBlockCount();
				defer.resume();
				return result;
			});
			return cachedValue || null;
		};
	};
});

export default block;
