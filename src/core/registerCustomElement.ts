import Registry from './Registry';
import { renderer, w, dom, isTextNode, create as vdomCreate, diffProperty, invalidator, isElementNode } from './vdom';
import { from } from '../shim/array';
import global from '../shim/global';
import Injector from './Injector';

const RESERVED_PROPS = ['focus'];

export enum CustomElementChildType {
	DOJO = 'DOJO',
	NODE = 'NODE',
	TEXT = 'TEXT'
}

function isElement(item: any): item is Element {
	return item && item.nodeType === 1;
}

function isDojoChild(item: any): boolean {
	return isElement(item) && item.tagName.indexOf('-') > -1;
}

const factory = vdomCreate({ diffProperty, invalidator }).properties<any>();

export function DomToWidgetWrapper(domNode: HTMLElement): any {
	const wrapper = factory(function DomToWidgetWrapper({ properties, middleware: { invalidator, diffProperty } }) {
		diffProperty('', invalidator);
		const props = Object.keys(properties()).reduce(
			(props, key: string) => {
				const value = properties()[key];
				if (key.indexOf('on') === 0 || RESERVED_PROPS.indexOf(key) !== -1) {
					key = `__${key}`;
				}
				props[key] = value;
				return props;
			},
			{} as any
		);
		return dom({ node: domNode, props, diffType: 'dom' });
	});
	(wrapper as any).domNode = domNode;
	return wrapper;
}

function registerThemeInjector(theme: any, themeRegistry: Registry): Injector {
	const themeInjector = new Injector(theme);
	themeRegistry.defineInjector('__theme_injector', (invalidator) => {
		themeInjector.setInvalidator(invalidator);
		return () => themeInjector;
	});
	return themeInjector;
}

