import { ComposeFactory } from 'dojo-compose/compose';
import { EventedOptions } from 'dojo-compose/mixins/createEvented';
import { StatefulOptions } from 'dojo-compose/mixins/createStateful';
import createCachedRenderMixin, { CachedRenderMixin, CachedRenderState } from './mixins/createCachedRenderMixin';
import { RenderableOptions } from './mixins/createRenderable';

export interface WidgetState extends CachedRenderState { }

export interface WidgetOptions<S extends WidgetState> extends StatefulOptions<S>, EventedOptions, RenderableOptions { }

export type Widget<S extends WidgetState> = CachedRenderMixin<S>;

export interface WidgetFactory extends ComposeFactory<Widget<WidgetState>, WidgetOptions<WidgetState>> {
	<S extends WidgetState>(options?: WidgetOptions<S>): Widget<S>;
}

const createWidget: WidgetFactory = createCachedRenderMixin;

export default createWidget;
