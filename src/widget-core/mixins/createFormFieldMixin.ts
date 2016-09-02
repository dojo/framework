import { VNodeProperties } from 'maquette';
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
		get value(this: FormFieldMixin<any, FormFieldMixinState<any>>): string {
			return valueToString(this.state.value);
		},

		set value(this: FormFieldMixin<any, FormFieldMixinState<any>>, value: string) {
			if (value !== this.state.value) {
				const event = assign(createCancelableEvent({
					type: 'valuechange',
					target: this
				}), {
					oldValue: valueToString(this.state.value),
					value
				});
				this.emit(event);
				if (!event.defaultPrevented) {
					this.setState({ value: stringToValue(event.value) });
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
				getNodeAttributes(this: FormFieldMixin<any, FormFieldMixinState<any>>, ...args: any[]) {
					const overrides: VNodeProperties = {};

					if (this.type) {
						overrides['type'] = this.type;
					}
					/* value should always be copied */
					overrides.value = this.value;
					if ('name' in this.state) {
						overrides.name = this.state.name;
					}
					if (this.state.disabled) {
						overrides['disabled'] = 'disabled';
					}

					if (!args[0]) {
						args[0] = {};
					}
					assign(args[0], overrides);

					return args;
				}
			}
		}
	});

export default createFormMixin;
