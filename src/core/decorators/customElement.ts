import { WidgetProperties } from '../interfaces';
import { CustomElementChildType } from '../registerCustomElement';
import Registry from '../Registry';

export type CustomElementPropertyNames<P extends object> = ((keyof P) | (keyof WidgetProperties))[];

/**
 * Defines the custom element configuration used by the customElement decorator
 */
export interface CustomElementConfig<P extends object = { [index: string]: any }> {
	/**
	 * The tag of the custom element
	 */
	tag?: string;

	/**
	 * List of widget properties to expose as properties on the custom element
	 */
	properties?: CustomElementPropertyNames<P>;

	/**
	 * List of attributes on the custom element to map to widget properties
	 */
	attributes?: CustomElementPropertyNames<P>;

	/**
	 * List of events to expose
	 */
	events?: CustomElementPropertyNames<P>;

	childType?: CustomElementChildType;

	registryFactory?: () => Registry;
}

/**
 * This Decorator is provided properties that define the behavior of a custom element, and
 * registers that custom element.
 */
export function customElement<P extends object = { [index: string]: any }>(config: CustomElementConfig<P>) {
	// rename "tag" to "tagName"
	const { tag: tagName, ...configRest } = config;
	const userDefinedConfig: CustomElementConfig<P> & { tagName?: string } = configRest;

	if (tagName) {
		userDefinedConfig.tagName = tagName;
	}

	return function(target: any) {
		target.__customElementDescriptor = {
			...target.__customElementDescriptor,
			...userDefinedConfig
		};
	};
}

export default customElement;
