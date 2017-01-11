import { ComposeFactory } from 'dojo-compose/compose';
import createWidgetBase from '../../createWidgetBase';
import { VNodeProperties } from 'dojo-interfaces/vdom';
import { Widget, WidgetOptions, WidgetState, WidgetProperties } from './../../interfaces';
import createFormFieldMixin, { FormFieldMixin, FormFieldMixinState, FormFieldMixinOptions } from '../../mixins/createFormFieldMixin';

/* TODO: I suspect this needs to go somewhere else */
export interface TypedTargetEvent<T extends EventTarget> extends Event {
	target: T;
}

export type TextInputState = WidgetState & FormFieldMixinState<string>

export type TextInputOptions = WidgetOptions<TextInputState, WidgetProperties> & FormFieldMixinOptions<string, TextInputState>;

export type TextInput = Widget<TextInputState, WidgetProperties> & FormFieldMixin<string, TextInputState> & {
	onInput(event: TypedTargetEvent<HTMLInputElement>): void;
};

export interface TextInputFactory extends ComposeFactory<TextInput, TextInputOptions> { }

const createTextInput: TextInputFactory = createWidgetBase
	.mixin(createFormFieldMixin)
	.mixin({
		mixin: {
			type: 'text',
			tagName: 'input',
			onInput(this: TextInput, event: TypedTargetEvent<HTMLInputElement>) {
				this.value = event.target.value;
			},
			nodeAttributes: [
				function(this: TextInput): VNodeProperties {
					return { oninput: this.onInput };
				}
			]
		}
	});

export default createTextInput;
