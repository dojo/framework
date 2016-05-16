import { ComposeFactory } from 'dojo-compose/compose';
import createWidget, { Widget, WidgetOptions } from './createWidget';
import createFormFieldMixin, { FormFieldMixin, FormFieldMixinState, FormFieldMixinOptions } from './mixins/createFormFieldMixin';

/* I suspect this needs to go somewhere else */
export interface TypedTargetEvent<T extends EventTarget> extends Event {
	target: T;
}

export interface TextInputOptions extends WidgetOptions<FormFieldMixinState<string>>, FormFieldMixinOptions<string, FormFieldMixinState<string>> { }

export type TextInput = Widget<FormFieldMixinState<string>> & FormFieldMixin<string, FormFieldMixinState<string>>;

export interface TextInputFactory extends ComposeFactory<TextInput, TextInputOptions> { }

const createTextInput: TextInputFactory = createWidget
	.mixin({
		mixin: createFormFieldMixin,
		initialize(instance) {
			instance.own(instance.on('input', (event: TypedTargetEvent<HTMLInputElement>) => {
				instance.value = event.target.value;
			}));
		}
	})
	.extend({
		type: 'text',
		tagName: 'input'
	});

export default createTextInput;
