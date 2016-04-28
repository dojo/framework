import { ComposeFactory } from 'dojo-compose/compose';
import createDestroyable, { Destroyable } from 'dojo-compose/mixins/createDestroyable';
import createEvented, { Evented, EventedOptions, EventedListener, TargettedEventObject } from 'dojo-compose/mixins/createEvented';
import createStateful, { Stateful, StatefulOptions, StateChangeEvent } from 'dojo-compose/mixins/createStateful';
import { Handle } from 'dojo-core/interfaces';
import createCachedRenderMixin, { CachedRenderMixin, CachedRenderState, CachedRenderParent } from './mixins/createCachedRenderMixin';
import createRenderable, { Renderable, RenderableOptions } from './mixins/createRenderable';
import createVNodeEvented, { VNodeEvented } from './mixins/createVNodeEvented';

export interface WidgetState extends CachedRenderState { }

export interface WidgetOptions<S extends WidgetState> extends StatefulOptions<S>, EventedOptions, RenderableOptions { }

export interface Widget<S extends WidgetState> extends Stateful<S>, Destroyable, Evented, Renderable, VNodeEvented, CachedRenderMixin<S> {
	parent?: CachedRenderParent;

	on(type: 'statechange', listener: EventedListener<StateChangeEvent<S>>): Handle;
	on(type: string, listener: EventedListener<TargettedEventObject>): Handle;
}

export interface WidgetFactory extends ComposeFactory<Widget<WidgetState>, WidgetOptions<WidgetState>> {
	<S extends WidgetState>(options?: WidgetOptions<S>): Widget<S>;
}

const createWidget: WidgetFactory = createStateful
	.mixin(createDestroyable)
	.mixin(createEvented)
	.mixin(createRenderable)
	.mixin(createVNodeEvented)
	.mixin(createCachedRenderMixin);

export default createWidget;
