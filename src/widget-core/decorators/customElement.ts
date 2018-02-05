import { CustomElementInitializer } from '../customElements';
import { Constructor, WidgetProperties } from '../interfaces';

export type CustomElementPropertyNames<P extends object> = ((keyof P) | (keyof WidgetProperties))[];

/**
 * Defines the custom element configuration used by the customElement decorator
 */
export interface CustomElementConfig<P extends object = { [index: string]: any }> {
	/**
	 * The tag of the custom element
	 */
	tag: string;

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

	/**
	 * Initialization function called before the widget is created (for custom property setting)
	 */
	initialization?: CustomElementInitializer;
}

/**
 * This Decorator is provided properties that define the behavior of a custom element, and
 * registers that custom element.
 */
export function customElement<P extends object = { [index: string]: any }>({
	tag,
	properties,
	attributes,
	events,
	initialization
}: CustomElementConfig<P>) {
	return function<T extends Constructor<any>>(target: T) {
		target.prototype.__customElementDescriptor = {
			tagName: tag,
			widgetConstructor: target,
			attributes: (attributes || []).map((attributeName) => ({ attributeName })),
			properties: (properties || []).map((propertyName) => ({ propertyName })),
			events: (events || []).map((propertyName) => ({
				propertyName,
				eventName: propertyName.replace('on', '').toLowerCase()
			})),
			initialization
		};
	};
}

export default customElement;
