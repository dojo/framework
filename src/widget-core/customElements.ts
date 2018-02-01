import { assign } from '@dojo/core/lang';
import { from as arrayFrom } from '@dojo/shim/array';
import global from '@dojo/shim/global';
import { Constructor, DNode, VNode, VNodeProperties, WidgetProperties } from './interfaces';
import { WidgetBase } from './WidgetBase';
import { v, w } from './d';
import { DomWrapper } from './util/DomWrapper';
import { ProjectorMixin } from './mixins/Projector';
import { InternalVNode } from './vdom';

/**
 * @type CustomElementAttributeDescriptor
 *
 * Describes a custom element attribute
 *
 * @property attributeName   The name of the attribute on the DOM element
 * @property propertyName    The name of the property on the widget
 * @property value           A function that takes a string or null value, and returns a new value. The widget's property will be set to the new value.
 */
export interface CustomElementAttributeDescriptor {
	attributeName: string;
	propertyName?: string;
	value?: (value: string | null) => any;
}

/**
 * @type CustomElementPropertyDescriptor
 *
 * Describes a widget property exposed via a custom element
 *
 * @property propertyName        The name of the property on the DOM element
 * @property widgetPropertyName  The name of the property on the widget
 * @property getValue            A transformation function on the widget's property value
 * @property setValue            A transformation function on the DOM elements property value
 */
export interface CustomElementPropertyDescriptor {
	propertyName: string;
	widgetPropertyName?: string;
	getValue?: (value: any) => any;
	setValue?: (value: any) => any;
}

/**
 * @type CustomElementEventDescriptor
 *
 * Describes a custom element event
 *
 * @property propertyName    The name of the property on the widget that takes a function
 * @property eventName       The type of the event to emit (it will be a CustomEvent object of this type)
 */
export interface CustomElementEventDescriptor {
	propertyName: string;
	eventName: string;
}

/**
 * Defines a custom element initializing function. Passes in initial properties so they can be extended
 * by the initializer.
 */
export interface CustomElementInitializer {
	(properties: WidgetProperties): void;
}

export enum ChildrenType {
	DOJO = 'DOJO',
	ELEMENT = 'ELEMENT'
}

/**
 * @type CustomElementDescriptor
 *
 * Describes a custom element.
 *
 * @property tagName             The tag name to register this widget under. Tag names must contain a "-"
 * @property widgetConstructor   widget Constructor that will return the widget to be wrapped in a custom element
 * @property attributes          A list of attributes to define on this element
 * @property properties          A list of properties to define on this element
 * @property events              A list of events to expose on this element
 * @property initialization      A method to run to set custom properties on the wrapped widget
 */
export interface CustomElementDescriptor {
	/**
	 * The name of the custom element tag
	 */
	tagName: string;

	/**
	 * Widget constructor that will create the widget
	 */
	widgetConstructor: Constructor<WidgetBase<WidgetProperties>>;

	/**
	 * List of attributes on the custom element to map to widget properties
	 */
	attributes?: CustomElementAttributeDescriptor[];

	/**
	 * List of widget properties to expose as properties on the custom element
	 */
	properties?: CustomElementPropertyDescriptor[];

	/**
	 * List of events to expose
	 */
	events?: CustomElementEventDescriptor[];

	/**
	 * Initialization function called before the widget is created (for custom property setting)
	 */
	initialization?: CustomElementInitializer;

	/**
	 * The type of children that the custom element accepts
	 */
	childrenType?: ChildrenType;
}

/**
 * @type CustomElement
 *
 * A custom element extends upon a regular HTMLElement but adds fields for describing and wrapping a widget constructor.
 *
 * @property getWidgetConstructor Return the widget constructor for this element
 * @property getDescriptor        Return the element descriptor for this element
 * @property getWidgetInstance    Return the widget instance that this element wraps
 * @property setWidgetInstance    Set the widget instance for this element
 */
export interface CustomElement extends HTMLElement {
	getWidgetConstructor(): Constructor<WidgetBase<WidgetProperties>>;
	getDescriptor(): CustomElementDescriptor;
	getWidgetInstance(): ProjectorMixin<any>;
	setWidgetInstance(instance: ProjectorMixin<any>): void;
}

/**
 * Properties for DomToWidgetWrapper
 */
export type DomToWidgetWrapperProperties = VNodeProperties & WidgetProperties;

/**
 * DomToWidgetWrapper type
 */
export type DomToWidgetWrapper = Constructor<WidgetBase<DomToWidgetWrapperProperties>>;

/**
 * DomToWidgetWrapper HOC
 *
 * @param domNode The dom node to wrap
 */
export function DomToWidgetWrapper(domNode: CustomElement): DomToWidgetWrapper {
	return class DomToWidgetWrapper extends WidgetBase<DomToWidgetWrapperProperties> {
		private _widgetInstance: ProjectorMixin<any>;

		constructor() {
			super();
			this._widgetInstance = domNode.getWidgetInstance && domNode.getWidgetInstance();
			if (!this._widgetInstance) {
				domNode.addEventListener('connected', () => {
					this._widgetInstance = domNode.getWidgetInstance();
					this.invalidate();
				});
			}
		}

		public __render__(): VNode {
			const vNode = super.__render__() as InternalVNode;
			vNode.domNode = domNode;
			return vNode;
		}

		protected render(): DNode {
			if (this._widgetInstance) {
				this._widgetInstance.setProperties({
					key: 'root',
					...this._widgetInstance.properties,
					...this.properties
				});
			}
			return v(domNode.tagName, {});
		}
	};
}

