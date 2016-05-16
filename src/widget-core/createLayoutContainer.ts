import { ComposeFactory } from 'dojo-compose/compose';
import createWidget, { Widget, WidgetState, WidgetOptions } from './createWidget';
import createParentMixin, { ParentMixin, ParentMixinOptions, Child } from './mixins/createParentMixin';
import createRenderableChildrenMixin from './mixins/createRenderableChildrenMixin';

export interface LayoutContainerOptions extends WidgetOptions<WidgetState>, ParentMixinOptions<Child> { }

export type LayoutContainer = Widget<WidgetState> & ParentMixin<Child>;

export interface LayoutContainerFactory extends ComposeFactory<LayoutContainer, LayoutContainerOptions> { }

const createContainer: LayoutContainerFactory = createWidget
	.mixin(createParentMixin)
	.mixin(createRenderableChildrenMixin)
	.extend({
		tagName: 'dojo-container-layout'
	});

export default createContainer;
