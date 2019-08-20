import Registry from './Registry';
import { WidgetBase } from './WidgetBase';
import { renderer, w, dom } from './vdom';
import { from } from '../shim/array';
import global from '../shim/global';
import { registerThemeInjector } from './mixins/Themed';
import { alwaysRender } from './decorators/alwaysRender';

const RESERVED_PROPS = ['focus'];

export function DomToWidgetWrapper(domNode: HTMLElement): any {
	@alwaysRender()
	class DomToWidgetWrapper extends WidgetBase<any> {
		protected render() {
			const properties = Object.keys(this.properties).reduce(
				(props, key: string) => {
					const value = this.properties[key];
					if (key.indexOf('on') === 0 || RESERVED_PROPS.indexOf(key) !== -1) {
						key = `__${key}`;
					}
					props[key] = value;
					return props;
				},
				{} as any
			);
			return dom({ node: domNode, props: properties, diffType: 'dom' });
		}

		static get domNode() {
			return domNode;
		}
	}

	return DomToWidgetWrapper;
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

			const hasWidgets = from(this.childNodes).some((childNode) => (childNode as any).isWidget);
			const children = hasWidgets ? this.children : this.childNodes;

			from(children).forEach((childNode: Node) => {
				if ((childNode as any).isWidget) {
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
			const Wrapper = class extends WidgetBase {
				render() {
					return w(WidgetConstructor, widgetProperties, renderChildren());
				}
			};
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
			return this._children.map((child: any) => {
				if ((child as any).domNode.isWidget) {
					const { domNode } = child;
					return w(child, { ...domNode.__properties__() }, [...domNode.__children__()]);
				}
				return child;
			});
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
