import { VNodeProperties } from '@dojo/interfaces/vdom';
import { ComposeFactory } from '@dojo/compose/compose';
import { assign } from '@dojo/core/lang';
import { Evented } from '@dojo/interfaces/bases';
import createEvented from '@dojo/compose/bases/createEvented';
import {
	DNode,
	Widget,
	WidgetOptions,
	WidgetProperties,
	PropertiesChangeEvent
} from './../interfaces';
import { v } from '../d';

/**
 * Label settings for form label text content, position (before or after), and visibility
 */
export interface LabelProperties {
	content: string;
	position?: string;
	hidden?: boolean;
}

/**
 * Form Label Properties
 */
export interface FormLabelMixinProperties extends WidgetProperties {
	/**
	 * The form widget's name
	 */
	name?: string;

	/**
	 * The current value
	 */
	value?: string;

	/**
	 * The type of the form field (equates to the `type` attribute in the DOM)
	 */
	type?: string;

	/**
	 * Prevents the user from interacting with the form field
	 */
	disabled?: boolean;

	/**
	 * Label settings for form label text, position, and visibility
	 */
	label?: string | LabelProperties;

	/**
	 * Checked/unchecked HTML attribute
	 */
	checked?: boolean;

	/**
	 * ID of an element that provides more descriptive text
	 */
	describedBy?: string;

	/**
	 * Indicates the value entered in the form field is invalid
	 */
	invalid?: boolean;

	/**
	 * Maximum number of characters allowed in the input
	 */
	maxLength?: number | string;

	/**
	 * Minimum number of characters allowed in the input
	 */
	minLength?: number | string;

	/**
	 * Controls whether multiple values are allowed (applies to email, file, and select inputs)
	 */
	multiple?: boolean;

	/**
	 * Placeholder text
	 */
	placeholder?: string;

	/**
	 * Allows or prevents user interaction
	 */
	readOnly?: boolean;

	/**
	 * Whether or not a value is required
	 */
	required?: boolean;
}

/**
 * Form Label Mixin
 */
export interface FormLabelMixin extends Evented {
	/**
	 * A function that generates node attribtues for the child form field
	 */
	getFormFieldNodeAttributes: () => VNodeProperties;
}

/**
 * Form Label
 */
export type FormLabel = Widget<FormLabelMixinProperties> & FormLabelMixin;

/**
 * Form Label Factory interface
 */
export interface FormLabelMixinFactory extends ComposeFactory<FormLabelMixin, WidgetOptions<FormLabelMixinProperties>> {}

/**
 * Default settings for form labels
 */
const labelDefaults = {
	content: '',
	position: 'after',
	hidden: false
};

const createFormLabelMixin: FormLabelMixinFactory = createEvented.mixin({
	mixin: {
		getFormFieldNodeAttributes(this: FormLabel): VNodeProperties {
			const { properties, type } = this;
			const attributeKeys = Object.keys(properties);

			if (type) {
				attributeKeys.push('type');
			}

			const allowedAttributes = ['checked', 'describedBy', 'disabled', 'invalid', 'maxLength', 'minLength', 'multiple', 'name', 'placeholder', 'readOnly', 'required', 'type', 'value'];
			const nodeAttributes: any = {};

			for (const key of allowedAttributes) {

				if (attributeKeys.indexOf(key) === -1) {
					continue;
				}
				else if (key === 'type') {
					nodeAttributes.type = type;
				}
				else if (key === 'readOnly' && properties.readOnly) {
					nodeAttributes.readonly = 'readonly';
					nodeAttributes['aria-readonly'] = true;
				}
				else if (key === 'invalid') {
					nodeAttributes['aria-invalid'] = properties.invalid;
				}
				else if (key === 'describedBy') {
					nodeAttributes['aria-describedby'] = properties.describedBy;
				}
				else if ((key === 'maxLength' || key === 'minLength' || key === 'checked') && typeof properties[key] !== 'string') {
					nodeAttributes[key.toLowerCase()] = '' + properties[key];
				}
				else {
					nodeAttributes[key.toLowerCase()] = properties[key];
				}
			}

			return nodeAttributes;
		}
	},

	initialize(instance: any) {
		instance.own(instance.on('properties:changed', (evt: PropertiesChangeEvent<FormLabelMixin, FormLabelMixinProperties>) => {
			instance.tagName = evt.properties.label ? 'label' : 'div';
		}));

		if (instance.properties && instance.properties.label) {
			instance.tagName = 'label';
		}
	}
})
.aspect({
	after: {
		getChildrenNodes(this: FormLabel, result: DNode[]): DNode[] {
			let { label } = this.properties;
			const inputAttributes = this.getFormFieldNodeAttributes();
			const children = [
				v(this.tagName, inputAttributes, result)
			];

			if (label) {
				// convert string label to object
				if (typeof label === 'string') {
					label = assign({}, labelDefaults, { content: label });
				}
				else {
					label = assign({}, labelDefaults, label);
				}

				// add label text
				if (label.content.length > 0) {
					children.push(v('span', {
						innerHTML: label.content,
						classes: { 'visually-hidden': label.hidden }
					}));
				}

				// set correct order
				if (label.position === 'before') {
					children.reverse();
				}
			}

			return children;
		}
	}
});

export default createFormLabelMixin;
