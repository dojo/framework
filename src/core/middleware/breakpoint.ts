import { create } from '../vdom';
import { resize } from './resize';

const factory = create({ resize });

const defaultBreakpoints: any = { SM: 0, MD: 576, LG: 768, XL: 960 };

export const breakpoint = factory(({ middleware: { resize } }) => {
	return (key: string | number, breakpoints: any = defaultBreakpoints) => {
		const contentRect = resize.get(key);
		if (!contentRect) {
			return null;
		}
		let currentBreakpoint = null;

		const keys = Object.keys(breakpoints);
		for (let i = 0; i < keys.length; i++) {
			const breakpoint = breakpoints[keys[i]];
			if (contentRect.width >= breakpoint && (!currentBreakpoint || breakpoint > currentBreakpoint.size)) {
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
	};
});

export default breakpoint;
