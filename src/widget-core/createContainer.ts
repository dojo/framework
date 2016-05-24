import { ComposeFactory } from 'dojo-compose/compose';
import createWidget, { Widget, WidgetState, WidgetOptions } from './createWidget';
import createParentMixin, { ParentMixin, Child } from './mixins/createParentMixin';
import createRenderableChildrenMixin from './mixins/createRenderableChildrenMixin';
import createStatefulChildrenMixin, { StatefulChildrenState, StatefulChildrenOptions } from './mixins/createStatefulChildrenMixin';

export interface ContainerState extends WidgetState, StatefulChildrenState { }

export interface ContainerOptions extends WidgetOptions<ContainerState>, StatefulChildrenOptions<Child, ContainerState> { }

export type Container = Widget<WidgetState> & ParentMixin<Child>;

export interface ContainerFactory extends ComposeFactory<Container, ContainerOptions> { }

const createContainer: ContainerFactory = createWidget
	.mixin(createParentMixin)
	.mixin(createRenderableChildrenMixin)
	.mixin(createStatefulChildrenMixin)
	.extend({
		tagName: 'dojo-container'
	});

export default createContainer;
