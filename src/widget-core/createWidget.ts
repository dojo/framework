import { ComposeFactory } from 'dojo-compose/compose';
import createRenderMixin, { RenderMixin, RenderMixinOptions, RenderMixinState } from './mixins/createRenderMixin';
import createVNodeEvented, { VNodeEvented, VNodeEventedOptions } from './mixins/createVNodeEvented';

export type WidgetState = RenderMixinState;

export type WidgetOptions<S extends WidgetState> = RenderMixinOptions<S> & VNodeEventedOptions;

export type Widget<S extends WidgetState> = RenderMixin<S> & VNodeEvented;

export interface WidgetFactory extends ComposeFactory<Widget<WidgetState>, WidgetOptions<WidgetState>> {
	<S extends WidgetState>(options?: WidgetOptions<S>): Widget<S>;
}

const createWidget: WidgetFactory = createRenderMixin
	.mixin(createVNodeEvented);

export default createWidget;
