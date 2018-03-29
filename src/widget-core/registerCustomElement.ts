import { WidgetBase, noBind } from './WidgetBase';
import { ProjectorMixin } from './mixins/Projector';
import { from } from '@dojo/shim/array';
import { w, dom } from './d';
import global from '@dojo/shim/global';
import { registerThemeInjector } from './mixins/Themed';
import { alwaysRender } from './decorators/alwaysRender';

export enum CustomElementChildType {
	DOJO = 'DOJO',
	NODE = 'NODE',
	TEXT = 'TEXT'
}

export function DomToWidgetWrapper(domNode: HTMLElement): any {
	@alwaysRender()
	class DomToWidgetWrapper extends WidgetBase<any> {
		protected render() {
			const properties = Object.keys(this.properties).reduce(
				(props, key: string) => {
					const value = this.properties[key];
					if (key.indexOf('on') === 0) {
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
	const { attributes, childType, registryFactory } = descriptor;
	const attributeMap: any = {};

	attributes.forEach((propertyName: string) => {
		const attributeName = propertyName.toLowerCase();
		attributeMap[attributeName] = propertyName;
	});

	return class extends HTMLElement {
		private _projector: any;
		private _properties: any = {};
		private _children: any[] = [];
		private _eventProperties: any = {};
		private _initialised = false;

		public connectedCallback() {
			if (this._initialised) {
				return;
			}

			const domProperties: any = {};
			const { attributes, properties, events } = descriptor;

			this._properties = { ...this._properties, ...this._attributesToProperties(attributes) };

			[...attributes, ...properties].forEach((propertyName: string) => {
				const value = (this as any)[propertyName];
				const filteredPropertyName = propertyName.replace(/^on/, '__');
				if (value !== undefined) {
					this._properties[propertyName] = value;
				}

				domProperties[filteredPropertyName] = {
					get: () => this._getProperty(propertyName),
					set: (value: any) => this._setProperty(propertyName, value)
				};
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

			const children = childType === CustomElementChildType.TEXT ? this.childNodes : this.children;

			from(children).forEach((childNode: Node) => {
				if (childType === CustomElementChildType.DOJO) {
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
			const Projector = ProjectorMixin(Wrapper);
			this._projector = new Projector();
			this._projector.setProperties({ registry });
			this._projector.append(this);

			this._initialised = true;
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
			if (this._projector) {
				this._projector.invalidate();
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
			if (childType === CustomElementChildType.DOJO) {
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
			if (typeof value === 'function') {
				value[noBind] = true;
			}
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
	};
}

export function register(WidgetConstructor: any): void {
	const descriptor = WidgetConstructor.prototype && WidgetConstructor.prototype.__customElementDescriptor;

	if (!descriptor) {
		throw new Error(
			'Cannot get descriptor for Custom Element, have you added the @customElement decorator to your Widget?'
		);
	}

	global.customElements.define(descriptor.tagName, create(descriptor, WidgetConstructor));
}

export default register;
