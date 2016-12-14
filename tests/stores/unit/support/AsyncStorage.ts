import createInMemoryStorage from '../../../src/storage/createInMemoryStorage';
import Promise from 'dojo-shim/Promise';
import WeakMap from 'dojo-shim/WeakMap';
import { delay } from 'dojo-core/async/timing';

export interface Identity<T> {
	(value: T): Promise<T>;
}

const instanceStateMap = new WeakMap<{}, any>();

function getRandomInt(max = 100) {
	return Math.floor(Math.random() * max);
}

function delayOperation(operation: Function, operationName: string) {
	return function(this: any, ...args: any[]) {
		const state = instanceStateMap.get(this);
		const milliseconds = state[operationName] || getRandomInt();
		return delay(milliseconds)(operation.bind(this, ...args));
	};
}

const createAsyncStorage = createInMemoryStorage.mixin({
	initialize(instance, asyncOptions = {}) {
		instanceStateMap.set(instance, asyncOptions);
	},
	aspectAdvice: {
		around: {
			createId(createId: Function) {
				return delayOperation(createId, 'createId');
			},
			fetch(fetch: Function) {
				return delayOperation(fetch, 'fetch');
			},
			get(get: Function) {
				return delayOperation(get, 'get');
			},
			add(add: Function) {
				return delayOperation(add, 'put');
			},
			put(put: Function) {
				return delayOperation(put, 'put');
			},
			delete(_delete: Function) {
				return delayOperation(_delete, 'delete');
			},
			patch(patch: Function) {
				return delayOperation(patch, 'patch');
			}
		}

	}
});
export default createAsyncStorage;