export function create(descriptor: any, WidgetConstructor: any): any {
	const { attributes = [], registryFactory = () => new Registry() } = descriptor;
	const attributeMap: any = {};

	attributes.forEach((propertyName: string) => {
		const attributeName = propertyName.toLowerCase();
		attributeMap[attributeName] = propertyName;
	});

	return class extends HTMLElement {
		private _renderer: any;
		private _properties: any = {};
		private _children: any[] = [];
		private _eventProperties: any = {};
		private _propertiesMap: any = {};
		private _initialised = false;
		private _childType = descriptor.childType;

		public connectedCallback() {
			if (this._initialised) {
				return;
			}

			this._waitTillReady();
		}

		private _hasBeenParsed() {
			if (document.readyState !== 'loading') {
				return true;
			}

			let element: any = this;
			while (element) {
				if (element.nextSibling) {
					return true;
				}

				element = element.parentNode;
			}

			return false;
		}

		private _waitTillReady() {
			this._initialised = true;
			if (this._hasBeenParsed()) {
				this._readyCallback();
			} else {
				setTimeout(() => {
					this._waitTillReady();
				}, 100);
			}
		}

		private _readyCallback() {
			const domProperties: any = {};
			const { properties = [], events = [] } = descriptor;

			this._properties = { ...this._properties, ...this._attributesToProperties(attributes) };

			[...attributes, ...properties].forEach((propertyName: string) => {
				const isReservedProp = RESERVED_PROPS.indexOf(propertyName) !== -1;
				const value =
					this._propertiesMap[propertyName] || !isReservedProp ? (this as any)[propertyName] : undefined;
				let filteredPropertyName = propertyName.replace(/^on/, '__');
				if (isReservedProp) {
					filteredPropertyName = `__${propertyName}`;
				}
				if (value !== undefined) {
					this._properties[propertyName] = value;
				}

				if (filteredPropertyName !== propertyName) {
					domProperties[filteredPropertyName] = {
						get: () => this._getProperty(propertyName),
						set: (value: any) => this._setProperty(propertyName, value)
					};
				}

				if (!isReservedProp) {
					domProperties[propertyName] = {
						get: () => this._getProperty(propertyName),
						set: (value: any) => this._setProperty(propertyName, value)
					};
				}
			});

			events.forEach((propertyName: string) => {
				const eventName = propertyName.replace(/^on/, '').toLowerCase();
				const filteredPropertyName = propertyName.replace(/^on/, '__on');

				domProperties[filteredPropertyName] = {
					get: () => this._getEventProperty(propertyName),
					set: (value: any) => this._setEventProperty(propertyName, value)
				};

				this._eventProperties[propertyName] = undefined;
				this._properties[propertyName] = (...args: any[]) => {
					const eventCallback = this._getEventProperty(propertyName);
					if (typeof eventCallback === 'function') {
						eventCallback(...args);
					}
					this.dispatchEvent(
						new CustomEvent(eventName, {
							bubbles: false,
							detail: args
						})
					);
				};
			});

			Object.defineProperties(this, domProperties);

			const children = from(this.childNodes).filter(
				(childNode) => !isTextNode(childNode) || childNode.data.replace(/^\s+|\s+$/g, '')
			);

			if (!this._childType) {
				if (children.some((child) => isDojoChild(child))) {
					this._childType = CustomElementChildType.DOJO;
				} else {
					this._childType = CustomElementChildType.NODE;
				}
			}

			from(children).forEach((childNode: Node) => {
				if (isElementNode(childNode)) {
					const slotName = childNode.getAttribute('slot');

					if (slotName) {
						const slotArray = childNode.getAttribute('slot-array');

						if (slotArray && slotArray.toLowerCase() === 'true') {
							this._properties[slotName] = from(childNode.children).map((slotNode) => {
								if (slotNode instanceof HTMLElement) {
									childNode.removeChild(slotNode);
									return w(DomToWidgetWrapper(slotNode), {});
								}
							});
						} else if (childNode instanceof HTMLElement) {
							this._properties[slotName] = w(DomToWidgetWrapper(childNode as HTMLElement), {});
						}
					}
				}

				if (this._childType === CustomElementChildType.DOJO) {
					childNode.addEventListener('dojo-ce-render', () => this._render());
					childNode.addEventListener('dojo-ce-connected', () => this._render());
					this._children.push(DomToWidgetWrapper(childNode as HTMLElement));
				} else {
					this._children.push(dom({ node: childNode as HTMLElement, diffType: 'dom' }));
				}
			});

			this.addEventListener('dojo-ce-connected', (e: any) => this._childConnected(e));

			const widgetProperties = this._properties;
			const renderChildren = () => this.__children__();
			const Wrapper = factory(() => w(WidgetConstructor, widgetProperties, renderChildren()));
			const registry = registryFactory();
			const themeContext = registerThemeInjector(this._getTheme(), registry);
			global.addEventListener('dojo-theme-set', () => themeContext.set(this._getTheme()));
			const r = renderer(() => w(Wrapper, {}));
			this._renderer = r;
			r.mount({ domNode: this, merge: false, registry });
			const root = this.children[0];
			if (root) {
				const { display = 'block' } = global.getComputedStyle(root);
				this.style.display = display;
			}

			this.dispatchEvent(
				new CustomEvent('dojo-ce-connected', {
					bubbles: true,
					detail: this
				})
			);
		}

		private _getTheme() {
			if (global && global.dojoce && global.dojoce.theme) {
				return global.dojoce.themes[global.dojoce.theme];
			}
		}

		private _childConnected(e: any) {
			const node = e.detail;
			if (node.parentNode === this) {
				const exists = this._children.some((child) => child.domNode === node);
				if (!exists) {
					node.addEventListener('dojo-ce-render', () => this._render());
					this._children.push(DomToWidgetWrapper(node));
					this._render();
				}
			}
		}

		private _render() {
			if (this._renderer) {
				this._renderer.invalidate();
				this.dispatchEvent(
					new CustomEvent('dojo-ce-render', {
						bubbles: false,
						detail: this
					})
				);
			}
		}

		public __properties__() {
			return { ...this._properties, ...this._eventProperties };
		}

		public __children__() {
			if (this._childType === CustomElementChildType.DOJO) {
				return this._children.filter((Child) => Child.domNode.isWidget).map((Child: any) => {
					const { domNode } = Child;
					return w(Child, { ...domNode.__properties__() }, [...domNode.__children__()]);
				});
			} else {
				return this._children;
			}
		}

		public attributeChangedCallback(name: string, oldValue: string | null, value: string | null) {
			const propertyName = attributeMap[name];
			this._setProperty(propertyName, value);
		}

		private _setEventProperty(propertyName: string, value: any) {
			this._eventProperties[propertyName] = value;
		}

		private _getEventProperty(propertyName: string) {
			return this._eventProperties[propertyName];
		}

		private _setProperty(propertyName: string, value: any) {
			this._properties[propertyName] = value;
			this._render();
		}

		private _getProperty(propertyName: string) {
			return this._properties[propertyName];
		}

		private _attributesToProperties(attributes: string[]) {
			return attributes.reduce((properties: any, propertyName: string) => {
				const attributeName = propertyName.toLowerCase();
				const value = this.getAttribute(attributeName);
				if (value !== null) {
					properties[propertyName] = value;
				}
				return properties;
			}, {});
		}

		static get observedAttributes() {
			return Object.keys(attributeMap);
		}

		public get isWidget() {
			return true;
		}

		public set(key: string, value: any) {
			this._propertiesMap[key] = value;
			if (this._renderer) {
				this._setProperty(key, value);
			}
		}
	};
}

export function register(WidgetConstructor: any): void {
	const descriptor = WidgetConstructor.__customElementDescriptor;

	if (!descriptor) {
		throw new Error(
			'Cannot get descriptor for Custom Element, have you added the @customElement decorator to your Widget?'
		);
	}

	global.customElements.define(descriptor.tagName, create(descriptor, WidgetConstructor));
}

export default register;
