import { ComposeFactory } from 'dojo-compose/compose';
import createRenderMixin, { RenderMixinState, RenderMixinOptions, RenderMixin } from './mixins/createRenderMixin';
import createVNodeEvented, { VNodeEvented, VNodeEventedOptions } from './mixins/createVNodeEvented';
import createFormFieldMixin, { FormFieldMixin, FormFieldMixinState, FormFieldMixinOptions } from './mixins/createFormFieldMixin';
import css from './themes/structural/modules/Button';

export interface ButtonState extends RenderMixinState, FormFieldMixinState<string> { }

export interface ButtonOptions extends VNodeEventedOptions, RenderMixinOptions<ButtonState>, FormFieldMixinOptions<any, ButtonState> { }

export type Button = RenderMixin<ButtonState> & FormFieldMixin<string, ButtonState> & VNodeEvented;

export interface ButtonFactory extends ComposeFactory<Button, ButtonOptions> { }

const createButton: ButtonFactory = createRenderMixin
	.mixin(createFormFieldMixin)
	.mixin(createVNodeEvented)
	.extend({
		tagName: 'button',
		type: 'button',
		classes: [ css.button ]
	});

export default createButton;
