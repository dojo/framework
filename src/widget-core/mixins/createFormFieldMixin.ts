import { VNodeProperties } from 'maquette';
import { ComposeFactory } from 'dojo-compose/compose';
import { EventedListener, TargettedEventObject } from 'dojo-compose/mixins/createEvented';
import createStateful, { Stateful, State, StatefulOptions } from 'dojo-compose/mixins/createStateful';
import { Handle } from 'dojo-core/interfaces';
import { assign } from 'dojo-core/lang';
import { NodeAttributeFunction } from './createRenderMixin';
import createCancelableEvent, { CancelableEvent } from '../util/createCancelableEvent';
import { stringToValue, valueToString } from '../util/lang';

export interface FormFieldMixinOptions<V, S extends FormFieldMixinState<V>> extends StatefulOptions<S> {
	/**
	 * The type of the form field (equates to the `type` attribute in the DOM)
	 */
	type?: string;

	/**
	 * The value of the form field
	 */
	value?: V;
}

export interface FormFieldMixinState<V> extends State {
	/**
	 * Whether the field is currently disabled or not
	 */
	disabled?: boolean;

	/**
	 * The form widget's name
	 */
	name?: string;

	/**
	 * The current value
	 */
	value?: V;
}

export interface ValueChangeEvent<V> extends CancelableEvent<'valuechange', FormFieldMixin<V, FormFieldMixinState<V>>> {
	/**
	 * The event type (in this case, `valuechange`)
	 */
	type: 'valuechange';

	/**
	 * The previous value before this event
	 */
	oldValue: string;

	/**
	 * The current value when this event fires
	 */
	value: string;
}

export interface FormField<V> {
	/**
	 * An array of functions that generate the node attributes on a render
	 */
	nodeAttributes: NodeAttributeFunction[];

	/**
	 * The HTML type for this widget
	 */
	type?: string;

	/**
	 * The string value of this form widget, which is read from the widget state
	 */
	value?: string;
}

export interface FormFieldOverride<V> {
	/**
	 * Add listener for a `valuechange` event, emitted when the value on the widget changes
	 */
	on(type: 'valuechange', listener: EventedListener<ValueChangeEvent<V>>): Handle;
	on(type: string, listener: EventedListener<TargettedEventObject>): Handle;
}

export type FormFieldMixin<V, S extends FormFieldMixinState<V>> = FormField<V> & Stateful<S> & FormFieldOverride<V>;

export interface FormMixinFactory extends ComposeFactory<FormFieldMixin<any, FormFieldMixinState<any>>, FormFieldMixinOptions<any, FormFieldMixinState<any>>> {
	<V>(options?: FormFieldMixinOptions<V, FormFieldMixinState<V>>): FormFieldMixin<V, FormFieldMixinState<V>>;
}

const createFormMixin: FormMixinFactory = createStateful
	.mixin({
		mixin: <FormField<any>> {
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
			},

			nodeAttributes: [
				function (this: FormFieldMixin<any, FormFieldMixinState<any>>): VNodeProperties {
					const { type, value, state } = this;
					const { disabled, name } = state;

					return { type, value, name, disabled: Boolean(disabled) };
				}
			]
		},
		initialize(
			instance: FormFieldMixin<any, FormFieldMixinState<any>>,
			{ value, type }: FormFieldMixinOptions<any, FormFieldMixinState<any>> = {}
		) {
			if (value) {
				instance.setState({ value });
			}
			if (type) {
				instance.type = type;
			}
		}
	});

export default createFormMixin;
