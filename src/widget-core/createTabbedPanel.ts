import { ComposeFactory } from 'dojo-compose/compose';
import createWidgetBase from './bases/createWidgetBase';
import { Widget, WidgetOptions, WidgetState } from 'dojo-interfaces/widgetBases';
import createTabbedMixin, { TabbedMixin, TabbedChild, TabbedMixinOptions } from './mixins/createTabbedMixin';
import createStatefulChildrenMixin, { StatefulChildrenState, StatefulChildrenOptions } from './mixins/createStatefulChildrenMixin';
import css from './themes/structural/modules/TabbedPanel';

export interface TabbedPanelState extends WidgetState, StatefulChildrenState { }

export type TabbedPanelOptions = WidgetOptions<TabbedPanelState> & TabbedMixinOptions<TabbedChild, TabbedPanelState> & StatefulChildrenOptions<TabbedChild, TabbedPanelState>;

export type TabbedPanel = Widget<WidgetState> & TabbedMixin<TabbedChild>;

export interface TabbedPanelFactory extends ComposeFactory<TabbedPanel, TabbedPanelOptions> { }

const createTabbedPanel: TabbedPanelFactory = createWidgetBase
	.mixin(createTabbedMixin)
	.mixin(createStatefulChildrenMixin)
	.mixin({
		mixin: {
			tagName: 'dojo-panel-tabbed',
			classes: [ css.tabs ]
		}
	});

export default createTabbedPanel;
