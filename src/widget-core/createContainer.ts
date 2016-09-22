import { ComposeFactory } from 'dojo-compose/compose';
import createWidget, { Widget, WidgetState, WidgetOptions } from './createWidget';
import createParentListMixin, { ParentListMixin } from './mixins/createParentListMixin';
import createRenderableChildrenMixin from './mixins/createRenderableChildrenMixin';
import createStatefulChildrenMixin, { StatefulChildrenState, StatefulChildrenOptions } from './mixins/createStatefulChildrenMixin';
import { Child } from './mixins/interfaces';

export interface ContainerState extends WidgetState, StatefulChildrenState { }

export type ContainerOptions = WidgetOptions<ContainerState> & StatefulChildrenOptions<Child, ContainerState>;

export type Container = Widget<WidgetState> & ParentListMixin<Child>;

export interface ContainerFactory extends ComposeFactory<Container, ContainerOptions> { }

const createContainer: ContainerFactory = createWidget
	.mixin(createParentListMixin)
	.mixin(createRenderableChildrenMixin)
	.mixin(createStatefulChildrenMixin)
	.extend({
		tagName: 'dojo-container'
	});

export default createContainer;
