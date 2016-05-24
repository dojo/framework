import { ComposeFactory } from 'dojo-compose/compose';
import createWidget, { Widget, WidgetState, WidgetOptions } from './createWidget';
import createParentMixin, { ParentMixin, ParentMixinOptions, Child } from './mixins/createParentMixin';
import createRenderableChildrenMixin from './mixins/createRenderableChildrenMixin';
import createStatefulChildrenMixin, { StatefulChildrenState, StatefulChildrenOptions } from './mixins/createStatefulChildrenMixin';

export interface LayoutContainerState extends WidgetState, StatefulChildrenState { }

export interface LayoutContainerOptions extends WidgetOptions<LayoutContainerState>, ParentMixinOptions<Child>, StatefulChildrenOptions<Child, LayoutContainerState> { }

export type LayoutContainer = Widget<LayoutContainerState> & ParentMixin<Child>;

export interface LayoutContainerFactory extends ComposeFactory<LayoutContainer, LayoutContainerOptions> { }

const createContainer: LayoutContainerFactory = createWidget
	.mixin(createParentMixin)
	.mixin(createRenderableChildrenMixin)
	.mixin(createStatefulChildrenMixin)
	.extend({
		tagName: 'dojo-container-layout'
	});

export default createContainer;
