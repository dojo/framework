import { VNodeProperties } from 'maquette/maquette';
import compose, { ComposeFactory } from 'dojo-compose/compose';
import { EventedListener, TargettedEventObject } from 'dojo-compose/mixins/createEvented';
import createStateful, { Stateful, State, StatefulOptions } from 'dojo-compose/mixins/createStateful';
import { Handle } from 'dojo-core/interfaces';
import { assign } from 'dojo-core/lang';
import createCachedRenderMixin, { CachedRenderMixin, CachedRenderState } from './createCachedRenderMixin';
import createCancelableEvent, { CancelableEvent } from '../util/createCancelableEvent';
import { stringToValue, valueToString } from '../util/lang';

export interface FormFieldMixinOptions<V, S extends FormFieldMixinState<V>> extends StatefulOptions<S> {
	type?: string;
	value?: V;
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

export interface ValueChangeEvent<V> extends CancelableEvent<'valuechange', FormFieldMixin<V, FormFieldMixinState<V>>> {
	type: 'valuechange';
	oldValue: string;
	value: string;
}

export interface FormField<V> {
	/**
	 * The HTML type for this widget
	 */
	type?: string;

	/**
	 * The string value of this form widget, which is read from the widget state
	 */
	value?: string;

	on?(type: 'valuechange', listener: EventedListener<ValueChangeEvent<V>>): Handle;
	on?(type: string, listener: EventedListener<TargettedEventObject>): Handle;
}

export type FormFieldMixin<V, S extends FormFieldMixinState<V>> = FormField<V> & Stateful<S> & CachedRenderMixin<S>;

export interface FormMixinFactory extends ComposeFactory<FormFieldMixin<any, FormFieldMixinState<any>>, FormFieldMixinOptions<any, FormFieldMixinState<any>>> {
	<V>(options?: FormFieldMixinOptions<V, FormFieldMixinState<V>>): FormFieldMixin<V, FormFieldMixinState<V>>;
}

const createFormMixin: FormMixinFactory = compose({
		get value(): string {
			const formfield: FormFieldMixin<any, FormFieldMixinState<any>> = this;
			return valueToString(formfield.state.value);
		},

		set value(value: string) {
			const formfield: FormFieldMixin<any, FormFieldMixinState<any>> = this;
			if (value !== formfield.state.value) {
				const event = assign(createCancelableEvent({
					type: 'valuechange',
					target: formfield
				}), {
					oldValue: valueToString(formfield.state.value),
					value
				});
				formfield.emit(event);
				if (!event.defaultPrevented) {
					formfield.setState({ value: stringToValue(event.value) });
				}
			}
		}
	}, (instance: FormField<any>, options: FormFieldMixinOptions<any, FormFieldMixinState<any>>) => {
		if (options) {
			const { type } = options;
			if (type) {
				instance.type = type;
			}
		}
	})
	.mixin({
		mixin: createStateful,
		initialize(instance, options) {
			if (options) {
				const { value } = options;
				if (value) {
					instance.setState({ value });
				}
			}
		}
	})
	.mixin({
		mixin: createCachedRenderMixin,
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
