import global from '../../../shim/global';
import { create, destroy, invalidator } from '../../../core/vdom';
import icache from '../../../core/middleware/icache';
import intersection from '../../../core/middleware/intersection';
import { ExtendedIntersectionObserverEntry, IntersectionResult } from '../../../core/meta/Intersection';
import { DefaultMiddlewareResult } from '../../../core/interfaces';

export function createIntersectionMock() {
	const mockNodes: any = {};
	const refMap = new Map();
	const mockNode = {
		get(key: string) {
			return mockNodes[key];
		}
	};
	let invalidate: () => void | undefined;

	const factory = create({ destroy, icache, invalidator });

	const mockIntersectionFactory = factory(({ id, middleware, properties, children }) => {
		const { callback } = intersection();
		invalidate = middleware.invalidator;
		return callback({ id, middleware: { ...middleware, node: mockNode }, properties, children });
	});

	global.IntersectionObserver = class MockIntersection {
		private _cb: (entries: Partial<ExtendedIntersectionObserverEntry>[]) => void;
		private _ref: any;
		constructor(cb: any) {
			this._cb = cb;
		}
		public observe(ref: any) {
			this._ref = ref;
			refMap.set(ref, this);
			this._cb([{ ...ref, target: this._ref }]);
		}
		public intersection(intersectionDetails: IntersectionResult) {
			this._cb([{ ...intersectionDetails, target: this._ref }]);
		}
	};

	function mockIntersection(): DefaultMiddlewareResult;
	function mockIntersection(key: string, intersectionDetails: Partial<IntersectionResult>): void;
	function mockIntersection(
		key?: string,
		intersectionDetails?: Partial<IntersectionResult>
	): void | DefaultMiddlewareResult {
		if (key) {
			if (!mockNodes[key]) {
				mockNodes[key] = intersectionDetails;
			}
			const ref = mockNodes[key];
			const mock = refMap.get(ref);
			if (mock) {
				mock.intersection(intersectionDetails);
			} else {
				invalidate && invalidate();
			}
		} else {
			return mockIntersectionFactory();
		}
	}

	return mockIntersection;
}

export default createIntersectionMock;
