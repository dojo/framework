import { create, invalidator } from '../../../core/vdom';
import { DefaultMiddlewareResult } from '../../../core/interfaces';

export function createNodeMock() {
	const nodes: any = {};
	let invalidate: () => void | undefined;

	const factory = create({ invalidator });

	const mockNodeFactory = factory(({ middleware }) => {
		invalidate = middleware.invalidator;
		return {
			get(key: string) {
				return nodes[key] || null;
			}
		};
	});

	function mockNode(): DefaultMiddlewareResult;
	function mockNode(key: string, element: any): void;
	function mockNode(key?: string, element?: any): void | DefaultMiddlewareResult {
		if (key) {
			if (!nodes[key]) {
				nodes[key] = element;
				invalidate && invalidate();
			}
		} else {
			return mockNodeFactory();
		}
	}

	return mockNode;
}

export default createNodeMock;
