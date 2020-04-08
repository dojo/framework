import { create, invalidator, diffProperty, destroy, node } from '../../../core/vdom';
import focus, { FocusState } from '../../../core/middleware/focus';
import { createICacheMiddleware } from '../../../core/middleware/icache';
import { DefaultMiddlewareResult } from '../../../core/interfaces';

const icache = createICacheMiddleware<FocusState>();
export function createFocusMock() {
	const focusNodes: { [key: string]: boolean } = {};
	let invalidate: () => void | undefined;

	const factory = create({ invalidator, destroy, icache, diffProperty, node });

	const mockFocusFactory = factory(({ id, middleware, properties, children }) => {
		invalidate = middleware.invalidator;
		const { callback } = focus();
		const focusMiddleware = callback({
			id,
			middleware,
			properties,
			children
		});

		focusMiddleware.isFocused = (key: string | number) => !!focusNodes[key];

		return focusMiddleware;
	});

	function mockFocus(): DefaultMiddlewareResult;
	function mockFocus(key: string | number, value: boolean): void;
	function mockFocus(key?: string | number, value?: boolean): void | DefaultMiddlewareResult {
		if (key && value) {
			focusNodes[key] = value;
			invalidate && invalidate();
		} else {
			return mockFocusFactory();
		}
	}

	return mockFocus;
}

export default createFocusMock;
