import { ComposeFactory } from 'dojo-compose/compose';
import createWidget, { Widget, WidgetState, WidgetOptions } from './createWidget';
import createFormFieldMixin, { FormFieldMixin, FormFieldMixinState, FormFieldMixinOptions } from './mixins/createFormFieldMixin';

export interface ButtonState extends WidgetState, FormFieldMixinState<string> { }

export interface ButtonOptions extends WidgetOptions<ButtonState>, FormFieldMixinOptions<any, ButtonState> { }

export interface Button extends Widget<ButtonState>, FormFieldMixin<string, ButtonState> { }

export interface ButtonFactory extends ComposeFactory<Button, ButtonOptions> { }

const createButton: ButtonFactory = createWidget
	.mixin({
		mixin: createFormFieldMixin
	})
	.extend({
		tagName: 'button',
		type: 'button'
	});

export default createButton;
