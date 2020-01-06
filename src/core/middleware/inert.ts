import { create, node, destroy } from '../vdom';
import { from as arrayFrom } from '../../shim/array';
import Map from '../../shim/Map';
import '../../shim/inert';

const factory = create({ node, destroy });

export const inert = factory(({ middleware: { node, destroy } }) => {
	const inertInvertedNodeMap = new Map<string | number, any[]>();
	destroy(() => {
		inertInvertedNodeMap.forEach((nodes) => {
			nodes.forEach((node) => {
				node.inert = false;
			});
		});
		inertInvertedNodeMap.clear();
	});
	return {
		set(key: string | number, enable: boolean, invert: boolean = false): void {
			const domNode = node.get(key) as any;
			if (!domNode) {
				return;
			}

			if (invert) {
				const inertNodes = inertInvertedNodeMap.get(key) || [];
				if (enable) {
					domNode.inert = false;
					if (domNode.parentNode) {
						const children = arrayFrom(domNode.parentNode.children) as any[];
						for (let i = 0; i < children.length; i++) {
							if (domNode !== children[i] && inertNodes.indexOf(children[i]) === -1) {
								children[i].inert = true;
								inertNodes.push(children[i]);
							}
						}
					}
					inertInvertedNodeMap.set(key, inertNodes);
				} else {
					if (inertNodes.length) {
						inertNodes.forEach((node) => {
							node.inert = false;
						});
						inertInvertedNodeMap.delete(key);
					}
				}
			} else {
				domNode.inert = enable;
			}
		}
	};
});

export default inert;
