import { create } from '../../../core/vdom';
import { DefaultMiddlewareResult } from '../../../core/interfaces';

const factory = create();

export function createBlockMock(blocks: [Function, any][] = []) {
	const blocksMockMap = new Map(blocks);
	const mockBlockMiddleware = factory(() => {
		return (block: any) => {
			const mock = blocksMockMap.get(block);
			if (mock) {
				return mock;
			}
			return (() => {}) as any;
		};
	});

	function mockBlock(): DefaultMiddlewareResult {
		return mockBlockMiddleware();
	}
	return mockBlock;
}

export default createBlockMock;
