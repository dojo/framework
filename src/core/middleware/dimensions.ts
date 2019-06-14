import { create, node } from '../vdom';
import { DimensionResults } from '../meta/Dimensions';

const factory = create({ node });

const defaultDimensions = {
	client: {
		height: 0,
		left: 0,
		top: 0,
		width: 0
	},
	offset: {
		height: 0,
		left: 0,
		top: 0,
		width: 0
	},
	position: {
		bottom: 0,
		left: 0,
		right: 0,
		top: 0
	},
	scroll: {
		height: 0,
		left: 0,
		top: 0,
		width: 0
	},
	size: {
		width: 0,
		height: 0
	}
};

export const dimensions = factory(({ middleware: { node } }) => {
	return {
		get(key: string | number): Readonly<DimensionResults> {
			const domNode = node.get(key);
			if (!domNode) {
				return {
					client: { ...defaultDimensions.client },
					offset: { ...defaultDimensions.offset },
					position: { ...defaultDimensions.position },
					scroll: { ...defaultDimensions.scroll },
					size: { ...defaultDimensions.size }
				};
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
			return result;
		}
	};
});

export default dimensions;
