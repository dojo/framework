import { ComposeFactory } from 'dojo-compose/compose';
import createWidgetBase from './bases/createWidgetBase';
import { Widget, WidgetOptions, WidgetState } from 'dojo-interfaces/widgetBases';
import createParentListMixin, { ParentListMixin, ParentListMixinOptions } from './mixins/createParentListMixin';
import createRenderableChildrenMixin from './mixins/createRenderableChildrenMixin';
import createStatefulChildrenMixin, { StatefulChildrenState, StatefulChildrenOptions } from './mixins/createStatefulChildrenMixin';
import { Child } from './mixins/interfaces';

export interface LayoutContainerState extends WidgetState, StatefulChildrenState { }

export type LayoutContainerOptions = WidgetOptions<LayoutContainerState> & ParentListMixinOptions<Child> & StatefulChildrenOptions<Child, LayoutContainerState>;

export type LayoutContainer = Widget<LayoutContainerState> & ParentListMixin<Child>;

export interface LayoutContainerFactory extends ComposeFactory<LayoutContainer, LayoutContainerOptions> { }

const createContainer: LayoutContainerFactory = createWidgetBase
	.mixin(createParentListMixin)
	.mixin(createRenderableChildrenMixin)
	.mixin(createStatefulChildrenMixin)
	.extend({
		tagName: 'dojo-container-layout'
	});

export default createContainer;
