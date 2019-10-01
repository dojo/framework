import { create, destroy, invalidator, node } from '../../../core/vdom';
import resize from '../../../core/middleware/resize';
import icache from '../../../core/middleware/icache';
import breakpoint, { Breakpoints } from '../../../core/middleware/breakpoint';
import createResizeMock from './resize';
import { DefaultMiddlewareResult } from '../../../core/interfaces';

export function createBreakpointMock(breakpoints: Breakpoints = { SM: 0, MD: 576, LG: 768, XL: 960 }) {
	const mockBreakpoints: any = {};
	const defaultBreakpoints = breakpoints;
	const resizeMockFactory = createResizeMock();
	const factory = create({ resize, node, destroy, icache, invalidator });

	const mockBreakpointFactory = factory((payload) => {
		const { id, properties, children } = payload;
		const { callback } = breakpoint();
		const mock = callback({
			id,
			middleware: { resize: resizeMockFactory().callback(payload) },
			properties,
			children
		});

		return {
			get(key: string | number, breakpoints: Breakpoints = defaultBreakpoints) {
				const result = mock.get(key, breakpoints);
				if (mockBreakpoints[key]) {
					return {
						breakpoint: mockBreakpoints[key].breakpoint || (result && result.breakpoint),
						contentRect: result && result.contentRect
					};
				}
				return null;
			}
		};
	});

	function mockBreakpoint(): DefaultMiddlewareResult;
	function mockBreakpoint(
		key: string,
		breakpointResult: {
			breakpoint: string;
			contentRect: Partial<DOMRectReadOnly>;
		}
	): void;
	function mockBreakpoint(
		key?: string,
		breakpointResult?: {
			breakpoint: string;
			contentRect: Partial<DOMRectReadOnly>;
		}
	): void | DefaultMiddlewareResult {
		if (key && breakpointResult) {
			if (!mockBreakpoints[key]) {
				mockBreakpoints[key] = breakpointResult.breakpoint;
			}
			resizeMockFactory(key, breakpointResult.contentRect);
		} else {
			return mockBreakpointFactory();
		}
	}

	return mockBreakpoint;
}

export default createBreakpointMock;
