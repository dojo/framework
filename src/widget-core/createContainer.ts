import { ComposeFactory } from 'dojo-compose/compose';
import createWidgetBase from './bases/createWidgetBase';
import { Widget, WidgetOptions, WidgetState } from 'dojo-interfaces/widgetBases';
import createParentListMixin, { ParentListMixin } from './mixins/createParentListMixin';
import createRenderableChildrenMixin from './mixins/createRenderableChildrenMixin';
import createStatefulChildrenMixin, { StatefulChildrenState, StatefulChildrenOptions } from './mixins/createStatefulChildrenMixin';
import { Child } from './mixins/interfaces';

export interface ContainerState extends WidgetState, StatefulChildrenState { }

export type ContainerOptions = WidgetOptions<ContainerState> & StatefulChildrenOptions<Child, ContainerState>;

export type Container = Widget<WidgetState> & ParentListMixin<Child>;

export interface ContainerFactory extends ComposeFactory<Container, ContainerOptions> { }

const createContainer: ContainerFactory = createWidgetBase
	.mixin(createParentListMixin)
	.mixin(createRenderableChildrenMixin)
	.mixin(createStatefulChildrenMixin)
	.override({
		tagName: 'dojo-container'
	});

export default createContainer;
