import { DNode, WidgetOptions, WidgetState } from 'dojo-interfaces/widgetBases';
import compose, { ComposeFactory } from 'dojo-compose/compose';
import { Child } from './interfaces';

export interface RenderableChildrenMixin {
	/**
	 * Return an array of VNodes/strings the represent the rendered results of the children of this instance
	 */
	getChildrenNodes(): DNode[];
}

export interface RenderableChildrenFactory extends ComposeFactory<RenderableChildrenMixin, WidgetOptions<WidgetState>> {}

const createRenderableChildrenMixin: RenderableChildrenFactory = compose<RenderableChildrenMixin, WidgetOptions<WidgetState>>({
	/* When this gets mixed in, if we had the children as part of the interface, we would end up overwritting what is
	 * likely a get accessor for the children, so to protect ourselves, we won't have it part of the interface */
	getChildrenNodes(this: RenderableChildrenMixin & { children: Child[]; }): DNode[] {
		const { children } = this;
		/* children is not guarunteed to be set, therefore need to guard against it */
		if (children) {
			const results: DNode[] = [];
				children.forEach((child) => {
					results.push({ children: [], render: child.render.bind(child) });
				});
			return results;
		}
		else {
			return [];
		}
	}
});

export default createRenderableChildrenMixin;
