import { CustomElementInitializer } from '../customElements';
import { Constructor, WidgetProperties } from '../interfaces';
import registerCustomElement from '../registerCustomElement';

declare const __dojoCustomElements__: boolean;

/**
 * Defines the custom element configuration used by the customElement decorator
 */
export interface CustomElementConfig<P extends WidgetProperties> {
	/**
	 * The tag of the custom element
	 */
	tag: string;

	/**
	 * List of widget properties to expose as properties on the custom element
	 */
	properties?: (keyof P)[];

	/**
	 * List of attributes on the custom element to map to widget properties
	 */
	attributes?: (keyof P)[];

	/**
	 * List of events to expose
	 */
	events?: (keyof P)[];

	/**
	 * Initialization function called before the widget is created (for custom property setting)
	 */
	initialization?: CustomElementInitializer;
}

/**
 * This Decorator is provided properties that define the behavior of a custom element, and
 * registers that custom element.
 */
export function customElement<P extends WidgetProperties = WidgetProperties>({
	tag,
	properties,
	attributes,
	events,
	initialization
}: CustomElementConfig<P>) {
	return function<T extends Constructor<any>>(target: T) {
		if (typeof __dojoCustomElements__ !== 'undefined') {
			registerCustomElement(() => ({
				tagName: tag,
				widgetConstructor: target,
				attributes: (attributes || []).map((attributeName) => ({ attributeName })),
				properties: (properties || []).map((propertyName) => ({ propertyName })),
				events: (events || []).map((propertyName) => ({
					propertyName,
					eventName: propertyName.replace('on', '').toLowerCase()
				})),
				initialization
			}));
		}
	};
}

export default customElement;
