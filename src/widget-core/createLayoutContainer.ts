import { ComposeFactory } from 'dojo-compose/compose';
import createWidget, { Widget, WidgetState, WidgetOptions } from './createWidget';
import createParentListMixin, { ParentListMixin, ParentListMixinOptions } from './mixins/createParentListMixin';
import createRenderableChildrenMixin from './mixins/createRenderableChildrenMixin';
import createStatefulChildrenMixin, { StatefulChildrenState, StatefulChildrenOptions } from './mixins/createStatefulChildrenMixin';
import { Child } from './mixins/interfaces';

export interface LayoutContainerState extends WidgetState, StatefulChildrenState { }

export interface LayoutContainerOptions extends WidgetOptions<LayoutContainerState>, ParentListMixinOptions<Child>, StatefulChildrenOptions<Child, LayoutContainerState> { }

export type LayoutContainer = Widget<LayoutContainerState> & ParentListMixin<Child>;

export interface LayoutContainerFactory extends ComposeFactory<LayoutContainer, LayoutContainerOptions> { }

const createContainer: LayoutContainerFactory = createWidget
	.mixin(createParentListMixin)
	.mixin(createRenderableChildrenMixin)
	.mixin(createStatefulChildrenMixin)
	.extend({
		tagName: 'dojo-container-layout'
	});

export default createContainer;
