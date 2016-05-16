import { ComposeFactory } from 'dojo-compose/compose';
import createWidget, { Widget, WidgetState, WidgetOptions } from './createWidget';
import createParentMixin, { ParentMixin, Child } from './mixins/createParentMixin';
import createRenderableChildrenMixin from './mixins/createRenderableChildrenMixin';

export interface ContainerOptions extends WidgetOptions<WidgetState> { }

export type Container = Widget<WidgetState> & ParentMixin<Child>;

export interface ContainerFactory extends ComposeFactory<Container, ContainerOptions> { }

const createContainer: ContainerFactory = createWidget
	.mixin(createParentMixin)
	.mixin(createRenderableChildrenMixin)
	.extend({
		tagName: 'dojo-container'
	});

export default createContainer;
