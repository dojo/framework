import { VNodeProperties } from 'maquette/maquette';
import { ComposeFactory } from 'dojo-compose/compose';
import createStateful, { Stateful, State, StatefulOptions } from './createStateful';
import createCachedRenderMixin, { CachedRenderMixin, CachedRenderState } from './createCachedRenderMixin';

export interface FormFieldMixinOptions<V, S extends FormFieldMixinState<V>> extends StatefulOptions<S> {
	type?: string;
}

export interface FormFieldMixinState<V> extends State, CachedRenderState {
	/**
	 * The form widget's name
	 */
	name?: string;

	/**
	 * The current value
	 */
	value?: V;

	/**
	 * Whether the field is currently disabled or not
	 */
	disabled?: boolean;
}

export interface FormFieldMixin<V, S extends FormFieldMixinState<V>> extends Stateful<S>, CachedRenderMixin<S> {
	/**
	 * The HTML type for this widget
	 */
	type?: string;

	/**
	 * The string value of this form widget, which is read from the widget state
	 */
	value?: string;
}

export interface FormMixinFactory extends ComposeFactory<FormFieldMixin<any, FormFieldMixinState<any>>, FormFieldMixinState<any>> {
	<V>(options?: FormFieldMixinOptions<V, FormFieldMixinState<V>>): FormFieldMixin<V, FormFieldMixinState<V>>;
}

const createFormMixin: FormMixinFactory = createStateful
	.mixin(createCachedRenderMixin)
	.mixin({
		mixin: {
			get value(): string {
				const formfield: FormFieldMixin<any, FormFieldMixinState<any>> = this;
				return formfield.state.value;
			},

			set value(value: string) {
				const formfield: FormFieldMixin<any, FormFieldMixinState<any>> = this;
				if (value !== formfield.state.value) {
					formfield.setState({ value });
				}
			}
		},
		initialize(instance: FormFieldMixin<any, FormFieldMixinState<any>>, options?: FormFieldMixinOptions<any, FormFieldMixinState<any>>) {
			if (options && options.type) {
				instance.type = options.type;
			}
		},
		aspectAdvice: {
			before: {
				getNodeAttributes(...args: any[]) {
					const formfield: FormFieldMixin<any, FormFieldMixinState<any>> = this;
					let overrides: VNodeProperties = args[0];

					if (!overrides) {
						args[0] = overrides = {};
					}

					if (formfield.type) {
						overrides['type'] = formfield.type;
					}
					if (formfield.value) {
						overrides.value = formfield.value;
					}
					if (formfield.state.name) {
						overrides.name = formfield.state.name;
					}
					if (formfield.state.disabled) {
						overrides['disabled'] = 'disabled';
					}

					return args;
				}
			}
		}
	});

export default createFormMixin;
