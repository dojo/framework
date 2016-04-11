import { ComposeFactory } from 'dojo-compose/compose';
import createWidget, { Widget, WidgetState, WidgetOptions } from './createWidget';
import createContainerMixin, { ContainerMixin, ContainerMixinState, ContainerMixinOptions } from './mixins/createContainerMixin';
import { Renderable } from './mixins/createRenderable';

export interface ContainerState extends WidgetState, ContainerMixinState { }

export interface ContainerOptions extends WidgetOptions<ContainerState>, ContainerMixinOptions<ContainerState> { }

export interface Container extends Widget<ContainerState>, ContainerMixin<Renderable, ContainerState> { }

export interface ContainerFactory extends ComposeFactory<Container, ContainerOptions> { }

const createContainer: ContainerFactory = createWidget
	.mixin(createContainerMixin)
	.extend({
		tagName: 'dojo-container'
	});

export default createContainer;
