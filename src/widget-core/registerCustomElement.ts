import {
	customEventClass,
	CustomElementDescriptor,
	handleAttributeChanged,
	initializeElement
} from './customElements';
import { Constructor, WidgetProperties } from './interfaces';
import { WidgetBase } from './WidgetBase';
import { ProjectorMixin } from './mixins/Projector';

declare namespace customElements {
	function define(name: string, constructor: any): void;
}

/**
 * Describes a function that returns a CustomElementDescriptor
 */
export interface CustomElementDescriptorFactory {
	(): CustomElementDescriptor;
}

/**
 * Register a custom element using the v1 spec of custom elements. Note that
 * this is the default export, and, expects the proposal to work in the browser.
 * This will likely require the polyfill and native shim.
 *
 * @param descriptorFactory
 */
export function registerCustomElement(descriptorFactory: CustomElementDescriptorFactory) {
	const descriptor = descriptorFactory();

	customElements.define(descriptor.tagName, class extends HTMLElement {
		private _isAppended = false;
		private _appender: Function;
		private _widgetInstance: ProjectorMixin<any>;

		constructor() {
			super();

			this._appender = initializeElement(this);
		}

		public connectedCallback() {
			if (!this._isAppended) {
				this._appender();
				this._isAppended = true;
				this.dispatchEvent(new customEventClass('connected', {
					bubbles: false
				}));
			}
		}

		public attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
			handleAttributeChanged(this, name, newValue, oldValue);
		}

		public getWidgetInstance(): ProjectorMixin<any> {
			return this._widgetInstance;
		}

		public setWidgetInstance(widget: ProjectorMixin<any>): void {
			this._widgetInstance = widget;
		}

		public getWidgetConstructor(): Constructor<WidgetBase<WidgetProperties>> {
			return this.getDescriptor().widgetConstructor;
		}

		public getDescriptor(): CustomElementDescriptor {
			return descriptor;
		}

		static get observedAttributes(): string[] {
			return (descriptor.attributes || []).map(attribute => attribute.attributeName);
		}
	});
}

export default registerCustomElement;
