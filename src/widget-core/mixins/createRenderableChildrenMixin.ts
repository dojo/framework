import { VNode } from 'maquette/maquette';
import { List } from 'immutable/immutable';
import compose, { ComposeFactory } from 'dojo-compose/compose';
import { from as arrayFrom } from 'dojo-shim/array';
import { Child, ChildEntry } from './interfaces';

export interface RenderableChildrenOptions {
	/**
	 * An optional method which can be used to sort the children
	 */
	sort?: <C extends Child>(valueA: ChildEntry<C>, valueB: ChildEntry<C>) => number;
}

export interface RenderableChildrenMixin {
	/**
	 * Return an array of VNodes/strings the represent the rendered results of the children of this instance
	 */
	getChildrenNodes(): (VNode | string)[];

	/**
	 * An optional method which can be used to sort the children when they are rendered
	 * @param valueA The first entry to be compared
	 * @param valueB The second entry to be compared
	 */
	sort?<C extends Child>(valueA: ChildEntry<C>, valueB: ChildEntry<C>): number;
}

export interface RenderableChildrenFactory extends ComposeFactory<RenderableChildrenMixin, RenderableChildrenOptions> {}

const createRenderableChildrenMixin: RenderableChildrenFactory = compose<RenderableChildrenMixin, RenderableChildrenOptions>({
	getChildrenNodes(): (VNode | string)[] {
		/* When this gets mixed in, if we had the children as part of the interface, we would end up overwritting what is
		 * likely a get accessor for the children, so to protect ourselves, we won't have it part of the interface */
		const renderableChildren: RenderableChildrenMixin & {
			children: List<Child>; /* While this could be a Map, it still has .enteries and .forEach that behave in the
									* same way as we would expect in order to provide the functionality at runtime */
		} = this;
		const results: (VNode | string)[] = [];
		const { children, sort } = renderableChildren;
		if (sort) {
			arrayFrom(<ChildEntry<Child>[]> <any> children.entries()).sort(sort)
				.forEach(([ , child ]) => results.push(child.render()));
		}
		else {
			children.forEach((child) => results.push(child.render()));
		}
		return results;
	}
}, (instance, options) => {
	if (options) {
		instance.sort = options.sort;
	}
});

export default createRenderableChildrenMixin;
