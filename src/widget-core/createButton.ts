import { ComposeFactory } from 'dojo-compose/compose';
import { VNodeProperties } from 'dojo-interfaces/vdom';
import createWidgetBase from './bases/createWidgetBase';
import { Widget, WidgetOptions, WidgetState } from 'dojo-interfaces/widgetBases';
import createVNodeEvented, { VNodeEvented, VNodeEventedOptions } from './mixins/createVNodeEvented';
import createFormFieldMixin, { FormFieldMixin, FormFieldMixinState, FormFieldMixinOptions } from './mixins/createFormFieldMixin';
import css from './themes/structural/modules/Button';

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
			type: 'button',
			classes: [ css.button ]
		}
	});

export default createButton;
