import { VNode } from 'maquette/maquette';
import { ComposeFactory } from 'dojo-compose/compose';
import { StatefulOptions } from 'dojo-compose/mixins/createStateful';
import createCachedRenderMixin, { CachedRenderMixin, CachedRenderState } from './createCachedRenderMixin';
import createParentMixin, { ParentMixinOptions, ParentMixin, Child } from './createParentMixin';

export interface ContainerChild extends Child {
	parent?: ParentMixin<this>;
}

export interface ContainerMixinOptions<S extends ContainerMixinState> extends StatefulOptions<S>, ParentMixinOptions<ContainerChild> { }

export interface ContainerMixinState extends CachedRenderState { }

export interface ContainerMixin<C extends ContainerChild, S extends ContainerMixinState> extends CachedRenderMixin<S>, ParentMixin<C> {
	/**
	 * Return an array of VNodes/strings the represent the rendered results of the children of this instance
	 */
	getChildrenNodes(): (VNode | string)[];
}

export interface ContainerMixinFactory extends ComposeFactory<ContainerMixin<ContainerChild, ContainerMixinState>, ContainerMixinOptions<ContainerMixinState>> {
	/**
	 * Create a new instance of a Container
	 * @param options Any options to use during creation
	 */
	<R extends ContainerChild>(options?: ContainerMixinOptions<ContainerMixinState>): ContainerMixin<R, ContainerMixinState>;
}

const createContainerMixin: ContainerMixinFactory = createParentMixin
	.mixin(createCachedRenderMixin)
	.extend({
		getChildrenNodes(): (VNode | string)[] {
			const container: ContainerMixin<Child, ContainerMixinState> = this;
			const results: (VNode | string)[] = [];
			/* Converting immutable lists toArray() is expensive */
			container.children.forEach((child) => results.push(child.render()));
			return results;
		}
	});

export default createContainerMixin;
