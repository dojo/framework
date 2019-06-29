import { create, destroy, invalidator } from '../../../core/vdom';
import injector from '../../../core/middleware/injector';
import { createStoreMiddleware } from '../../../core/middleware/store';
import Store, { StatePaths } from '../../../stores/Store';
import { MiddlewareResult } from '../../../core/interfaces';
import { PatchOperation } from '../../../stores/state/Patch';
import { Process } from '../../../stores/process';

const factory = create({ destroy, invalidator, injector });

export function createMockStoreMiddleware<T = any>() {
	const store = createStoreMiddleware();
	const calledProcesses = new Map();
	const storeMock = new Store<T>();
	const injectorStub = {
		get: (): any => {
			return storeMock;
		},
		subscribe: (): any => {}
	};
	const mockStoreMiddleware = factory(({ properties, middleware: { destroy, invalidator }, children, id }) => {
		const { callback } = store();
		const mock = callback({
			id,
			middleware: { destroy, invalidator, injector: injectorStub },
			properties,
			children
		});
		return {
			get: mock.get.bind(mock),
			path: mock.path.bind(mock),
			executor: <T extends Process<any, any>>(process: T): ReturnType<T> => {
				const executorMock = (...args: any[]) => {
					const callArgs = calledProcesses.get(process) || [];
					callArgs.push(...args);
					calledProcesses.set(process, callArgs);
				};
				return executorMock as any;
			},
			at: mock.at.bind(mock)
		};
	});

	function mockStore(): MiddlewareResult<any, any, any>;
	function mockStore(operations: (path: StatePaths<T>) => PatchOperation[]): void;
	function mockStore(operations?: (path: any) => PatchOperation[]): void | MiddlewareResult<any, any, any> {
		if (operations) {
			storeMock.apply(operations(storeMock.path), true);
		} else {
			return mockStoreMiddleware();
		}
	}

	// I think we should expose a way of asserting against processes that are called
	// not sure whether we should return things for the consumer to assert or assert
	// internally.

	mockStore.getProcessCall = (process: any, call: number) => {
		const calls = calledProcesses.get(process);
		if (calls && calls[call]) {
			return calls[call];
		}
		return null;
	};

	mockStore.processCallCount = (process: any) => {
		const calls = calledProcesses.get(process) || [];
		return calls.length;
	};

	return mockStore;
}

export default createMockStoreMiddleware;