function getWidgetPropertyFromAttribute(
	attributeName: string,
	attributeValue: string | null,
	descriptor: CustomElementAttributeDescriptor
): [string, any] {
	let { propertyName = attributeName, value = attributeValue } = descriptor;

	if (typeof value === 'function') {
		value = value(attributeValue);
	}

	return [propertyName, value];
}

export let customEventClass = global.CustomEvent;

if (typeof customEventClass !== 'function') {
	const customEvent = function(event: string, params: any) {
		params = params || { bubbles: false, cancelable: false, detail: undefined };
		const evt = document.createEvent('CustomEvent');
		evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
		return evt;
	};

	if (global.Event) {
		customEvent.prototype = global.Event.prototype;
	}

	customEventClass = customEvent;
}

/**
 * Called by HTMLElement subclass to initialize itself with the appropriate attributes/properties/events.
 *
 * @param element The element to initialize.
 */
export function initializeElement(element: CustomElement) {
	let initialProperties: any = {};

	const {
		childrenType = ChildrenType.DOJO,
		attributes = [],
		events = [],
		properties = [],
		initialization
	} = element.getDescriptor();

	attributes.forEach((attribute) => {
		const attributeName = attribute.attributeName;

		const [propertyName, propertyValue] = getWidgetPropertyFromAttribute(
			attributeName,
			element.getAttribute(attributeName.toLowerCase()),
			attribute
		);
		initialProperties[propertyName] = propertyValue;
	});

	properties.forEach(({ propertyName, widgetPropertyName }) => {
		initialProperties[widgetPropertyName || propertyName] = (element as any)[propertyName];
	});

	let customProperties: PropertyDescriptorMap = {};

	attributes.reduce((properties, attribute) => {
		const { propertyName = attribute.attributeName } = attribute;

		properties[propertyName] = {
			get() {
				return element.getWidgetInstance().properties[propertyName];
			},
			set(value: any) {
				const [propertyName, propertyValue] = getWidgetPropertyFromAttribute(
					attribute.attributeName,
					value,
					attribute
				);
				element.getWidgetInstance().setProperties(
					assign({}, element.getWidgetInstance().properties, {
						[propertyName]: propertyValue
					})
				);
			}
		};

		return properties;
	}, customProperties);

	properties.reduce((properties, property) => {
		const { propertyName, getValue, setValue } = property;
		const { widgetPropertyName = propertyName } = property;

		properties[propertyName] = {
			get() {
				const value = element.getWidgetInstance().properties[widgetPropertyName];
				return getValue ? getValue(value) : value;
			},

			set(value: any) {
				element.getWidgetInstance().setProperties(
					assign({}, element.getWidgetInstance().properties, {
						[widgetPropertyName]: setValue ? setValue(value) : value
					})
				);
			}
		};

		return properties;
	}, customProperties);

	Object.defineProperties(element, customProperties);

	// define events
	events.forEach((event) => {
		const { propertyName, eventName } = event;

		initialProperties[propertyName] = (event: any) => {
			element.dispatchEvent(
				new customEventClass(eventName, {
					bubbles: false,
					detail: event
				})
			);
		};
	});

	if (initialization) {
		initialization.call(element, initialProperties);
	}

	const projector = ProjectorMixin(element.getWidgetConstructor());
	const widgetInstance = new projector();

	widgetInstance.setProperties(initialProperties);
	element.setWidgetInstance(widgetInstance);

	return function() {
		let children: DNode[] = [];
		let elementChildren = element.childNodes ? (arrayFrom(element.childNodes) as CustomElement[]) : [];

		elementChildren.forEach((childNode, index) => {
			const properties = { key: `child-${index}` };
			if (childrenType === ChildrenType.DOJO) {
				children.push(w(DomToWidgetWrapper(childNode), properties));
			} else {
				children.push(w(DomWrapper(childNode), properties));
			}
		});
		elementChildren.forEach((childNode) => {
			element.removeChild(childNode);
		});

		widgetInstance.setChildren(children);
		widgetInstance.append(element);
	};
}

/**
 * Called by HTMLElement subclass when an HTML attribute has changed.
 *
 * @param element     The element whose attributes are being watched
 * @param name        The name of the attribute
 * @param newValue    The new value of the attribute
 * @param oldValue    The old value of the attribute
 */
export function handleAttributeChanged(
	element: CustomElement,
	name: string,
	newValue: string | null,
	oldValue: string | null
) {
	const attributes = element.getDescriptor().attributes || [];

	attributes.forEach((attribute) => {
		const { attributeName } = attribute;

		if (attributeName.toLowerCase() === name.toLowerCase()) {
			const [propertyName, propertyValue] = getWidgetPropertyFromAttribute(attributeName, newValue, attribute);
			element
				.getWidgetInstance()
				.setProperties(assign({}, element.getWidgetInstance().properties, { [propertyName]: propertyValue }));
		}
	});
}
