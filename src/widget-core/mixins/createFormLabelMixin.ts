import compose from '@dojo/compose/compose';
import { assign } from '@dojo/core/lang';
import { DNode } from './../interfaces';
import { v, isHNode } from '../d';

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
export interface FormLabelMixinProperties {

	/**
	 * Index type
	 */
	[index: string]: any;

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
export interface FormLabelMixin {}

/**
 * Form Label
 */
export type FormLabel = FormLabelMixin & {
	type: string;
	properties: FormLabelMixinProperties;
};

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
const allowedAttributes = ['checked', 'describedBy', 'disabled', 'invalid', 'maxLength', 'minLength', 'multiple', 'name', 'placeholder', 'readOnly', 'required', 'type', 'value'];

function getFormFieldA11yAttributes(instance: FormLabel) {
	const { properties, type } = instance;
	const attributeKeys = Object.keys(properties);

	if (type) {
		attributeKeys.push('type');
	}

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

const createFormLabelMixin = compose<FormLabelMixin, {}>({})
.aspect({
	after: {
		render(this: FormLabel, result: DNode): DNode {
			if (isHNode(result)) {
				assign(result.properties, getFormFieldA11yAttributes(this));
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

				result = v('label', children);
			}

			return result;
		}
	}
});

export default createFormLabelMixin;
