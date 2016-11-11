import { DNode } from 'dojo-interfaces/widgetBases';
import { List } from 'immutable';
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
	getChildrenNodes(): DNode[];

	/**
	 * An optional method which can be used to sort the children when they are rendered
	 * @param valueA The first entry to be compared
	 * @param valueB The second entry to be compared
	 */
	sort?<C extends Child>(valueA: ChildEntry<C>, valueB: ChildEntry<C>): number;
}

export interface RenderableChildrenFactory extends ComposeFactory<RenderableChildrenMixin, RenderableChildrenOptions> {}

const createRenderableChildrenMixin: RenderableChildrenFactory = compose<RenderableChildrenMixin, RenderableChildrenOptions>({
	/* When this gets mixed in, if we had the children as part of the interface, we would end up overwritting what is
	 * likely a get accessor for the children, so to protect ourselves, we won't have it part of the interface */
	getChildrenNodes(this: RenderableChildrenMixin & { children: List<Child>; }): DNode[] {
		const { children, sort } = this;
		/* children is not guarunteed to be set, therefore need to guard against it */
		if (children) {
			const results: DNode[] = [];
			if (sort) {
				arrayFrom(<ChildEntry<Child>[]> <any> children.entries()).sort(sort)
					.forEach(([ , child ]) => results.push({ children: [], render: child.render.bind(child) }));
			}
			else {
				children.forEach((child) => {
					// Workaround for https://github.com/facebook/immutable-js/pull/919
					// istanbul ignore else
					if (child) {
						results.push({ children: [], render: child.render.bind(child) });
					}
				});
			}
			return results;
		}
		else {
			return [];
		}
	}
}, (instance, options) => {
	if (options) {
		instance.sort = options.sort;
	}
});

export default createRenderableChildrenMixin;
