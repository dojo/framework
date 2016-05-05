import { ComposeFactory } from 'dojo-compose/compose';
import createWidget, { Widget, WidgetState, WidgetOptions } from './createWidget';
import createContainerMixin, { ContainerMixin, ContainerMixinState, ContainerMixinOptions } from './mixins/createContainerMixin';
import { Child } from './mixins/createParentMixin';

export interface LayoutContainerState extends WidgetState, ContainerMixinState { }

export interface LayoutContainerOptions extends WidgetOptions<LayoutContainerState>, ContainerMixinOptions<LayoutContainerState> { }

export interface LayoutContainer extends Widget<LayoutContainerState>, ContainerMixin<Child, LayoutContainerState> { }

export interface LayoutContainerFactory extends ComposeFactory<LayoutContainer, LayoutContainerOptions> { }

const createContainer: LayoutContainerFactory = createWidget
	.mixin(createContainerMixin)
	.extend({
		tagName: 'dojo-container-layout'
	});

export default createContainer;
