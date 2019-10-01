import { create, destroy, invalidator } from '../../../core/vdom';
import injector from '../../../core/middleware/injector';
import { createStoreMiddleware } from '../../../core/middleware/store';
import Store, { StatePaths } from '../../../stores/Store';
import { DefaultMiddlewareResult } from '../../../core/interfaces';
import { PatchOperation } from '../../../stores/state/Patch';
import { Process } from '../../../stores/process';

const factory = create({ destroy, invalidator, injector });

export function createMockStoreMiddleware<T = any>(processes: [Process<any, any>, any][] = []) {
	const store = createStoreMiddleware();
	const storeMock = new Store<T>();
	const processMockMap = new Map(processes);
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
				const mock = processMockMap.get(process);
				if (mock) {
					return mock;
				}
				return (() => {}) as any;
			},
			at: mock.at.bind(mock)
		};
	});

	function mockStore(): DefaultMiddlewareResult;
	function mockStore(operations: (path: StatePaths<T>) => PatchOperation[]): void;
	function mockStore(operations?: (path: any) => PatchOperation[]): void | DefaultMiddlewareResult {
		if (operations) {
			storeMock.apply(operations(storeMock.path), true);
		} else {
			return mockStoreMiddleware();
		}
	}
	return mockStore;
}

export default createMockStoreMiddleware;
