import { ComposeFactory } from 'dojo-compose/compose';
import createWidget, { Widget, WidgetState, WidgetOptions } from './createWidget';
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

const createPanel: PanelFactory = createWidget
	.mixin(createCloseableMixin)
	.mixin(createParentListMixin)
	.mixin(createRenderableChildrenMixin)
	.mixin(createStatefulChildrenMixin)
	.extend({
		tagName: 'dojo-panel'
	});

export default createPanel;
