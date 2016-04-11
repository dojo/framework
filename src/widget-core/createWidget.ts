import { ComposeFactory } from 'dojo-compose/compose';
import { EventObject, Handle } from 'dojo-core/interfaces';
import createCachedRenderMixin, { CachedRenderMixin, CachedRenderState, CachedRenderParent } from './mixins/createCachedRenderMixin';
import createDestroyable, { Destroyable } from './mixins/createDestroyable';
import createEvented, { Evented, EventedOptions, EventedListener } from './mixins/createEvented';
import createRenderable, { Renderable, RenderableOptions } from './mixins/createRenderable';
import createStateful, { Stateful, StatefulOptions, StateChangeEvent } from './mixins/createStateful';
import createVNodeEvented, { VNodeEvented } from './mixins/createVNodeEvented';

export interface WidgetState extends CachedRenderState { }

export interface WidgetOptions<S extends WidgetState> extends StatefulOptions<S>, EventedOptions, RenderableOptions { }

export interface Widget<S extends WidgetState> extends Stateful<S>, Destroyable, Evented, Renderable, VNodeEvented, CachedRenderMixin<S> {
	parent?: CachedRenderParent;

	on(type: 'statechange', listener: EventedListener<StateChangeEvent<S>>): Handle;
	on(type: string, listener: EventedListener<EventObject>): Handle;
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
