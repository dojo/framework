import { assign } from '@dojo/core/lang';
import { v, isHNode } from '../d';
import {
	DNode,
	Constructor,
	WidgetProperties
} from '../interfaces';
import { WidgetBase, afterRender } from './../WidgetBase';

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
	 * ID of a form element associated with the form field
	 */
	formId?: string;

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
 * Default settings for form labels
 */
const labelDefaults = {
	content: '',
	position: 'after',
	hidden: false
};

/**
 * Allowed attributes for a11y
 */
const allowedFormFieldAttributes = ['checked', 'describedBy', 'disabled', 'invalid', 'maxLength', 'minLength', 'multiple', 'name', 'placeholder', 'readOnly', 'required', 'value'];

export function FormLabelMixin<T extends Constructor<WidgetBase<FormLabelMixinProperties>>>(base: T): T {
	class FormLabel extends base {

		@afterRender
		protected renderDecorator(result: DNode): DNode {
			const labelNodeAttributes: any = {};
			if (isHNode(result)) {
				assign(result.properties, this.getFormFieldA11yAttributes());

				// move classes to label node
				const { classes } = result.properties;
				const { formId } = this.properties;
				assign(labelNodeAttributes, { classes, 'form': formId });
			}

			if (this.properties.label) {
				const children = [ result ];
				let label: LabelProperties;

				if (typeof this.properties.label === 'string') {
					label = assign({}, labelDefaults, { content: this.properties.label });
				}
				else {
					label = assign({}, labelDefaults, this.properties.label);
				}

				if (label.content.length > 0) {
					children.push(v('span', {
						innerHTML: label.content,
						classes: { 'visually-hidden': label.hidden }
					}));
				}

				if (label.position === 'before') {
					children.reverse();
				}

				result = v('label', labelNodeAttributes, children);
			}

			return result;
		}

		private getFormFieldA11yAttributes() {
			const { properties } = this;
			const attributeKeys = Object.keys(properties);

			const nodeAttributes: any = {};

			for (const key of allowedFormFieldAttributes) {

				if (attributeKeys.indexOf(key) === -1) {
					continue;
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
				else if ((key === 'maxLength' || key === 'minLength') && typeof properties[key] !== 'string') {
					nodeAttributes[key.toLowerCase()] = '' + properties[key];
				}
				else {
					nodeAttributes[key.toLowerCase()] = (<any> properties)[key];
				}
			}

			return nodeAttributes;
		}
	};

	return FormLabel;
}

export default FormLabelMixin;
