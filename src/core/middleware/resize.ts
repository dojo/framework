import ResizeObserver, { DOMRectReadOnly } from '../../shim/ResizeObserver';
import { create, node, destroy } from '../vdom';
import { icache } from './icache';

const factory = create({ node, destroy, icache });

export const resize = factory(({ middleware: { node, destroy, icache } }) => {
	const keys: (string | number)[] = [];
	const handles: Function[] = [];
	destroy(() => {
		let handle: any;
		while ((handle = handles.pop())) {
			handle && handle();
		}
	});
	return {
		get(key: string | number): DOMRectReadOnly | null {
			const domNode = node.get(key);
			if (!domNode) {
				return null;
			}

			if (keys.indexOf(key) === -1) {
				keys.push(key);
				const resizeObserver = new ResizeObserver(([entry]) => {
					icache.set(key, entry.contentRect);
				});
				resizeObserver.observe(domNode);
				handles.push(() => resizeObserver.disconnect());
			}
			return icache.get<DOMRectReadOnly>(key) || null;
		}
	};
});

export default resize;
