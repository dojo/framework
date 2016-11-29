import { ComposeFactory } from 'dojo-compose/compose';
import createWidgetBase from '../../createWidgetBase';
import { Widget, WidgetOptions, WidgetState } from 'dojo-interfaces/widgetBases';
import createFormFieldMixin, { FormFieldMixin, FormFieldMixinState, FormFieldMixinOptions } from '../../mixins/createFormFieldMixin';
import createVNodeEvented, { VNodeEvented, VNodeEventedOptions } from '../../mixins/createVNodeEvented';

/* TODO: I suspect this needs to go somewhere else */
export interface TypedTargetEvent<T extends EventTarget> extends Event {
	target: T;
}

export type TextInputState = WidgetState & FormFieldMixinState<string>;

export type TextInputOptions = WidgetOptions<TextInputState> & VNodeEventedOptions & FormFieldMixinOptions<string, TextInputState>;

export type TextInput = Widget<TextInputState> & VNodeEvented & FormFieldMixin<string, TextInputState>;

export interface TextInputFactory extends ComposeFactory<TextInput, TextInputOptions> { }

const createTextInput: TextInputFactory = createWidgetBase
	.mixin(createFormFieldMixin)
	.mixin({
		mixin: createVNodeEvented,
		initialize(instance) {
			instance.own(instance.on('input', (event: TypedTargetEvent<HTMLInputElement>) => {
				instance.value = event.target.value;
			}));
		}
	})
	.mixin({
		mixin: {
			type: 'text',
			tagName: 'input'
		}
	});

export default createTextInput;
