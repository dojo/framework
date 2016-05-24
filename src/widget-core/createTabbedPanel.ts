import { ComposeFactory } from 'dojo-compose/compose';
import createWidget, { Widget, WidgetState, WidgetOptions } from './createWidget';
import createTabbedMixin, { TabbedMixin, TabbedChild, TabbedMixinOptions } from './mixins/createTabbedMixin';
import { CachedRenderState } from './mixins/createCachedRenderMixin';
import createStatefulChildrenMixin, { StatefulChildrenState, StatefulChildrenOptions } from './mixins/createStatefulChildrenMixin';

export interface TabbedPanelState extends WidgetState, CachedRenderState, StatefulChildrenState { }

export interface TabbedPanelOptions extends WidgetOptions<TabbedPanelState>, TabbedMixinOptions<TabbedChild, TabbedPanelState>, StatefulChildrenOptions<TabbedChild, TabbedPanelState> { }

export type TabbedPanel = Widget<WidgetState> & TabbedMixin<TabbedChild>;

export interface TabbedPanelFactory extends ComposeFactory<TabbedPanel, TabbedPanelOptions> { }

const createTabbedPanel: TabbedPanelFactory = createWidget
	.mixin(createTabbedMixin)
	.mixin(createStatefulChildrenMixin)
	.extend({
		tagName: 'dojo-panel-tabbed'
	});

export default createTabbedPanel;
