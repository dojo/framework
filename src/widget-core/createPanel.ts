import { ComposeFactory } from 'dojo-compose/compose';
import createWidgetBase from './bases/createWidgetBase';
import { Widget, WidgetOptions, WidgetState } from 'dojo-interfaces/widgetBases';
import createCloseableMixin, { Closeable, CloseableState } from './mixins/createCloseableMixin';
import createParentListMixin, { ParentListMixin, ParentListMixinOptions } from './mixins/createParentListMixin';
import createRenderableChildrenMixin from './mixins/createRenderableChildrenMixin';
import createStatefulChildrenMixin, { StatefulChildrenState, StatefulChildrenOptions } from './mixins/createStatefulChildrenMixin';
import { Child } from './mixins/interfaces';

export interface PanelState extends WidgetState, CloseableState, StatefulChildrenState {
	label?: string;
}

export type PanelOptions = WidgetOptions<PanelState> & ParentListMixinOptions<Child> & StatefulChildrenOptions<Child, PanelState>;

export type Panel = Widget<PanelState> & Closeable & ParentListMixin<Child>;

export interface PanelFactory extends ComposeFactory<Panel, PanelOptions> { }

const createPanel: PanelFactory = createWidgetBase
	.mixin(createCloseableMixin)
	.mixin(createParentListMixin)
	.mixin(createRenderableChildrenMixin)
	.mixin(createStatefulChildrenMixin)
	.override({
		tagName: 'dojo-panel'
	});

export default createPanel;
