import createWidgetBase from '../../createWidgetBase';
import { VNodeProperties } from 'dojo-interfaces/vdom';
import { Widget, WidgetProperties, WidgetFactory } from './../../interfaces';
import createFormFieldMixin, { FormFieldMixin } from '../../mixins/createFormFieldMixin';

/* TODO: I suspect this needs to go somewhere else */
export interface TypedTargetEvent<T extends EventTarget> extends Event {
	target: T;
}

export interface TextInputProperties extends WidgetProperties {
	name?: string;
}

export type TextInput = Widget<TextInputProperties> & FormFieldMixin<string, any> & {
	onInput(event: TypedTargetEvent<HTMLInputElement>): void;
};

export interface TextInputFactory extends WidgetFactory<TextInput, TextInputProperties> { }

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
