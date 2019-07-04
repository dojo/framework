import { create } from '../vdom';
import { resize } from './resize';

export interface Breakpoints {
	[index: string]: number;
}

const factory = create({ resize });

export function createBreakpointMiddleware(breakpoints: Breakpoints = { SM: 0, MD: 576, LG: 768, XL: 960 }) {
	const defaultBreakpoints: Breakpoints = breakpoints;
	const breakpoint = factory(({ middleware: { resize } }) => {
		return {
			get: (key: string | number, breakpoints: Breakpoints = defaultBreakpoints) => {
				const contentRect = resize.get(key);
				if (!contentRect) {
					return null;
				}
				let currentBreakpoint = null;

				const keys = Object.keys(breakpoints);
				for (let i = 0; i < keys.length; i++) {
					const breakpoint = breakpoints[keys[i]];
					if (
						contentRect.width >= breakpoint &&
						(!currentBreakpoint || breakpoint > currentBreakpoint.size)
					) {
						currentBreakpoint = {
							name: keys[i],
							size: breakpoint
						};
					}
				}

				if (currentBreakpoint) {
					return {
						breakpoint: currentBreakpoint.name,
						contentRect
					};
				}
				return null;
			}
		};
	});
	return breakpoint;
}

const breakpoint = createBreakpointMiddleware();

export default breakpoint;
