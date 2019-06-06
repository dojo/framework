import ResizeObserver from '../../shim/ResizeObserver';
import { create, node, invalidator, destroy } from '../vdom';
import { cache } from './cache';
import { ContentRect } from '../meta/Resize';

const factory = create({ node, invalidator, destroy, cache });

export const resize = factory(({ middleware: { node, invalidator, destroy, cache } }) => {
	const keys: (string | number)[] = [];
	const handles: Function[] = [];
	destroy(() => {
		let handle: any;
		while ((handle = handles.pop())) {
			handle && handle();
		}
	});
	return {
		get(key: string | number): ContentRect | null {
			const domNode = node.get(key);
			if (!domNode) {
				return null;
			}

			if (keys.indexOf(key) === -1) {
				keys.push(key);
				const resizeObserver = new ResizeObserver(([entry]) => {
					cache.set(key, entry.contentRect);
					invalidator();
				});
				resizeObserver.observe(domNode);
				handles.push(() => resizeObserver.disconnect());
			}
			return cache.get<ContentRect>(key) || null;
		}
	};
});

export default resize;
