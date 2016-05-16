import { ComposeFactory } from 'dojo-compose/compose';
import createWidget, { Widget, WidgetState, WidgetOptions } from './createWidget';
import createTabbedMixin, { TabbedMixin, TabbedChild, TabbedMixinOptions } from './mixins/createTabbedMixin';

export interface TabbedPanelOptions extends WidgetOptions<WidgetState>, TabbedMixinOptions { }

export type TabbedPanel = Widget<WidgetState> & TabbedMixin<TabbedChild>;

export interface TabbedPanelFactory extends ComposeFactory<TabbedPanel, TabbedPanelOptions> { }

const createTabbedPanel: TabbedPanelFactory = createWidget
	.mixin(createTabbedMixin)
	.extend({
		tagName: 'dojo-panel-tabbed'
	});

export default createTabbedPanel;
