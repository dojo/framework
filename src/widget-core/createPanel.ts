import { ComposeFactory } from 'dojo-compose/compose';
import createWidget, { Widget, WidgetState, WidgetOptions } from './createWidget';
import createCloseableMixin, { Closeable, CloseableState } from './mixins/createCloseableMixin';
import createParentMixin, { ParentMixin, ParentMixinOptions, Child } from './mixins/createParentMixin';
import createRenderableChildrenMixin from './mixins/createRenderableChildrenMixin';

export interface PanelState extends WidgetState, CloseableState {
	label?: string;
}

export interface PanelOptions extends WidgetOptions<PanelState>, ParentMixinOptions<Child> { }

export type Panel = Widget<PanelState> & Closeable & ParentMixin<Child>;

export interface PanelFactory extends ComposeFactory<Panel, PanelOptions> { }

const createPanel: PanelFactory = createWidget
	.mixin(createCloseableMixin)
	.mixin(createParentMixin)
	.mixin(createRenderableChildrenMixin)
	.extend({
		tagName: 'dojo-panel'
	});

export default createPanel;
