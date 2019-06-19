import global from '../shim/global';
import { create, destroy, invalidator } from '../core/vdom';
import { icache } from '../core/middleware/icache';
import { cache } from '../core/middleware/cache';
import { resize } from '../core/middleware/resize';
import { intersection } from '../core/middleware/intersection';
import { IntersectionResult, ExtendedIntersectionObserverEntry } from '../core/meta/Intersection';
import { DOMRectReadOnly, ResizeObserverCallback } from '../shim/ResizeObserver';

export function createResizeMock() {
	let mockNodes: any = {};
	const mockNode = {
		get(key: string) {
			return mockNodes[key];
		}
	};

	const factory = create({ destroy, icache });

	const mockResize = factory(({ id, middleware, properties, children }) => {
		const { callback } = resize();
		return callback({ id, middleware: { ...middleware, node: mockNode }, properties, children });
	});

	let refMap = new Map();

	class MockResize {
		private _cb: ResizeObserverCallback;
		private _ref: any;
		constructor(cb: any) {
			this._cb = cb;
		}
		public observe(ref: any) {
			this._ref = ref;
			refMap.set(ref, this);
		}
		public unobserve() {}

		public disconnect() {}

		public trigger(contentRect: DOMRectReadOnly) {
			this._cb([{ contentRect, target: this._ref }], this);
		}
	}

	const globalResizeObserver = global.ResizeObserver;
	global.ResizeObserver = MockResize;
	return {
		mockResize,
		restore: () => {
			global.ResizeObserver = globalResizeObserver;
		},
		reset: () => {
			refMap = new Map();
			mockNodes = {};
		},
		trigger: (key: string, contentRect: DOMRectReadOnly) => {
			const ref = mockNodes[key];
			if (ref) {
				const mock = refMap.get(ref);
				if (mock) {
					mock.trigger(contentRect);
				}
			}
		},
		stubNode: (key: string) => {
			mockNodes[key] = {};
		}
	};
}

export function createIntersectionMock() {
	let mockNodes: any = {};
	const mockNode = {
		get(key: string) {
			return mockNodes[key];
		}
	};

	const factory = create({ destroy, cache, invalidator });

	const mockIntersection = factory(({ id, middleware, properties, children }) => {
		const { callback } = intersection();
		return callback({ id, middleware: { ...middleware, node: mockNode }, properties, children });
	});

	let refMap = new Map();

	class MockIntersection {
		private _cb: (entries: Partial<ExtendedIntersectionObserverEntry>[]) => void;
		private _ref: any;
		constructor(cb: any) {
			this._cb = cb;
		}
		public observe(ref: any) {
			this._ref = ref;
			refMap.set(ref, this);
		}
		public trigger(intersectionDetails: IntersectionResult) {
			this._cb([{ ...intersectionDetails, target: this._ref }]);
		}
	}

	const globalIntersection = global.IntersectionObserver;
	global.IntersectionObserver = MockIntersection;
	return {
		mockIntersection,
		restore: (): void => {
			global.IntersectionObserver = globalIntersection;
		},
		reset: (): void => {
			refMap = new Map();
			mockNodes = {};
		},
		trigger: (key: string, intersectionDetails: IntersectionResult) => {
			const ref = mockNodes[key];
			if (ref) {
				const mock = refMap.get(ref);
				if (mock) {
					mock.trigger(intersectionDetails);
				}
			}
		},
		stubNode: (key: string) => {
			mockNodes[key] = {};
		}
	};
}
