import { VNode } from 'maquette/maquette';
import { List } from 'immutable/immutable';
import compose, { ComposeFactory } from 'dojo-compose/compose';
import { Child } from './createParentMixin';

export interface RenderableChildrenOptions {}

export interface RenderableChildrenMixin {
	/**
	 * Return an array of VNodes/strings the represent the rendered results of the children of this instance
	 */
	getChildrenNodes(): (VNode | string)[];
}

export interface RenderableChildrenFactory extends ComposeFactory<RenderableChildrenMixin, RenderableChildrenOptions> {}

const createRenderableChildrenMixin: RenderableChildrenFactory = compose({
	getChildrenNodes(): (VNode | string)[] {
		/* When this gets mixed in, if we had the children as part of the interface, we would end up overwritting what is
		 * likely a get accessor for the children, so to protect ourselves, we won't have it part of the interface */
		const renderableChildren: RenderableChildrenMixin & {
			children: List<Child>;
		} = this;
		const results: (VNode | string)[] = [];
		/* Converting immutable lists toArray() is expensive */
		renderableChildren.children.forEach((child) => results.push(child.render()));
		return results;
	}
});

export default createRenderableChildrenMixin;
