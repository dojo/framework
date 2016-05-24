import { ComposeFactory } from 'dojo-compose/compose';
import createWidget, { Widget, WidgetState, WidgetOptions } from './createWidget';
import createTabbedMixin, { TabbedMixin, TabbedChild, TabbedMixinOptions, TabbedChildState } from './mixins/createTabbedMixin';

export interface TabbedPanelOptions extends WidgetOptions<TabbedChildState>, TabbedMixinOptions { }

export type TabbedPanel = Widget<WidgetState> & TabbedMixin<TabbedChild>;

export interface TabbedPanelFactory extends ComposeFactory<TabbedPanel, TabbedPanelOptions> { }

const createTabbedPanel: TabbedPanelFactory = createWidget
	.mixin(createTabbedMixin)
	.extend({
		tagName: 'dojo-panel-tabbed'
	});

export default createTabbedPanel;
