import { ComposeFactory } from 'dojo-compose/compose';
import { VNodeProperties } from 'dojo-interfaces/vdom';
import createWidgetBase from '../../createWidgetBase';
import { Widget, WidgetOptions, WidgetState } from './../../interfaces';
import createVNodeEvented, { VNodeEvented, VNodeEventedOptions } from '../../mixins/createVNodeEvented';
import createFormFieldMixin, { FormFieldMixin, FormFieldMixinState, FormFieldMixinOptions } from '../../mixins/createFormFieldMixin';

export interface ButtonState extends WidgetState, FormFieldMixinState<string> {
	label?: string;
}

export interface ButtonOptions extends VNodeEventedOptions, WidgetOptions<ButtonState>, FormFieldMixinOptions<any, ButtonState> { }

export type Button = Widget<ButtonState> & FormFieldMixin<string, ButtonState> & VNodeEvented;

export interface ButtonFactory extends ComposeFactory<Button, ButtonOptions> { }

const createButton: ButtonFactory = createWidgetBase
	.mixin(createFormFieldMixin)
	.mixin(createVNodeEvented)
	.mixin({
		mixin: {
			nodeAttributes: [
				function(this: Button): VNodeProperties {
					return { innerHTML: this.state.label };
				}
			],
			tagName: 'button',
			type: 'button'
		}
	});

export default createButton;
