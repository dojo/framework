import { create, invalidator } from '../../../core/vdom';
import { MiddlewareResult } from '../../../core/interfaces';

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

	function mockNode(): MiddlewareResult<any, any, any, any>;
	function mockNode(key: string, element: any): void;
	function mockNode(key?: string, element?: any): void | MiddlewareResult<any, any, any, any> {
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
