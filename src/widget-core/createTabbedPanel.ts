import { ComposeFactory } from 'dojo-compose/compose';
import createWidget, { Widget, WidgetState, WidgetOptions } from './createWidget';
import { ContainerMixinOptions } from './mixins/createContainerMixin';
import createTabbedMixin, { TabbedMixin, TabbedState, TabbedChild } from './mixins/createTabbedMixin';

export interface TabbedPanelState extends WidgetState, TabbedState { }

export interface TabbedPanelOptions extends WidgetOptions<TabbedPanelState>, ContainerMixinOptions<TabbedPanelState> { }

export interface TabbedPanel extends Widget<TabbedPanelState>, TabbedMixin<TabbedChild, TabbedPanelState> {
	parent?: TabbedPanel;
}

export interface TabbedPanelFactory extends ComposeFactory<TabbedPanel, TabbedPanelOptions> { }

const createTabbedPanel = createWidget
	.mixin(createTabbedMixin)
	.extend({
		tagName: 'dojo-panel-tabbed'
	}) as TabbedPanelFactory;

export default createTabbedPanel;
