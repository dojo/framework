import Map from '../../shim/Map';
import { create, invalidator, destroy, defer } from '../vdom';

const blockFactory = create({ invalidator, destroy, defer });

export const block = blockFactory(({ middleware: { invalidator, destroy, defer } }) => {
	const moduleMap = new Map();
	destroy(() => {
		moduleMap.clear();
	});
	return {
		run<T extends (...args: any[]) => any>(module: T) {
			return (...args: any[]): (ReturnType<T> extends Promise<infer U> ? U : ReturnType<T>) | null => {
				const argsString = JSON.stringify(args);
				let valueMap = moduleMap.get(module);
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
						valueMap = moduleMap.get(module);
						if (!valueMap) {
							valueMap = new Map();
							moduleMap.set(module, valueMap);
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
