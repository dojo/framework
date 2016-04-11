import { ComposeFactory } from 'dojo-compose/compose';
import createWidget, { Widget, WidgetState, WidgetOptions } from './createWidget';
import createContainerMixin, { ContainerMixin, ContainerMixinState, ContainerMixinOptions } from './mixins/createContainerMixin';
import { Renderable } from './mixins/createRenderable';

export interface PanelState extends WidgetState, ContainerMixinState {
	label?: string;
}

export interface PanelOptions extends WidgetOptions<PanelState>, ContainerMixinOptions<PanelState> { }

export interface Panel extends Widget<PanelState>, ContainerMixin<Renderable, PanelState> { }

export interface PanelFactory extends ComposeFactory<Panel, PanelOptions> { }

const createPanel: PanelFactory = createWidget
	.mixin(createContainerMixin)
	.extend({
		tagName: 'dojo-panel'
	});

export default createPanel;
