import { ComposeFactory } from 'dojo-compose/compose';
import createRenderMixin, { RenderMixin, RenderMixinOptions, RenderMixinState } from './mixins/createRenderMixin';
import createFormFieldMixin, { FormFieldMixin, FormFieldMixinState, FormFieldMixinOptions } from './mixins/createFormFieldMixin';
import createVNodeEvented, { VNodeEvented, VNodeEventedOptions } from './mixins/createVNodeEvented';

/* TODO: I suspect this needs to go somewhere else */
export interface TypedTargetEvent<T extends EventTarget> extends Event {
	target: T;
}

export type TextInputState = RenderMixinState & FormFieldMixinState<string>;

export type TextInputOptions = RenderMixinOptions<TextInputState> & VNodeEventedOptions & FormFieldMixinOptions<string, TextInputState>;

export type TextInput = RenderMixin<TextInputState> & VNodeEvented & FormFieldMixin<string, TextInputState>;

export interface TextInputFactory extends ComposeFactory<TextInput, TextInputOptions> { }

const createTextInput: TextInputFactory = createRenderMixin
	.mixin(createFormFieldMixin)
	.mixin({
		mixin: createVNodeEvented,
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
