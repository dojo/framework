import { create, node } from '../vdom';
import { resize } from './resize';
import { cache } from './cache';

const factory = create({ node, resize, cache });

export const dimensions = factory(({ middleware: { node, resize, cache } }) => {
	return {
		get(key: string | number) {
			const contentRect = resize.get(key);
			if (contentRect) {
				const cached = cache.get(contentRect);
				if (cached) {
					return cached;
				}
			}

			const domNode = node.get(key);
			if (!domNode) {
				return null;
			}

			const boundingDimensions = domNode.getBoundingClientRect();
			const result = {
				client: {
					height: domNode.clientHeight,
					left: domNode.clientLeft,
					top: domNode.clientTop,
					width: domNode.clientWidth
				},
				offset: {
					height: domNode.offsetHeight,
					left: domNode.offsetLeft,
					top: domNode.offsetTop,
					width: domNode.offsetWidth
				},
				position: {
					bottom: boundingDimensions.bottom,
					left: boundingDimensions.left,
					right: boundingDimensions.right,
					top: boundingDimensions.top
				},
				scroll: {
					height: domNode.scrollHeight,
					left: domNode.scrollLeft,
					top: domNode.scrollTop,
					width: domNode.scrollWidth
				},
				size: {
					width: boundingDimensions.width,
					height: boundingDimensions.height
				}
			};
			cache.set(contentRect, result);
		}
	};
});

export default dimensions;
