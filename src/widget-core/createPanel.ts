import { ComposeFactory } from 'dojo-compose/compose';
import { EventedListener, TargettedEventObject } from 'dojo-compose/mixins/createEvented';
import { StateChangeEvent } from 'dojo-compose/mixins/createStateful';
import { Handle } from 'dojo-core/interfaces';
import createWidget, { Widget, WidgetState, WidgetOptions } from './createWidget';
import createCloseableMixin, { Closeable, CloseableState, CloseEvent } from './mixins/createCloseableMixin';
import createContainerMixin, { ContainerMixin, ContainerMixinState, ContainerMixinOptions } from './mixins/createContainerMixin';
import { Child } from './mixins/createParentMixin';

export interface PanelState extends WidgetState, CloseableState, ContainerMixinState {
	label?: string;
}

export interface PanelOptions extends WidgetOptions<PanelState>, ContainerMixinOptions<PanelState> { }

export interface Panel extends Widget<PanelState>, Closeable<PanelState>, ContainerMixin<Child, PanelState> {
	on(type: 'close', listener: EventedListener<CloseEvent>): Handle;
	on(type: 'statechange', listener: EventedListener<StateChangeEvent<PanelState>>): Handle;
	on(type: string, listener: EventedListener<TargettedEventObject>): Handle;
}

export interface PanelFactory extends ComposeFactory<Panel, PanelOptions> { }

const createPanel: PanelFactory = createWidget
	.mixin(createCloseableMixin)
	.mixin(createContainerMixin)
	.extend({
		tagName: 'dojo-panel'
	});

export default createPanel;
