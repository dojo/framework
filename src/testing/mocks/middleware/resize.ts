import global from '../../../shim/global';
import { create, destroy, invalidator } from '../../../core/vdom';
import icache from '../../../core/middleware/icache';
import resize from '../../../core/middleware/resize';
import { DefaultMiddlewareResult } from '../../../core/interfaces';

export function createResizeMock() {
	const mockNodes: any = {};
	const refMap = new Map();
	const mockNode = {
		get(key: string) {
			return mockNodes[key];
		}
	};
	let invalidate: () => void | undefined;

	const factory = create({ destroy, icache, invalidator });

	const mockResizeFactory = factory(({ id, middleware, properties, children }) => {
		const { callback } = resize();
		invalidate = middleware.invalidator;
		return callback({
			id,
			middleware: { destroy: middleware.destroy, icache: middleware.icache, node: mockNode },
			properties,
			children
		});
	});

	global.ResizeObserver = class MockResize {
		private _cb: ResizeObserverCallback;
		private _ref: any;
		constructor(cb: any) {
			this._cb = cb;
		}
		public observe(ref: any) {
			this._ref = ref;
			refMap.set(ref, this);
			this._cb([{ contentRect: ref, target: this._ref }], this);
		}
		public unobserve() {}

		public disconnect() {}

		public resize(contentRect: DOMRectReadOnly) {
			this._cb([{ contentRect, target: this._ref }], this);
		}
	};

	function mockResize(): DefaultMiddlewareResult;
	function mockResize(key: string, contentRect: Partial<DOMRectReadOnly>): void;
	function mockResize(key?: string, contentRect?: Partial<DOMRectReadOnly>): void | DefaultMiddlewareResult {
		if (key) {
			if (!mockNodes[key]) {
				mockNodes[key] = contentRect;
			}
			const ref = mockNodes[key];
			const mock = refMap.get(ref);
			if (mock) {
				mock.resize(contentRect);
			} else {
				invalidate && invalidate();
			}
		} else {
			return mockResizeFactory();
		}
	}

	return mockResize;
}

export default createResizeMock;
