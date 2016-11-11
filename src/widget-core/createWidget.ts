import { ComposeFactory } from 'dojo-compose/compose';
import createWidgetBase from './bases/createWidgetBase';
import { Widget, WidgetOptions, WidgetState } from 'dojo-interfaces/widgetBases';
import createVNodeEvented, { VNodeEvented, VNodeEventedOptions } from './mixins/createVNodeEvented';

export type WidgetState = WidgetState;

export type WidgetOptions<S extends WidgetState> = WidgetOptions<S> & VNodeEventedOptions;

export type Widget<S extends WidgetState> = Widget<S> & VNodeEvented;

export interface WidgetFactory extends ComposeFactory<Widget<WidgetState>, WidgetOptions<WidgetState>> {
	<S extends WidgetState>(options?: WidgetOptions<S>): Widget<S>;
}

const createWidget: WidgetFactory = createWidgetBase
	.mixin(createVNodeEvented);

export default createWidget;
